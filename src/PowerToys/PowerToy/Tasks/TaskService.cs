using PowerToys.PowerToy.Chat.Activity;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.Security;
using PowerToys.SignalR;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Services.AuthorizationStatus;

namespace PowerToys.PowerToy.Tasks;

public enum TaskOperationStatus
{
    Success,
    NotFound,
    NoAccess,
    Invalid,
}

/// <summary>What a task should look like after a create or an edit.</summary>
public record TaskChange(string Title, Guid? AssigneeKey, DateTime? DueDate, bool IsComplete);

/// <summary>
/// Tasks on documents, and global tasks. A document's tasks follow the document: browse
/// permission to see them, update permission to change them. Anyone can see the global tasks;
/// changing them needs <see cref="TasksPermissions.ManageGlobal"/>. Every change tells open
/// tabs to refresh, and assigning or completing a document task posts a line in its chat when
/// the Chat power toy is on.
/// </summary>
public class TaskService(
    ITaskStore taskStore,
    IContentPermissionService contentPermissionService,
    ActivityService activityService,
    IMentionStore mentionStore,
    ChatNotifier notifier,
    IHubContext<PowerToysHub> hubContext,
    IUserService userService)
{
    public const int MaxTitleLength = 255;

    /// <param name="documentKey">The document, or null for the global tasks.</param>
    public async Task<(TaskOperationStatus Status, IReadOnlyList<ContentTask> Tasks)> GetForDocumentAsync(
        IUser user, Guid? documentKey)
    {
        if (await CanSeeAsync(user, documentKey) is false)
        {
            return (TaskOperationStatus.NoAccess, []);
        }

        return (TaskOperationStatus.Success, taskStore.GetForDocument(documentKey));
    }

    /// <param name="documentKey">The document, or null for a global task.</param>
    public async Task<(TaskOperationStatus Status, ContentTask? Task)> CreateAsync(
        IUser user, Guid? documentKey, TaskChange change)
    {
        if (IsValid(change) is false)
        {
            return (TaskOperationStatus.Invalid, null);
        }

        if (await CanChangeAsync(user, documentKey) is false)
        {
            return (TaskOperationStatus.NoAccess, null);
        }

        var task = new ContentTask
        {
            DocumentKey = documentKey,
            Title = change.Title.Trim(),
            DueDate = change.DueDate,
            CreatedBy = user.Key,
            SortOrder = taskStore.GetForDocument(documentKey).Select(t => t.SortOrder).DefaultIfEmpty(-1).Max() + 1,
        };

        await ApplyAsync(user, task, change);
        return (TaskOperationStatus.Success, task);
    }

    public async Task<(TaskOperationStatus Status, ContentTask? Task)> UpdateAsync(
        IUser user, Guid key, TaskChange change)
    {
        if (IsValid(change) is false)
        {
            return (TaskOperationStatus.Invalid, null);
        }

        ContentTask? task = taskStore.Get(key);
        if (task is null)
        {
            return (TaskOperationStatus.NotFound, null);
        }

        if (await CanChangeAsync(user, task.DocumentKey) is false)
        {
            return (TaskOperationStatus.NoAccess, null);
        }

        task.Title = change.Title.Trim();
        task.DueDate = change.DueDate;

        await ApplyAsync(user, task, change);
        return (TaskOperationStatus.Success, task);
    }

    public async Task<TaskOperationStatus> DeleteAsync(IUser user, Guid key)
    {
        ContentTask? task = taskStore.Get(key);
        if (task is null)
        {
            return TaskOperationStatus.NotFound;
        }

        if (await CanChangeAsync(user, task.DocumentKey) is false)
        {
            return TaskOperationStatus.NoAccess;
        }

        taskStore.Delete(key);
        await SendChangedAsync(task.DocumentKey);
        return TaskOperationStatus.Success;
    }

    /// <summary>
    /// Puts the document's tasks (or the global ones) in the given order. Tasks not in the list
    /// keep their place after them.
    /// </summary>
    public async Task<TaskOperationStatus> SortAsync(IUser user, Guid? documentKey, IReadOnlyList<Guid> keys)
    {
        if (await CanChangeAsync(user, documentKey) is false)
        {
            return TaskOperationStatus.NoAccess;
        }

        IReadOnlyList<ContentTask> tasks = taskStore.GetForDocument(documentKey);
        var ordered = tasks
            .OrderBy(t => keys.Contains(t.Key) ? keys.ToList().IndexOf(t.Key) : keys.Count + t.SortOrder)
            .ToList();

        for (int i = 0; i < ordered.Count; i++)
        {
            if (ordered[i].SortOrder != i)
            {
                ordered[i].SortOrder = i;
                taskStore.Save(ordered[i]);
            }
        }

        await SendChangedAsync(documentKey);
        return TaskOperationStatus.Success;
    }

    /// <summary>
    /// Open tasks the user can see, soonest due first. Without <paramref name="everyone"/>, only
    /// tasks assigned to the user; with it, everyone's, which needs
    /// <see cref="TasksPermissions.ViewAll"/>.
    /// </summary>
    public async Task<(TaskOperationStatus Status, IReadOnlyList<ContentTask> Items, long Total)> GetOpenAsync(
        IUser user, bool everyone, int skip, int take)
    {
        if (everyone && user.Has(TasksPermissions.ViewAll) is false)
        {
            return (TaskOperationStatus.NoAccess, [], 0);
        }

        (IReadOnlyList<ContentTask> items, long total) = taskStore.GetOpen(everyone ? null : user.Key, skip, take);

        var visible = new List<ContentTask>();
        foreach (ContentTask task in items)
        {
            if (await CanSeeAsync(user, task.DocumentKey))
            {
                visible.Add(task);
            }
        }

        // The total counts tasks on documents the user can't browse too; close enough for paging
        return (TaskOperationStatus.Success, visible, total);
    }

    private async Task ApplyAsync(IUser user, ContentTask task, TaskChange change)
    {
        Guid? previousAssignee = task.AssigneeKey;
        bool wasComplete = task.IsComplete;

        task.AssigneeKey = change.AssigneeKey;
        if (change.IsComplete && wasComplete is false)
        {
            task.CompletedBy = user.Key;
            task.CompletedDate = DateTime.UtcNow;
        }
        else if (change.IsComplete is false)
        {
            task.CompletedBy = null;
            task.CompletedDate = null;
        }

        taskStore.Save(task);

        if (change.AssigneeKey is { } assigneeKey && assigneeKey != previousAssignee)
        {
            await NotifyAssigneeAsync(user, task, assigneeKey);
        }

        if (task.IsComplete && wasComplete is false && task.DocumentKey is { } documentKey)
        {
            await activityService.PostAsync(documentKey, ContentActivity.TaskCompleted, user, task.Title);
        }

        await SendChangedAsync(task.DocumentKey);
    }

    // The assignee gets a toast if they're signed in. On a document task with Chat on, they
    // also get a line in its chat that counts as a mention, so it shows on their chat badge.
    // Assigning yourself needs no notice.
    private async Task NotifyAssigneeAsync(IUser user, ContentTask task, Guid assigneeKey)
    {
        IUser? assignee = await userService.GetAsync(assigneeKey);
        string? assigneeName = assignee?.Name ?? assignee?.Username;

        ChatMessage? line = task.DocumentKey is { } documentKey
            ? await activityService.PostAsync(documentKey, ContentActivity.TaskAssigned, user, task.Title, assigneeName)
            : null;

        if (assigneeKey == user.Key || assignee is null)
        {
            return;
        }

        if (line is not null)
        {
            mentionStore.Add(line, [assigneeKey]);
            await notifier.SendUnreadCountAsync(assigneeKey, line.Channel);
        }

        await hubContext.Clients.Group(PowerToysHub.UserGroupName(assigneeKey))
            .SendAsync("taskAssigned", new { task.Key, task.DocumentKey, task.Title, AssignedBy = user.Name ?? user.Username });
    }

    // Everyone connected is told, with the document key (null for the global tasks), and
    // reloads only the lists it's showing. A task list doesn't join a chat channel, so there's
    // no smaller group to send to.
    private Task SendChangedAsync(Guid? documentKey)
        => hubContext.Clients.All.SendAsync("tasksChanged", documentKey);

    private async Task<bool> CanSeeAsync(IUser user, Guid? documentKey)
        => documentKey is not { } key || await HasDocumentPermissionAsync(user, key, ActionBrowse.ActionLetter);

    private async Task<bool> CanChangeAsync(IUser user, Guid? documentKey)
        => documentKey is { } key
            ? await HasDocumentPermissionAsync(user, key, ActionUpdate.ActionLetter)
            : user.Has(TasksPermissions.ManageGlobal);

    private async Task<bool> HasDocumentPermissionAsync(IUser user, Guid documentKey, string permission)
        => await contentPermissionService.AuthorizeAccessAsync(user, documentKey, permission)
            == ContentAuthorizationStatus.Success;

    private static bool IsValid(TaskChange change)
        => string.IsNullOrWhiteSpace(change.Title) is false && change.Title.Trim().Length <= MaxTitleLength;
}
