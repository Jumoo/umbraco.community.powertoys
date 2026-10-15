namespace PowerToys.PowerToy.Chat.Services;

public interface IChatMessageStore
{
    void Add(ChatMessage message);

    /// <summary>
    /// Saves changes to a message's date and payload, for activity lines that collapse.
    /// </summary>
    void Update(ChatMessage message);

    /// <summary>
    /// The messages with the given keys, oldest first.
    /// </summary>
    IReadOnlyList<ChatMessage> Get(IEnumerable<Guid> keys);

    /// <summary>
    /// Returns the most recent messages for a channel, oldest first.
    /// </summary>
    IReadOnlyList<ChatMessage> GetHistory(string channel);

    /// <summary>
    /// Counts the messages in a channel newer than <paramref name="since"/> that someone
    /// other than <paramref name="userKey"/> sent. Activity lines don't count.
    /// </summary>
    int CountSince(string channel, DateTime? since, Guid userKey);

    /// <summary>
    /// The channels the user has posted in.
    /// </summary>
    IReadOnlyList<string> GetChannelsPostedIn(Guid userKey);

    /// <summary>
    /// The direct conversations with messages that the user is in.
    /// </summary>
    IReadOnlyList<string> GetDirectChannels(Guid userKey);

    /// <summary>
    /// Which of the given channels have any messages.
    /// </summary>
    IReadOnlyList<string> GetChannelsWithMessages(IEnumerable<string> channels);

    /// <summary>
    /// The newest message in a channel, if it has any.
    /// </summary>
    ChatMessage? GetLatest(string channel);

    /// <summary>
    /// The users who have posted in a channel.
    /// </summary>
    IReadOnlyList<Guid> GetPosters(string channel);
}
