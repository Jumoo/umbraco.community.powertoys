using PowerToys.PowerToy.Chat.Services;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;

namespace PowerToys.SignalR;

/// <summary>
/// Sends per user updates (unread counts) to everyone signed in. Lives outside the hub so
/// anything that changes a channel can tell people about it, not only hub methods.
/// </summary>
public class ChatNotifier(
    IHubContext<PowerToysHub> hubContext,
    HubConnections connections,
    UnreadService unreadService,
    ChannelAccessService channelAccess,
    IUserService userService)
{
    public Task<IReadOnlyList<UnreadCount>> GetUnreadCountsAsync(IUser user) => unreadService.GetCountsAsync(user);

    public Task SendUnreadCountAsync(Guid userKey, string channel)
        => hubContext.Clients.Group(PowerToysHub.UserGroupName(userKey))
            .SendAsync("unreadChanged", unreadService.GetCount(userKey, channel));

    /// <summary>
    /// Tells each mentioned user about the message, so a signed in user gets a toast even if
    /// they have never opened that chat.
    /// </summary>
    public async Task SendMentionAsync(IEnumerable<Guid> userKeys, ChatMessage message)
    {
        foreach (Guid userKey in userKeys)
        {
            await hubContext.Clients.Group(PowerToysHub.UserGroupName(userKey)).SendAsync("mention", message);
        }
    }

    /// <summary>
    /// A channel has a new message: update the count of everyone signed in that it counts for.
    /// </summary>
    public async Task ChannelChangedAsync(string channel, Guid? senderKey)
    {
        IEnumerable<Guid> candidates = connections.Users.Where(key => key != senderKey);

        foreach (Guid userKey in await unreadService.GetUsersCountingAsync(channel, candidates))
        {
            IUser? user = await userService.GetAsync(userKey);
            if (user is null || await channelAccess.AuthorizeAsync(user, channel) is null)
            {
                continue;
            }

            await SendUnreadCountAsync(userKey, channel);
        }
    }
}
