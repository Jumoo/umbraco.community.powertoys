using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;

namespace PowerToys.PowerToy.Chat.Services;

/// <summary>
/// The unread count for one channel. Mentions are counted separately so the client can
/// make a mention stand out from general chatter.
/// </summary>
public record UnreadCount(string Channel, int Unread, int Mentions);

/// <summary>
/// Works out which channels count towards a user's unread badge, and how many messages
/// in them they haven't read.
/// </summary>
/// <remarks>
/// Counting every document chat for every user would be noise, so a document channel only
/// counts once the user has posted or been mentioned in it. The global channel always counts,
/// and so do the user's direct conversations and their groups' conversations.
/// </remarks>
public class UnreadService(
    IChatMessageStore messageStore,
    IReadStateStore readStateStore,
    IMentionStore mentionStore,
    ChannelAccessService channelAccess,
    IUserService userService,
    IUserGroupService userGroupService)
{
    public IReadOnlyCollection<string> GetCountedChannels(IUser user)
    {
        var channels = new HashSet<string> { ChatConstants.GlobalChannel };
        channels.UnionWith(messageStore.GetChannelsPostedIn(user.Key));
        channels.UnionWith(mentionStore.GetChannelsMentionedIn(user.Key));
        channels.UnionWith(messageStore.GetDirectChannels(user.Key));
        channels.UnionWith(messageStore.GetChannelsWithMessages(user.Groups.Select(g => Channels.Group(g.Key))));
        return channels;
    }

    /// <summary>
    /// Whether the channel counts for each of the given users. Returns the ones it counts for.
    /// </summary>
    public async Task<IReadOnlyCollection<Guid>> GetUsersCountingAsync(string channel, IEnumerable<Guid> userKeys)
    {
        var counting = new HashSet<Guid>();

        switch (Channels.KindOf(channel))
        {
            case ChannelKind.Global:
                return userKeys.ToList();

            case ChannelKind.Direct:
                counting.UnionWith(Channels.ParseDirect(channel) ?? []);
                break;

            case ChannelKind.Group:
                Guid? groupKey = Channels.ParseGroup(channel);
                IUserGroup? group = groupKey is null ? null : await userGroupService.GetAsync(groupKey.Value);
                if (group is not null)
                {
                    counting.UnionWith(userService.GetAllInGroup(group.Id).Select(u => u.Key));
                }

                counting.UnionWith(messageStore.GetPosters(channel));
                break;

            default:
                counting.UnionWith(messageStore.GetPosters(channel));
                counting.UnionWith(mentionStore.GetMentionedUsers(channel));
                break;
        }

        return userKeys.Where(counting.Contains).ToList();
    }

    /// <summary>
    /// The counts for every channel that counts for the user and that they can still access.
    /// Channels with nothing unread are left out.
    /// </summary>
    public async Task<IReadOnlyList<UnreadCount>> GetCountsAsync(IUser user)
    {
        IReadOnlyDictionary<string, DateTime> lastRead = readStateStore.GetLastRead(user.Key);
        var counts = new List<UnreadCount>();

        foreach (string channel in GetCountedChannels(user))
        {
            if (await channelAccess.AuthorizeAsync(user, channel) is null)
            {
                continue;
            }

            UnreadCount count = Count(user.Key, channel, lastRead);
            if (count.Unread > 0)
            {
                counts.Add(count);
            }
        }

        return counts;
    }

    public UnreadCount GetCount(Guid userKey, string channel)
        => Count(userKey, channel, readStateStore.GetLastRead(userKey));

    private UnreadCount Count(Guid userKey, string channel, IReadOnlyDictionary<string, DateTime> lastRead)
    {
        DateTime? since = lastRead.TryGetValue(channel, out DateTime date) ? date : null;
        return new UnreadCount(
            channel,
            messageStore.CountSince(channel, since, userKey),
            mentionStore.CountSince(userKey, channel, since));
    }
}
