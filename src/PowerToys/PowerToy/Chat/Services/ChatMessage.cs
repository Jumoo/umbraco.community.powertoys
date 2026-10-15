namespace PowerToys.PowerToy.Chat.Services;

public class ChatMessage
{
    public const string MessageType = "message";

    /// <summary>
    /// A line about something that happened to the document, such as a publish. It has no
    /// text: the client builds it from <see cref="Payload"/>, so it can be localised.
    /// </summary>
    public const string ActivityType = "activity";

    public Guid Key { get; init; } = Guid.NewGuid();

    /// <summary>
    /// The channel the message was sent to: "global" or a document key.
    /// </summary>
    public required string Channel { get; init; }

    public required string Message { get; init; }

    public string Type { get; init; } = MessageType;

    /// <summary>
    /// JSON details for an activity line.
    /// </summary>
    public string? Payload { get; set; }

    public required string UserName { get; init; }

    public Guid? UserKey { get; init; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Each recipient is asked to confirm they've read it.
    /// </summary>
    public bool RequiresConfirmation { get; init; }

    /// <summary>
    /// Opens over the backoffice for each recipient and stays until they confirm it.
    /// Always requires confirmation.
    /// </summary>
    public bool Important { get; init; }
}
