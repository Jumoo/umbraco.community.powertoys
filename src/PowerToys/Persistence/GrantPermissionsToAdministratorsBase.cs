using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;

namespace PowerToys.Persistence;

/// <summary>
/// Gives the Administrators group a power toy's permissions on install, so a site can use it
/// without anyone opening the user group editor. Other groups start with none.
/// </summary>
public abstract class GrantPermissionsToAdministratorsBase : AsyncMigrationBase
{
    private readonly IUserGroupService _userGroupService;

    protected GrantPermissionsToAdministratorsBase(IMigrationContext context, IUserGroupService userGroupService)
        : base(context)
    {
        _userGroupService = userGroupService;
    }

    protected abstract IEnumerable<string> Permissions { get; }

    protected override async Task MigrateAsync()
    {
        IUserGroup? admins = await _userGroupService.GetAsync(Umbraco.Cms.Core.Constants.Security.AdminGroupKey);
        if (admins is null)
        {
            Logger.LogWarning("Power Toys: no Administrators group, so no permissions were granted");
            return;
        }

        var missing = Permissions.Where(p => admins.Permissions.Contains(p) is false).ToList();
        if (missing.Count == 0)
        {
            return;
        }

        admins.Permissions = admins.Permissions.Union(missing).ToHashSet();
        await _userGroupService.UpdateAsync(admins, Umbraco.Cms.Core.Constants.Security.SuperUserKey);
    }
}
