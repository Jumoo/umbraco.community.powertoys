using System.Collections.Concurrent;

namespace PowerToys.SignalR;

/// <summary>
/// Tracks which users have the backoffice open, so a new message only triggers unread
/// counts for people who are there to see them. Counts connections per user, because
/// one user can have several tabs open.
/// </summary>
/// <remarks>
/// Per server. On a load balanced backoffice each server knows only its own connections.
/// </remarks>
public class HubConnections
{
    private readonly ConcurrentDictionary<Guid, int> _connections = new();

    public void Add(Guid userKey) => _connections.AddOrUpdate(userKey, 1, (_, count) => count + 1);

    public void Remove(Guid userKey)
    {
        int remaining = _connections.AddOrUpdate(userKey, 0, (_, count) => count - 1);
        if (remaining <= 0)
        {
            _connections.TryRemove(new KeyValuePair<Guid, int>(userKey, remaining));
        }
    }

    public IReadOnlyCollection<Guid> Users => _connections.Keys.ToList();
}
