using PowerToys.PowerToy.Chat;
using PowerToys.PowerToy.Chat.Security;
using PowerToys.Services;
using PowerToys.Security;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.PowerToy.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace PowerToys.SignalR;

[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class PowerToysHub(
    IUserService userService,
    ChannelAccessService channelAccess,
    IChatMessageStore messageStore,
    IReadStateStore readStateStore,
    IMentionStore mentionStore,
    MentionService mentionService,
    ConversationService conversationService,
    ConfirmationService confirmationService,
    IConfirmationStore confirmationStore,
    IUserGroupService userGroupService,
    IPowerToyService powerToyService,
    HubConnections connections,
    ChatNotifier notifier) : Hub
{
    public const int MaxMessageLength = 2000;

    /// <summary>
    /// Every connection of a user is in this group, so all their tabs stay in step.
    /// </summary>
    public static string UserGroupName(Guid userKey) => $"user:{userKey}";

    // The hub serves Chat and Tasks, so it takes connections while either is on. Chat's own
    // methods check Chat is on as well.
    public override async Task OnConnectedAsync()
    {
        bool chatEnabled = powerToyService.IsEnabled(ChatConstants.PowerToyAlias);
        if (chatEnabled is false && powerToyService.IsEnabled(TasksConstants.PowerToyAlias) is false)
        {
            throw new HubException("Chat and Tasks are turned off.");
        }

        IUser user = await GetUserAsync();

        connections.Add(user.Key);
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroupName(user.Key));

        if (chatEnabled)
        {
            await Clients.Caller.SendAsync("unread", await notifier.GetUnreadCountsAsync(user));
            await Clients.Caller.SendAsync("pendingConfirmations", confirmationService.GetPending(user.Key));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Guid? userKey = Context.User?.Identity?.GetUserKey();
        if (userKey is not null)
        {
            connections.Remove(userKey.Value);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Joins a channel. The caller gets its history, then live messages for that channel.
    /// </summary>
    public async Task JoinChannel(string channel)
    {
        IUser user = await GetCurrentUserAsync();
        channel = await AuthorizeChannelAsync(user, channel);

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(channel));

        await Clients.Caller.SendAsync("history", channel, messageStore.GetHistory(channel));
    }

    /// <returns>Anything the sender should know, such as people they mentioned who can't see the chat.</returns>
    public async Task<SendMessageResult> SendMessage(string channel, string message)
        => await SendAsync(channel, message, requiresConfirmation: false, important: false);

    /// <summary>
    /// Sends a message that each recipient has to confirm. An important one also opens over
    /// the backoffice until they do. Needs the announce permission, and a channel whose
    /// readers are a list of people: global, a group or a direct conversation.
    /// </summary>
    public async Task<SendMessageResult> SendAnnouncement(string channel, string message, bool important)
        => await SendAsync(channel, message, requiresConfirmation: true, important);

    /// <summary>
    /// Confirms the caller has read a message. Their other tabs close it, and the sender's
    /// list of who has confirmed updates.
    /// </summary>
    public async Task Confirm(Guid messageKey)
    {
        IUser user = await GetCurrentUserAsync();

        if (confirmationStore.Confirm(messageKey, user.Key, DateTime.UtcNow) is false)
        {
            return;
        }

        await Clients.Group(UserGroupName(user.Key)).SendAsync("confirmed", messageKey);

        if (messageStore.Get([messageKey]).FirstOrDefault()?.UserKey is Guid senderKey)
        {
            await Clients.Group(UserGroupName(senderKey)).SendAsync("confirmationChanged", messageKey);
        }
    }

    public async Task<ConfirmationStatus> GetConfirmationStatus(Guid messageKey)
        => await confirmationService.GetStatusAsync(messageKey, await GetCurrentUserAsync())
            ?? throw new HubException("You can't see who has confirmed this message.");

    /// <summary>
    /// Asks everyone who hasn't confirmed a message again. Only its sender can.
    /// </summary>
    /// <returns>How many people were reminded.</returns>
    public async Task<int> Remind(Guid messageKey)
    {
        IUser user = await GetCurrentUserAsync();

        ChatMessage? message = messageStore.Get([messageKey]).FirstOrDefault();
        if (message is null || message.UserKey != user.Key)
        {
            throw new HubException("Only the sender can send a reminder.");
        }

        var waiting = confirmationStore.GetStatus(messageKey).Where(r => r.Confirmed is null).Select(r => r.UserKey).ToList();
        foreach (Guid userKey in waiting)
        {
            await Clients.Group(UserGroupName(userKey)).SendAsync("confirmationRequested", message);
        }

        return waiting.Count;
    }

    private async Task<SendMessageResult> SendAsync(string channel, string message, bool requiresConfirmation, bool important)
    {
        if (string.IsNullOrWhiteSpace(message) || message.Length > MaxMessageLength)
        {
            throw new HubException($"Messages must be between 1 and {MaxMessageLength} characters.");
        }

        IUser user = await GetCurrentUserAsync();
        channel = await AuthorizeChannelAsync(user, channel);

        if (requiresConfirmation)
        {
            if (user.Has(ChatPermissions.Announce) is false)
            {
                throw new HubException("You don't have permission to send messages that need confirming.");
            }

            if (ConfirmationService.CanAskForConfirmation(channel) is false)
            {
                throw new HubException("Messages that need confirming go to everyone, a group or chosen people, not a document chat.");
            }
        }

        var chatMessage = new ChatMessage
        {
            Channel = channel,
            Message = message.Trim(),
            UserName = user.Name ?? user.Username,
            UserKey = user.Key,
            RequiresConfirmation = requiresConfirmation,
            Important = important,
        };

        // A group mention is close to an announcement, so it needs its own permission
        if (MentionService.Parse(chatMessage.Message).Any(m => m.Kind == "group")
            && user.Has(ChatPermissions.MentionGroups) is false)
        {
            throw new HubException("You don't have permission to mention a whole user group.");
        }

        MentionResult mentions = await mentionService.ResolveAsync(chatMessage.Message, user, channel);
        IReadOnlyCollection<Guid> confirmers = requiresConfirmation
            ? await confirmationService.GetRecipientsAsync(channel, user)
            : [];

        messageStore.Add(chatMessage);
        mentionStore.Add(chatMessage, mentions.Recipients);
        confirmationStore.AddRecipients(chatMessage.Key, confirmers);

        // Replying means you've read the channel
        readStateStore.MarkRead(user.Key, channel, chatMessage.Date);

        await Clients.Group(GroupName(channel)).SendAsync("chat", chatMessage);

        await notifier.SendUnreadCountAsync(user.Key, channel);
        await notifier.ChannelChangedAsync(channel, user.Key);
        await notifier.SendMentionAsync(mentions.Recipients.Except(confirmers), chatMessage);

        foreach (Guid userKey in confirmers)
        {
            await Clients.Group(UserGroupName(userKey)).SendAsync("confirmationRequested", chatMessage);
        }

        return new SendMessageResult(mentions.Unreachable);
    }

    /// <summary>
    /// The users and groups that can be mentioned, for the picker and for showing names in messages.
    /// </summary>
    public async Task<Mentionables> GetMentionables()
    {
        await GetCurrentUserAsync();
        return await mentionService.GetMentionablesAsync();
    }

    /// <summary>
    /// The conversations for the header chat: global, the caller's direct and group
    /// conversations, and document chats with something unread.
    /// </summary>
    public async Task<IReadOnlyList<Conversation>> GetConversations()
        => await conversationService.GetConversationsAsync(await GetCurrentUserAsync());

    /// <summary>
    /// Opens a direct conversation between the caller and the given people. The same people
    /// always get the same conversation. Nothing is stored until someone sends a message.
    /// </summary>
    public async Task<Conversation> StartDirectConversation(Guid[] userKeys)
    {
        IUser user = await GetCurrentUserAsync();

        var participants = userKeys.Append(user.Key).Distinct().ToList();
        if (participants.Count < 2 || participants.Count > Channels.MaxDirectParticipants)
        {
            throw new HubException($"A conversation is between 2 and {Channels.MaxDirectParticipants} people.");
        }

        foreach (Guid key in participants)
        {
            IUser? participant = await userService.GetAsync(key);
            if (participant is null || MentionService.IsMentionable(participant) is false)
            {
                throw new HubException("One of those people can't be messaged.");
            }
        }

        string channel = Channels.Direct(participants);
        return (await conversationService.GetConversationAsync(channel))!;
    }

    /// <summary>
    /// Opens the conversation for a user group. Needs the permission to message groups.
    /// </summary>
    public async Task<Conversation> StartGroupConversation(Guid groupKey)
    {
        IUser user = await GetCurrentUserAsync();
        if (user.Has(ChatPermissions.MessageGroups) is false)
        {
            throw new HubException("You don't have permission to message user groups.");
        }

        if (await userGroupService.GetAsync(groupKey) is null)
        {
            throw new HubException("No such user group.");
        }

        return (await conversationService.GetConversationAsync(Channels.Group(groupKey)))!;
    }

    /// <summary>
    /// Marks a channel read up to now. The client calls it while the chat is open and visible.
    /// Every tab the user has open gets the new count.
    /// </summary>
    public async Task MarkRead(string channel)
    {
        IUser user = await GetCurrentUserAsync();
        channel = await AuthorizeChannelAsync(user, channel);

        readStateStore.MarkRead(user.Key, channel, DateTime.UtcNow);

        await notifier.SendUnreadCountAsync(user.Key, channel);
    }

    public record SendMessageResult(IReadOnlyList<string> Unreachable);

    public static string GroupName(string channel) => $"chat:{channel}";

    // Every chat method goes through here, so turning the Chat power toy off stops them as
    // well as hiding the header icon.
    private async Task<IUser> GetCurrentUserAsync()
    {
        if (powerToyService.IsEnabled(ChatConstants.PowerToyAlias) is false)
        {
            throw new HubException("Chat is turned off.");
        }

        return await GetUserAsync();
    }

    // The user comes from the connection's claims, as Umbraco's own hubs do. The
    // HttpContext-based accessors aren't reliable inside hub method calls.
    private async Task<IUser> GetUserAsync()
    {
        Guid? userKey = Context.User?.Identity?.GetUserKey();
        IUser? user = userKey is null ? null : await userService.GetAsync(userKey.Value);

        return user ?? throw new HubException("No backoffice user.");
    }

    /// <returns>The channel in its normalised form.</returns>
    private async Task<string> AuthorizeChannelAsync(IUser user, string channel)
        => await channelAccess.AuthorizeAsync(user, channel)
            ?? throw new HubException("You do not have access to this channel.");
}
