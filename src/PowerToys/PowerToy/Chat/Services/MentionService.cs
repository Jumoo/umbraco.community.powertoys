using System.Text.RegularExpressions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;

namespace PowerToys.PowerToy.Chat.Services;

public record MentionableUser(Guid Key, string Name);

public record MentionableGroup(Guid Key, string Alias, string Name);

public record Mentionables(IReadOnlyList<MentionableUser> Users, IReadOnlyList<MentionableGroup> Groups);

/// <summary>
/// Who a message reaches through its mentions.
/// </summary>
/// <param name="Recipients">Users to notify, each once, never the sender.</param>
/// <param name="Unreachable">Names of people mentioned by name who can't see the channel.</param>
public record MentionResult(IReadOnlyCollection<Guid> Recipients, IReadOnlyList<string> Unreachable);

/// <summary>
/// Mentions are stored in the message as tokens, <c>@[user:&lt;key&gt;]</c> and
/// <c>@[group:&lt;alias&gt;]</c>. The client shows the current name for each, so renaming a
/// user or group doesn't break old messages.
/// </summary>
public partial class MentionService(
    IUserService userService,
    IUserGroupService userGroupService,
    ChannelAccessService channelAccess)
{
    [GeneratedRegex(@"@\[(user|group):([^\]\s]+)\]")]
    private static partial Regex MentionToken();

    public static IEnumerable<(string Kind, string Value)> Parse(string message)
        => MentionToken().Matches(message).Select(m => (m.Groups[1].Value, m.Groups[2].Value));

    public async Task<MentionResult> ResolveAsync(string message, IUser sender, string channel)
    {
        var recipients = new HashSet<Guid>();
        var unreachable = new List<string>();

        foreach ((string kind, string value) in Parse(message).Distinct())
        {
            if (kind == "user" && Guid.TryParse(value, out Guid userKey))
            {
                IUser? user = await userService.GetAsync(userKey);
                if (user is null || user.Key == sender.Key || IsMentionable(user) is false)
                {
                    continue;
                }

                if (await channelAccess.AuthorizeAsync(user, channel) is null)
                {
                    unreachable.Add(user.Name ?? user.Username);
                    continue;
                }

                recipients.Add(user.Key);
            }
            else if (kind == "group")
            {
                IUserGroup? group = await userGroupService.GetAsync(value);
                if (group is null)
                {
                    continue;
                }

                // Members who can't see the channel are left out quietly; naming everyone in a
                // group who can't see a document would be noise
                foreach (IUser member in userService.GetAllInGroup(group.Id))
                {
                    if (member.Key != sender.Key
                        && IsMentionable(member)
                        && await channelAccess.AuthorizeAsync(member, channel) is not null)
                    {
                        recipients.Add(member.Key);
                    }
                }
            }
        }

        return new MentionResult(recipients, unreachable);
    }

    /// <summary>
    /// Everyone and every group that can be mentioned, for the picker and for showing names.
    /// </summary>
    /// <remarks>
    /// Comes from the hub rather than the Management API, because listing users there needs
    /// access to the Users section, which most editors don't have. Backoffice users already
    /// see each other's names in the audit history.
    /// </remarks>
    public async Task<Mentionables> GetMentionablesAsync()
    {
        IEnumerable<IUser> users = userService.GetAll(0, int.MaxValue, out _, "Name", Direction.Ascending, filter: (string?)null);
        var groups = await userGroupService.GetAllAsync(0, int.MaxValue);

        return new Mentionables(
            users.Where(IsMentionable).Select(u => new MentionableUser(u.Key, u.Name ?? u.Username)).ToList(),
            groups.Items.OrderBy(g => g.Name).Select(g => new MentionableGroup(g.Key, g.Alias, g.Name ?? g.Alias)).ToList());
    }

    // People only: API users can't read a chat, and disabled users can't sign in
    public static bool IsMentionable(IUser user)
        => user.Kind == UserKind.Default && user.UserState != UserState.Disabled;
}
