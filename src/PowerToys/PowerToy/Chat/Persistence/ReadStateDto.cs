using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Chat.Persistence;

/// <summary>
/// When a user last read a channel. One row per user per channel.
/// </summary>
[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = true)]
[ExplicitColumns]
public class ReadStateDto
{
    public const string TableName = "PowerToysChatReadState";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    [Column("userKey")]
    [Index(IndexTypes.UniqueNonClustered, Name = "IX_" + TableName + "_user_channel", ForColumns = "userKey,channel")]
    public Guid UserKey { get; set; }

    [Column("channel")]
    [Length(200)]
    public string Channel { get; set; } = string.Empty;

    [Column("lastRead")]
    public DateTime LastRead { get; set; }
}
