using PowerToys.PowerToy.Chat.Persistence;
using PowerToys.PowerToy.Tasks.Persistence;
using Umbraco.Cms.Core.Packaging;

namespace PowerToys.Persistence;

// Umbraco runs this plan once per step and records where it got to. Power toys that need
// tables or permissions add their steps here, after the ones already shipped.
public class PowerToysMigrationPlan : PackageMigrationPlan
{
    public PowerToysMigrationPlan() : base(Constants.PackageName)
    {
    }

    protected override void DefinePlan()
    {
        To<CreateChatTables>("create-chat-tables");
        To<GrantChatPermissions>("grant-chat-permissions");
        To<CreateTasksTable>("create-tasks-table");
        To<GrantTasksPermissions>("grant-tasks-permissions");
        To<CreateReviewTables>("create-review-tables");
        To<GrantReviewPermissions>("grant-review-permissions");
    }
}
