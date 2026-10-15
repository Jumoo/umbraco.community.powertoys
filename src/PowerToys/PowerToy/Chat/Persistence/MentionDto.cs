using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Chat.Persistence;

/// <summary>
/// One row per user a message mentions, directly or through a group. Written when the
/// message is sent, so a group mention reaches the people in the group at that moment.
/// </summary>
[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = true)]
[ExplicitColumns]
public class MentionDto
{
    public const string TableName = "PowerToysChatMentions";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    [Column("messageKey")]
    public Guid MessageKey { get; set; }

    [Column("userKey")]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_user_channel_date", ForColumns = "userKey,channel,date")]
    public Guid UserKey { get; set; }

    [Column("channel")]
    [Length(200)]
    public string Channel { get; set; } = string.Empty;

    [Column("date")]
    public DateTime Date { get; set; }
}
