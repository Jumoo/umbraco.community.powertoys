namespace PowerToys.PowerToy.Chat.Services;

public record ConfirmationRow(Guid MessageKey, Guid UserKey, DateTime? Confirmed);

public interface IConfirmationStore
{
    void AddRecipients(Guid messageKey, IEnumerable<Guid> userKeys);

    /// <summary>
    /// Records the user's confirmation.
    /// </summary>
    /// <returns>False when the user wasn't asked to confirm the message, or already had.</returns>
    bool Confirm(Guid messageKey, Guid userKey, DateTime date);

    /// <summary>
    /// The messages the user still has to confirm.
    /// </summary>
    IReadOnlyList<Guid> GetPending(Guid userKey);

    /// <summary>
    /// Every recipient of the message and whether they've confirmed.
    /// </summary>
    IReadOnlyList<ConfirmationRow> GetStatus(Guid messageKey);
}
