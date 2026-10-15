using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;

namespace PowerToys.PowerToy.Chat.Services;

/// <summary>
/// One entry in the header chat's list of conversations.
/// </summary>
/// <param name="Title">The group or document name. Direct conversations have none; the client
/// names them from the participants, so it shows current names.</param>
/// <param name="Participants">The people in a direct conversation.</param>
public record Conversation(
    string Channel,
    ChannelKind Kind,
    string? Title,
    IReadOnlyList<Guid> Participants,
    ChatMessage? Latest);

public class ConversationService(
    IChatMessageStore messageStore,
    UnreadService unreadService,
    ChannelAccessService channelAccess,
    IUserGroupService userGroupService,
    IEntityService entityService)
{
    /// <summary>
    /// The global channel, the user's direct and group conversations, and any document chats
    /// with something unread for them. Newest activity first, with global at the top.
    /// </summary>
    public async Task<IReadOnlyList<Conversation>> GetConversationsAsync(IUser user)
    {
        var unreadDocuments = (await unreadService.GetCountsAsync(user))
            .Select(c => c.Channel)
            .Where(c => Channels.KindOf(c) == ChannelKind.Document);

        var channels = unreadService.GetCountedChannels(user)
            .Where(c => Channels.KindOf(c) is ChannelKind.Direct or ChannelKind.Group)
            .Union(unreadDocuments);

        var conversations = new List<Conversation>();
        foreach (string channel in channels)
        {
            if (await channelAccess.AuthorizeAsync(user, channel) is null)
            {
                continue;
            }

            Conversation? conversation = await GetConversationAsync(channel);
            if (conversation is not null)
            {
                conversations.Add(conversation);
            }
        }

        return conversations
            .OrderByDescending(c => c.Latest?.Date ?? DateTime.MinValue)
            .Prepend(new Conversation(
                ChatConstants.GlobalChannel, ChannelKind.Global, null, [], messageStore.GetLatest(ChatConstants.GlobalChannel)))
            .ToList();
    }

    public async Task<Conversation?> GetConversationAsync(string channel)
    {
        ChatMessage? latest = messageStore.GetLatest(channel);

        switch (Channels.KindOf(channel))
        {
            case ChannelKind.Direct:
                return new Conversation(channel, ChannelKind.Direct, null, Channels.ParseDirect(channel) ?? [], latest);

            case ChannelKind.Group:
                Guid? groupKey = Channels.ParseGroup(channel);
                IUserGroup? group = groupKey is null ? null : await userGroupService.GetAsync(groupKey.Value);
                return group is null ? null : new Conversation(channel, ChannelKind.Group, group.Name, [], latest);

            case ChannelKind.Document:
                IEntitySlim? document = entityService.Get(Guid.Parse(channel), UmbracoObjectTypes.Document);
                return document is null ? null : new Conversation(channel, ChannelKind.Document, document.Name, [], latest);

            case ChannelKind.Global:
                return new Conversation(channel, ChannelKind.Global, null, [], latest);

            default:
                return null;
        }
    }
}
