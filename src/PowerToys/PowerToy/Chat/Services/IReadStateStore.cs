namespace PowerToys.PowerToy.Chat.Services;

public interface IReadStateStore
{
    /// <summary>
    /// Records that the user has read the channel up to the given date. An earlier date
    /// than the one already stored is ignored, so read state only moves forward.
    /// </summary>
    void MarkRead(Guid userKey, string channel, DateTime date);

    /// <summary>
    /// Returns when the user last read each channel they have read state for.
    /// </summary>
    IReadOnlyDictionary<string, DateTime> GetLastRead(Guid userKey);
}
