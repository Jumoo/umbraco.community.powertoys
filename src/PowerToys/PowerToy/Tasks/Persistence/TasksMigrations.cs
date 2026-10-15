using PowerToys.Persistence;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;

namespace PowerToys.PowerToy.Tasks.Persistence;

// Created whether or not the power toy is enabled, so turning it on later needs no restart
public class CreateTasksTable : AsyncMigrationBase
{
    public CreateTasksTable(IMigrationContext context) : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        if (TableExists(TaskDto.TableName) is false) Create.Table<TaskDto>().Do();

        return Task.CompletedTask;
    }
}

public class GrantTasksPermissions : GrantPermissionsToAdministratorsBase
{
    public GrantTasksPermissions(IMigrationContext context, IUserGroupService userGroupService)
        : base(context, userGroupService)
    {
    }

    protected override IEnumerable<string> Permissions => [TasksPermissions.ManageGlobal, TasksPermissions.ViewAll];
}

public class CreateReviewTables : AsyncMigrationBase
{
    public CreateReviewTables(IMigrationContext context) : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        if (TableExists(ReviewRuleDto.TableName) is false) Create.Table<ReviewRuleDto>().Do();
        if (TableExists(ReviewDto.TableName) is false) Create.Table<ReviewDto>().Do();
        if (TableExists(ReviewHistoryDto.TableName) is false) Create.Table<ReviewHistoryDto>().Do();

        return Task.CompletedTask;
    }
}

public class GrantReviewPermissions : GrantPermissionsToAdministratorsBase
{
    public GrantReviewPermissions(IMigrationContext context, IUserGroupService userGroupService)
        : base(context, userGroupService)
    {
    }

    protected override IEnumerable<string> Permissions => [TasksPermissions.ManageReviews];
}
