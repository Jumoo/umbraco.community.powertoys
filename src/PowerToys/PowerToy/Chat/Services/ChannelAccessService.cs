using PowerToys.PowerToy.Chat.Security;
using PowerToys.Security;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Services.AuthorizationStatus;

namespace PowerToys.PowerToy.Chat.Services;

/// <summary>
/// Decides who can read and post in a channel. Every channel kind's access rule lives here,
/// so the hub and anything that notifies users about a channel check it the same way.
/// </summary>
public class ChannelAccessService(IContentPermissionService contentPermissionService)
{
    /// <summary>
    /// Returns the channel in its normalised form when the user can use it, or null when the
    /// channel is invalid or the user has no access.
    /// </summary>
    /// <remarks>
    /// <list type="bullet">
    /// <item>Global: everyone.</item>
    /// <item>Document: browse access to the document, so a chat is only visible to users who can see it.</item>
    /// <item>Direct: the people in it.</item>
    /// <item>Group: the group's current members, checked live so leaving a group removes access
    /// straight away. Users allowed to message groups can use any group's conversation.</item>
    /// </list>
    /// </remarks>
    public async Task<string?> AuthorizeAsync(IUser user, string channel)
    {
        switch (Channels.KindOf(channel))
        {
            case ChannelKind.Global:
                return channel;

            case ChannelKind.Document:
                Guid documentKey = Guid.Parse(channel);
                ContentAuthorizationStatus status = await contentPermissionService.AuthorizeAccessAsync(
                    user, documentKey, ActionBrowse.ActionLetter);
                return status == ContentAuthorizationStatus.Success ? documentKey.ToString() : null;

            case ChannelKind.Direct:
                IReadOnlyList<Guid>? participants = Channels.ParseDirect(channel);
                return participants is not null && participants.Contains(user.Key)
                    ? Channels.Direct(participants)
                    : null;

            case ChannelKind.Group:
                Guid? groupKey = Channels.ParseGroup(channel);
                if (groupKey is null) return null;
                return IsInGroup(user, groupKey.Value) || user.Has(ChatPermissions.MessageGroups)
                    ? Channels.Group(groupKey.Value)
                    : null;

            default:
                return null;
        }
    }

    public static bool IsInGroup(IUser user, Guid groupKey) => user.Groups.Any(g => g.Key == groupKey);
}
