namespace PowerToys.PowerToy.Chat.Security;

/// <summary>
/// The Chat power toy's own user group permissions. They're stored with Umbraco's in the
/// group's permission set, and set in the user group editor under the Chat heading. Plain
/// chat and mentioning a person don't need one.
/// </summary>
/// <remarks>The client registers the same strings in <c>Client/src/power-toy/chat/permissions</c>.</remarks>
public static class ChatPermissions
{
    /// <summary>Send important messages, or ask for read confirmation.</summary>
    public const string Announce = "PowerToys.Chat.Announce";

    /// <summary>Start a conversation with a whole user group.</summary>
    public const string MessageGroups = "PowerToys.Chat.MessageGroups";

    /// <summary>Mention a whole user group.</summary>
    public const string MentionGroups = "PowerToys.Chat.MentionGroups";

    public static readonly IReadOnlyList<string> All = [Announce, MessageGroups, MentionGroups];
}
