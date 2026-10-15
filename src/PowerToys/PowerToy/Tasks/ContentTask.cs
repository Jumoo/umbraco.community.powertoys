namespace PowerToys.PowerToy.Tasks;

/// <summary>
/// A to-do, such as "Get sign-off from legal": on a document, or global when it has no document.
/// </summary>
public class ContentTask
{
    public Guid Key { get; init; } = Guid.NewGuid();

    /// <summary>Null for a global task.</summary>
    public Guid? DocumentKey { get; init; }

    public required string Title { get; set; }

    public Guid? AssigneeKey { get; set; }

    public DateTime? DueDate { get; set; }

    public int SortOrder { get; set; }

    public Guid CreatedBy { get; init; }

    public DateTime CreatedDate { get; init; } = DateTime.UtcNow;

    public Guid? CompletedBy { get; set; }

    public DateTime? CompletedDate { get; set; }

    public bool IsComplete => CompletedDate is not null;
}
