using PowerToys.PowerToy.Tasks.Persistence;
using NPoco;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Tasks;

public class DatabaseTaskStore(IScopeProvider scopeProvider) : ITaskStore
{
    public ContentTask? Get(Guid key)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<TaskDto>()
            .From<TaskDto>()
            .Where<TaskDto>(x => x.Id == key);

        return ToTask(scope.Database.FirstOrDefault<TaskDto>(sql));
    }

    public IReadOnlyList<ContentTask> GetForDocument(Guid? documentKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<TaskDto>()
            .From<TaskDto>();

        if (documentKey is { } key)
        {
            sql = sql.Where<TaskDto>(x => x.DocumentKey == key);
        }
        else
        {
            sql = sql.Where<TaskDto>(x => x.DocumentKey == null);
        }

        sql = sql.OrderBy<TaskDto>(x => x.SortOrder, x => x.CreatedDate);

        return scope.Database.Fetch<TaskDto>(sql).Select(x => ToTask(x)!).ToList();
    }

    public (IReadOnlyList<ContentTask> Items, long Total) GetOpen(Guid? assigneeKey, int skip, int take)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<TaskDto>()
            .From<TaskDto>()
            .Where<TaskDto>(x => x.CompletedDate == null);

        if (assigneeKey is not null)
        {
            Guid key = assigneeKey.Value;
            sql = sql.Where<TaskDto>(x => x.AssigneeKey == key);
        }

        // Soonest due first; tasks without a due date go last
        sql = sql
            .OrderBy($"CASE WHEN {scope.SqlContext.SqlSyntax.GetQuotedColumnName("dueDate")} IS NULL THEN 1 ELSE 0 END")
            .OrderBy<TaskDto>(x => x.DueDate, x => x.CreatedDate);

        Page<TaskDto> page = scope.Database.Page<TaskDto>((skip / Math.Max(take, 1)) + 1, Math.Max(take, 1), sql);
        return (page.Items.Select(x => ToTask(x)!).ToList(), page.TotalItems);
    }

    public void Save(ContentTask task)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var dto = new TaskDto
        {
            Id = task.Key,
            DocumentKey = task.DocumentKey,
            Title = task.Title,
            AssigneeKey = task.AssigneeKey,
            DueDate = task.DueDate,
            SortOrder = task.SortOrder,
            CreatedBy = task.CreatedBy,
            CreatedDate = task.CreatedDate,
            CompletedBy = task.CompletedBy,
            CompletedDate = task.CompletedDate,
        };

        bool exists = scope.Database.ExecuteScalar<int>(
            scope.SqlContext.Sql().SelectCount().From<TaskDto>().Where<TaskDto>(x => x.Id == task.Key)) > 0;

        if (exists)
        {
            scope.Database.Update(dto);
        }
        else
        {
            scope.Database.Insert(dto);
        }
    }

    public void Delete(Guid key)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Delete<TaskDto>(scope.SqlContext.Sql().Where<TaskDto>(x => x.Id == key));
    }

    public void DeleteForDocument(Guid documentKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Delete<TaskDto>(scope.SqlContext.Sql().Where<TaskDto>(x => x.DocumentKey == documentKey));
    }

    private static ContentTask? ToTask(TaskDto? dto) => dto is null ? null : new ContentTask
    {
        Key = dto.Id,
        DocumentKey = dto.DocumentKey,
        Title = dto.Title,
        AssigneeKey = dto.AssigneeKey,
        DueDate = Utc(dto.DueDate),
        SortOrder = dto.SortOrder,
        CreatedBy = dto.CreatedBy,
        CreatedDate = Utc(dto.CreatedDate)!.Value,
        CompletedBy = dto.CompletedBy,
        CompletedDate = Utc(dto.CompletedDate),
    };

    private static DateTime? Utc(DateTime? date) => date is null ? null : DateTime.SpecifyKind(date.Value, DateTimeKind.Utc);
}
