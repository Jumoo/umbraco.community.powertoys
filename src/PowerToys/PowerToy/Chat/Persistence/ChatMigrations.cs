using PowerToys.Persistence;
using PowerToys.PowerToy.Chat.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;

namespace PowerToys.PowerToy.Chat.Persistence;

// The Chat power toy's tables. Created whether or not the power toy is enabled, so turning
// it on later needs no restart.
public class CreateChatTables : AsyncMigrationBase
{
    public CreateChatTables(IMigrationContext context) : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        if (TableExists(ChatMessageDto.TableName) is false) Create.Table<ChatMessageDto>().Do();
        if (TableExists(ReadStateDto.TableName) is false) Create.Table<ReadStateDto>().Do();
        if (TableExists(MentionDto.TableName) is false) Create.Table<MentionDto>().Do();
        if (TableExists(ConfirmationDto.TableName) is false) Create.Table<ConfirmationDto>().Do();

        return Task.CompletedTask;
    }
}

public class GrantChatPermissions : GrantPermissionsToAdministratorsBase
{
    public GrantChatPermissions(IMigrationContext context, IUserGroupService userGroupService)
        : base(context, userGroupService)
    {
    }

    protected override IEnumerable<string> Permissions => ChatPermissions.All;
}
