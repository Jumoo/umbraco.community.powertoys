using Umbraco.Cms.Core.Models.Membership;

namespace PowerToys.Security;

public static class UserPermissionExtensions
{
    /// <summary>
    /// Whether any of the user's groups has one of the power toys' own permissions.
    /// </summary>
    public static bool Has(this IUser user, string permission)
        => user.Groups.Any(group => group.Permissions.Contains(permission));
}
