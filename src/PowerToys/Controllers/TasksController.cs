using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.PowerToy.Tasks;
using Umbraco.Cms.Api.Common.ViewModels.Pagination;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace PowerToys.Controllers
{
    // The Tasks power toy's API. Any backoffice user can use it; TaskService checks each
    // document's permissions, and ManageGlobal for the global tasks.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "Tasks")]
    [PowerToyEnabled(TasksConstants.PowerToyAlias)]
    public class TasksController : PowerToysControllerBase
    {
        private readonly TaskService _taskService;
        private readonly MentionService _mentionService;
        private readonly IEntityService _entityService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

        public TasksController(
            TaskService taskService,
            MentionService mentionService,
            IEntityService entityService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
        {
            _taskService = taskService;
            _mentionService = mentionService;
            _entityService = entityService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
        }

        private IUser CurrentUser
            => _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser
                ?? throw new InvalidOperationException("No backoffice user.");

        [HttpGet("tasks/document/{documentKey:guid}")]
        [ProducesResponseType<IEnumerable<TaskResponseModel>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> GetDocumentTasks(Guid documentKey) => GetTasksAsync(documentKey);

        [HttpGet("tasks/global")]
        [ProducesResponseType<IEnumerable<TaskResponseModel>>(StatusCodes.Status200OK)]
        public Task<IActionResult> GetGlobalTasks() => GetTasksAsync(null);

        [HttpPost("tasks/document/{documentKey:guid}")]
        [ProducesResponseType<TaskResponseModel>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> CreateDocumentTask(Guid documentKey, CreateTaskRequestModel model)
            => CreateAsync(documentKey, model);

        [HttpPost("tasks/global")]
        [ProducesResponseType<TaskResponseModel>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> CreateGlobalTask(CreateTaskRequestModel model) => CreateAsync(null, model);

        [HttpPut("tasks/document/{documentKey:guid}/sort")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> SortDocumentTasks(Guid documentKey, SortTasksRequestModel model)
            => SortAsync(documentKey, model);

        [HttpPut("tasks/global/sort")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public Task<IActionResult> SortGlobalTasks(SortTasksRequestModel model) => SortAsync(null, model);

        [HttpPut("tasks/{key:guid}")]
        [ProducesResponseType<TaskResponseModel>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateTask(Guid key, UpdateTaskRequestModel model)
        {
            var (status, task) = await _taskService.UpdateAsync(
                CurrentUser, key, new TaskChange(model.Title, model.AssigneeKey, model.DueDate, model.IsComplete));
            return status == TaskOperationStatus.Success ? Ok(TaskResponseModel.From(task!)) : StatusResult(status);
        }

        [HttpDelete("tasks/{key:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteTask(Guid key)
        {
            TaskOperationStatus status = await _taskService.DeleteAsync(CurrentUser, key);
            return status == TaskOperationStatus.Success ? Ok() : StatusResult(status);
        }

        /// <summary>
        ///     Open tasks, soonest due first: the current user's, or everyone's with the ViewAll permission.
        /// </summary>
        [HttpGet("tasks/open")]
        [ProducesResponseType<PagedViewModel<TaskResponseModel>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetOpenTasks(bool everyone = false, int skip = 0, int take = 20)
        {
            var (status, items, total) = await _taskService.GetOpenAsync(CurrentUser, everyone, skip, take);
            if (status != TaskOperationStatus.Success)
            {
                return StatusResult(status);
            }

            var documentKeys = items.Where(t => t.DocumentKey is not null).Select(t => t.DocumentKey!.Value).Distinct().ToArray();
            var names = documentKeys.Length == 0
                ? new Dictionary<Guid, string?>()
                : _entityService.GetAll(UmbracoObjectTypes.Document, documentKeys).ToDictionary(e => e.Key, e => e.Name);

            return Ok(new PagedViewModel<TaskResponseModel>
            {
                Total = total,
                Items = items.Select(t => TaskResponseModel.From(
                    t, t.DocumentKey is { } documentKey ? names.GetValueOrDefault(documentKey) : null)),
            });
        }

        /// <summary>
        ///     The people a task can be assigned to.
        /// </summary>
        [HttpGet("tasks/assignees")]
        [ProducesResponseType<IEnumerable<TaskAssigneeResponseModel>>(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAssignees()
        {
            var mentionables = await _mentionService.GetMentionablesAsync();
            return Ok(mentionables.Users.Select(u => new TaskAssigneeResponseModel { Key = u.Key, Name = u.Name }));
        }

        private async Task<IActionResult> GetTasksAsync(Guid? documentKey)
        {
            var (status, tasks) = await _taskService.GetForDocumentAsync(CurrentUser, documentKey);
            return status == TaskOperationStatus.Success
                ? Ok(tasks.Select(t => TaskResponseModel.From(t)))
                : StatusResult(status);
        }

        private async Task<IActionResult> CreateAsync(Guid? documentKey, CreateTaskRequestModel model)
        {
            var (status, task) = await _taskService.CreateAsync(
                CurrentUser, documentKey, new TaskChange(model.Title, model.AssigneeKey, model.DueDate, false));
            return status == TaskOperationStatus.Success ? Ok(TaskResponseModel.From(task!)) : StatusResult(status);
        }

        private async Task<IActionResult> SortAsync(Guid? documentKey, SortTasksRequestModel model)
        {
            TaskOperationStatus status = await _taskService.SortAsync(CurrentUser, documentKey, model.Keys);
            return status == TaskOperationStatus.Success ? Ok() : StatusResult(status);
        }

        private IActionResult StatusResult(TaskOperationStatus status) => status switch
        {
            TaskOperationStatus.NotFound => NotFound(),
            TaskOperationStatus.NoAccess => Forbid(),
            TaskOperationStatus.Invalid => BadRequest(),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
