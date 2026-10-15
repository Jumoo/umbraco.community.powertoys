using PowerToys.PowerToy.Chat.Services;
using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace PowerToys.PowerToy.Chat.Persistence;

[TableName(TableName)]
[PrimaryKey("id", AutoIncrement = false)]
[ExplicitColumns]
public class ChatMessageDto
{
    public const string TableName = "PowerToysChatMessages";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = false)]
    public Guid Id { get; set; }

    // History is read by channel, newest first
    [Column("channel")]
    [Length(200)]
    [Index(IndexTypes.NonClustered, Name = "IX_" + TableName + "_channel_date", ForColumns = "channel,date")]
    public string Channel { get; set; } = string.Empty;

    [Column("message")]
    [Length(2000)]
    public string Message { get; set; } = string.Empty;

    [Column("userName")]
    [Length(255)]
    public string UserName { get; set; } = string.Empty;

    [Column("userKey")]
    [NullSetting]
    public Guid? UserKey { get; set; }

    [Column("date")]
    public DateTime Date { get; set; }

    [Column("requiresConfirmation")]
    [Constraint(Default = "0")]
    public bool RequiresConfirmation { get; set; }

    [Column("important")]
    [Constraint(Default = "0")]
    public bool Important { get; set; }

    [Column("type")]
    [Length(20)]
    [Constraint(Default = ChatMessage.MessageType)]
    public string Type { get; set; } = ChatMessage.MessageType;

    [Column("payload")]
    [Length(1000)]
    [NullSetting]
    public string? Payload { get; set; }

    public static ChatMessageDto From(ChatMessage message) => new()
    {
        Id = message.Key,
        Channel = message.Channel,
        Message = message.Message,
        UserName = message.UserName,
        UserKey = message.UserKey,
        Date = message.Date,
        RequiresConfirmation = message.RequiresConfirmation,
        Important = message.Important,
        Type = message.Type,
        Payload = message.Payload,
    };

    public ChatMessage ToChatMessage() => new()
    {
        Key = Id,
        Channel = Channel,
        Message = Message,
        UserName = UserName,
        UserKey = UserKey,
        Date = DateTime.SpecifyKind(Date, DateTimeKind.Utc),
        RequiresConfirmation = RequiresConfirmation,
        Important = Important,
        Type = Type,
        Payload = Payload,
    };
}
