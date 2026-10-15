using System.Text.Json;
using PowerToys.Services;

namespace PowerToys.PowerToy.Chat.Activity;

/// <summary>
/// Which content events post a line in a document's chat. Part of the Chat power toy's
/// settings, saved from its card or set under <c>PowerToys:Chat</c> in appsettings.
/// </summary>
public class ChatActivitySettings
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public bool ActivityEnabled { get; set; } = true;

    /// <summary>
    /// The events to post. Any of: Saved, Published, Unpublished, Moved, Copied, RolledBack,
    /// Trashed, Restored, TaskAssigned, TaskCompleted, Reviewed, ReviewDue.
    /// </summary>
    public string[] ActivityEvents { get; set; } =
        [
            ContentActivity.Saved,
            ContentActivity.Published,
            ContentActivity.Unpublished,
            ContentActivity.Moved,
            ContentActivity.Copied,
            ContentActivity.RolledBack,
            ContentActivity.Trashed,
            ContentActivity.Restored,
            ContentActivity.TaskAssigned,
            ContentActivity.TaskCompleted,
            ContentActivity.Reviewed,
            ContentActivity.ReviewDue,
        ];

    /// <summary>
    /// Repeated saves by one person within this many minutes collapse into one line
    /// ("saved this 6 times").
    /// </summary>
    public int CollapseMinutes { get; set; } = 30;

    /// <summary>
    /// The saved settings, or null while the Chat power toy is turned off.
    /// </summary>
    public static ChatActivitySettings? GetSettings(IPowerToyService powerToyService)
    {
        if (powerToyService.IsEnabled(ChatConstants.PowerToyAlias) is false) return null;

        string? json = powerToyService.GetSettings(ChatConstants.PowerToyAlias);
        if (string.IsNullOrWhiteSpace(json)) return new ChatActivitySettings();

        try
        {
            return JsonSerializer.Deserialize<ChatActivitySettings>(json, JsonOptions) ?? new ChatActivitySettings();
        }
        catch (JsonException)
        {
            return new ChatActivitySettings();
        }
    }
}
