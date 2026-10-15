namespace PowerToys.PowerToy.Chat.Services;

public interface IMentionStore
{
    /// <summary>
    /// Records that a message mentions each of the given users.
    /// </summary>
    void Add(ChatMessage message, IEnumerable<Guid> userKeys);

    /// <summary>
    /// Counts the user's mentions in a channel newer than <paramref name="since"/>.
    /// </summary>
    int CountSince(Guid userKey, string channel, DateTime? since);

    /// <summary>
    /// The channels the user has been mentioned in.
    /// </summary>
    IReadOnlyList<string> GetChannelsMentionedIn(Guid userKey);

    /// <summary>
    /// The users mentioned in a channel.
    /// </summary>
    IReadOnlyList<Guid> GetMentionedUsers(string channel);
}
