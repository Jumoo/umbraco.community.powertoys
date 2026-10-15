using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Tasks.Persistence;

/// <summary>
/// A rule that gives every document of a content type a review date.
/// </summary>
[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = false)]
[ExplicitColumns]
public class ReviewRuleDto
{
    public const string TableName = "PowerToysReviewRules";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = false)]
    public Guid Id { get; set; }

    [Column("contentTypeKey")]
    [Index(IndexTypes.UniqueNonClustered, Name = "IX_" + TableName + "_contentType")]
    public Guid ContentTypeKey { get; set; }

    [Column("intervalMonths")]
    public int IntervalMonths { get; set; }

    /// <summary>Count from the last publish rather than the last review.</summary>
    [Column("fromPublish")]
    public bool FromPublish { get; set; }
}

/// <summary>
/// A document's review state: when it's next due and when it was last reviewed.
/// </summary>
[TableName(TableName)]
[PrimaryKey("documentKey", AutoIncrement = false)]
[ExplicitColumns]
public class ReviewDto
{
    public const string TableName = "PowerToysReviews";

    [Column("documentKey")]
    [PrimaryKeyColumn(AutoIncrement = false)]
    public Guid DocumentKey { get; set; }

    // The reminder job and the dashboard look for dates that have passed
    [Column("nextReview")]
    [NullSetting]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_next")]
    public DateTime? NextReview { get; set; }

    /// <summary>The date was set by hand, so it wins over the rule until the next review.</summary>
    [Column("setManually")]
    public bool SetManually { get; set; }

    [Column("lastReviewedBy")]
    [NullSetting]
    public Guid? LastReviewedBy { get; set; }

    [Column("lastReviewed")]
    [NullSetting]
    public DateTime? LastReviewed { get; set; }

    /// <summary>The due date a reminder went out for, so each date is reminded once.</summary>
    [Column("remindedFor")]
    [NullSetting]
    public DateTime? RemindedFor { get; set; }
}

/// <summary>
/// One row per time a document was marked reviewed.
/// </summary>
[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = true)]
[ExplicitColumns]
public class ReviewHistoryDto
{
    public const string TableName = "PowerToysReviewHistory";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    [Column("documentKey")]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_document")]
    public Guid DocumentKey { get; set; }

    [Column("reviewedBy")]
    public Guid ReviewedBy { get; set; }

    [Column("date")]
    public DateTime Date { get; set; }

    [Column("note")]
    [Length(1000)]
    [NullSetting]
    public string? Note { get; set; }
}
