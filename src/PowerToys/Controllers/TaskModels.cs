using PowerToys.PowerToy.Tasks;

namespace PowerToys.Controllers;

public class TaskResponseModel
{
    public Guid Key { get; init; }

    /// <summary>Null for a global task.</summary>
    public Guid? DocumentKey { get; init; }

    /// <summary>Filled in on lists that span documents, such as the tasks assigned to you.</summary>
    public string? DocumentName { get; init; }

    public required string Title { get; init; }

    public Guid? AssigneeKey { get; init; }

    public DateTime? DueDate { get; init; }

    public int SortOrder { get; init; }

    public Guid CreatedBy { get; init; }

    public DateTime CreatedDate { get; init; }

    public Guid? CompletedBy { get; init; }

    public DateTime? CompletedDate { get; init; }

    public bool IsComplete { get; init; }

    public static TaskResponseModel From(ContentTask task, string? documentName = null) => new()
    {
        Key = task.Key,
        DocumentKey = task.DocumentKey,
        DocumentName = documentName,
        Title = task.Title,
        AssigneeKey = task.AssigneeKey,
        DueDate = task.DueDate,
        SortOrder = task.SortOrder,
        CreatedBy = task.CreatedBy,
        CreatedDate = task.CreatedDate,
        CompletedBy = task.CompletedBy,
        CompletedDate = task.CompletedDate,
        IsComplete = task.IsComplete,
    };
}

public class CreateTaskRequestModel
{
    public required string Title { get; init; }

    public Guid? AssigneeKey { get; init; }

    public DateTime? DueDate { get; init; }
}

public class UpdateTaskRequestModel
{
    public required string Title { get; init; }

    public Guid? AssigneeKey { get; init; }

    public DateTime? DueDate { get; init; }

    public bool IsComplete { get; init; }
}

public class SortTasksRequestModel
{
    public required IReadOnlyList<Guid> Keys { get; init; }
}

public class TaskAssigneeResponseModel
{
    public Guid Key { get; init; }

    public required string Name { get; init; }
}
