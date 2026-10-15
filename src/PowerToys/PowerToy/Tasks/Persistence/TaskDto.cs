using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Tasks.Persistence;

[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = false)]
[ExplicitColumns]
public class TaskDto
{
    public const string TableName = "PowerToysTasks";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = false)]
    public Guid Id { get; set; }

    // Null for a global task, one that isn't on a document
    [Column("documentKey")]
    [NullSetting]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_document")]
    public Guid? DocumentKey { get; set; }

    [Column("title")]
    [Length(255)]
    public string Title { get; set; } = string.Empty;

    // Open tasks are listed by assignee on the dashboard
    [Column("assigneeKey")]
    [NullSetting]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_assignee", ForColumns = "assigneeKey,completedDate")]
    public Guid? AssigneeKey { get; set; }

    [Column("dueDate")]
    [NullSetting]
    public DateTime? DueDate { get; set; }

    [Column("sortOrder")]
    public int SortOrder { get; set; }

    [Column("createdBy")]
    public Guid CreatedBy { get; set; }

    [Column("createdDate")]
    public DateTime CreatedDate { get; set; }

    [Column("completedBy")]
    [NullSetting]
    public Guid? CompletedBy { get; set; }

    [Column("completedDate")]
    [NullSetting]
    public DateTime? CompletedDate { get; set; }
}
