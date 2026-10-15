using System.Text.Json.Serialization;

namespace PowerToys.PowerToy.Chat.Services;

[JsonConverter(typeof(JsonStringEnumConverter<ChannelKind>))]
public enum ChannelKind
{
    Global,
    Document,
    Direct,
    Group,
}

/// <summary>
/// The kinds of channel and their names: "global", a document key, <c>dm:&lt;user keys&gt;</c>
/// for a direct conversation and <c>group:&lt;group key&gt;</c> for a user group's.
/// </summary>
public static class Channels
{
    public const string DirectPrefix = "dm:";
    public const string GroupPrefix = "group:";

    /// <summary>
    /// Most people a direct conversation can have, including whoever starts it. Keeps the
    /// channel name inside the column's 200 characters.
    /// </summary>
    public const int MaxDirectParticipants = 5;

    /// <summary>
    /// The participants' keys sorted, so the same people always land in the same channel.
    /// </summary>
    public static string Direct(IEnumerable<Guid> userKeys)
        => DirectPrefix + string.Join(",", userKeys.Distinct().OrderBy(k => k).Select(k => k.ToString()));

    public static string Group(Guid groupKey) => GroupPrefix + groupKey;

    public static ChannelKind? KindOf(string channel)
    {
        if (channel == ChatConstants.GlobalChannel) return ChannelKind.Global;
        if (channel.StartsWith(DirectPrefix, StringComparison.Ordinal)) return ChannelKind.Direct;
        if (channel.StartsWith(GroupPrefix, StringComparison.Ordinal)) return ChannelKind.Group;
        if (Guid.TryParse(channel, out _)) return ChannelKind.Document;
        return null;
    }

    /// <returns>The participants, or null when the name isn't a valid direct channel.</returns>
    public static IReadOnlyList<Guid>? ParseDirect(string channel)
    {
        if (channel.StartsWith(DirectPrefix, StringComparison.Ordinal) is false) return null;

        var keys = new List<Guid>();
        foreach (string part in channel[DirectPrefix.Length..].Split(','))
        {
            if (Guid.TryParse(part, out Guid key) is false) return null;
            keys.Add(key);
        }

        return keys.Count is >= 2 and <= MaxDirectParticipants ? keys : null;
    }

    public static Guid? ParseGroup(string channel)
        => channel.StartsWith(GroupPrefix, StringComparison.Ordinal)
           && Guid.TryParse(channel[GroupPrefix.Length..], out Guid key)
            ? key
            : null;
}
