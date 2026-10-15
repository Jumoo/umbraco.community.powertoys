using PowerToys.PowerToy.Chat.Security;
using PowerToys.Security;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;

namespace PowerToys.PowerToy.Chat.Services;

/// <summary>
/// Who has confirmed a message, for its sender.
/// </summary>
public record ConfirmationStatus(Guid MessageKey, IReadOnlyList<RecipientStatus> Recipients);

public record RecipientStatus(Guid UserKey, string Name, DateTime? Confirmed);

/// <summary>
/// Messages that ask to be confirmed. Recipients are everyone who can read the channel when
/// the message is sent: everyone for the global channel, a group's members, or the people
/// in a direct conversation. Document chats can't send them; that audience isn't a list of
/// people anyone chose.
/// </summary>
public class ConfirmationService(
    IConfirmationStore confirmationStore,
    IChatMessageStore messageStore,
    IUserService userService,
    IUserGroupService userGroupService)
{
    public static bool CanAskForConfirmation(string channel)
        => Channels.KindOf(channel) is ChannelKind.Global or ChannelKind.Group or ChannelKind.Direct;

    public async Task<IReadOnlyCollection<Guid>> GetRecipientsAsync(string channel, IUser sender)
    {
        IEnumerable<IUser> users = Channels.KindOf(channel) switch
        {
            ChannelKind.Global => userService.GetAll(0, int.MaxValue, out _, "Name", Direction.Ascending, filter: (string?)null),
            ChannelKind.Group => await GetGroupMembersAsync(Channels.ParseGroup(channel)!.Value),
            ChannelKind.Direct => await GetUsersAsync(Channels.ParseDirect(channel)!),
            _ => [],
        };

        return users
            .Where(u => u.Key != sender.Key && MentionService.IsMentionable(u))
            .Select(u => u.Key)
            .ToHashSet();
    }

    /// <summary>
    /// The messages the user still has to confirm, oldest first.
    /// </summary>
    public IReadOnlyList<ChatMessage> GetPending(Guid userKey)
        => messageStore.Get(confirmationStore.GetPending(userKey));

    /// <summary>
    /// Who has and hasn't confirmed. Only the sender, or someone who can send these messages
    /// themselves, can see it.
    /// </summary>
    public async Task<ConfirmationStatus?> GetStatusAsync(Guid messageKey, IUser requester)
    {
        ChatMessage? message = messageStore.Get([messageKey]).FirstOrDefault();
        if (message is null || (message.UserKey != requester.Key && requester.Has(ChatPermissions.Announce) is false))
        {
            return null;
        }

        var recipients = new List<RecipientStatus>();
        foreach (ConfirmationRow row in confirmationStore.GetStatus(messageKey))
        {
            IUser? user = await userService.GetAsync(row.UserKey);
            recipients.Add(new RecipientStatus(row.UserKey, user?.Name ?? user?.Username ?? "?", row.Confirmed));
        }

        return new ConfirmationStatus(messageKey, recipients.OrderBy(r => r.Name).ToList());
    }

    private async Task<IEnumerable<IUser>> GetGroupMembersAsync(Guid groupKey)
    {
        IUserGroup? group = await userGroupService.GetAsync(groupKey);
        return group is null ? [] : userService.GetAllInGroup(group.Id);
    }

    private async Task<IEnumerable<IUser>> GetUsersAsync(IEnumerable<Guid> keys)
    {
        var users = new List<IUser>();
        foreach (Guid key in keys)
        {
            if (await userService.GetAsync(key) is { } user)
            {
                users.Add(user);
            }
        }

        return users;
    }
}
