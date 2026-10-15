using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Chat.Persistence;

/// <summary>
/// One row per recipient of a message that needs confirming. Rows are written when the
/// message is sent, so the recipient list is fixed then: someone who joins a group later
/// doesn't owe a confirmation.
/// </summary>
[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = true)]
[ExplicitColumns]
public class ConfirmationDto
{
    public const string TableName = "PowerToysChatConfirmations";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    [Column("messageKey")]
    [Index(IndexTypes.UniqueNonClustered, Name = "IX_" + TableName + "_message_user", ForColumns = "messageKey,userKey")]
    public Guid MessageKey { get; set; }

    [Column("userKey")]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_user_confirmed", ForColumns = "userKey,confirmed")]
    public Guid UserKey { get; set; }

    [Column("confirmed")]
    [NullSetting]
    public DateTime? Confirmed { get; set; }
}
