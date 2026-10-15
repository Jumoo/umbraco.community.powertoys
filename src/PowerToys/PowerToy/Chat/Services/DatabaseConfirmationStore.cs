using PowerToys.PowerToy.Chat.Persistence;
using NPoco;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Chat.Services;

public class DatabaseConfirmationStore(IScopeProvider scopeProvider) : IConfirmationStore
{
    public void AddRecipients(Guid messageKey, IEnumerable<Guid> userKeys)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        foreach (Guid userKey in userKeys.Distinct())
        {
            scope.Database.Insert(new ConfirmationDto { MessageKey = messageKey, UserKey = userKey });
        }
    }

    public bool Confirm(Guid messageKey, Guid userKey, DateTime date)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ConfirmationDto>()
            .From<ConfirmationDto>()
            .Where<ConfirmationDto>(x => x.MessageKey == messageKey && x.UserKey == userKey);

        ConfirmationDto? row = scope.Database.FirstOrDefault<ConfirmationDto>(sql);
        if (row is null || row.Confirmed is not null)
        {
            return false;
        }

        row.Confirmed = date;
        scope.Database.Update(row);
        return true;
    }

    public IReadOnlyList<Guid> GetPending(Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ConfirmationDto>(x => x.MessageKey)
            .From<ConfirmationDto>()
            .Where<ConfirmationDto>(x => x.UserKey == userKey && x.Confirmed == null);

        return scope.Database.Fetch<Guid>(sql);
    }

    public IReadOnlyList<ConfirmationRow> GetStatus(Guid messageKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ConfirmationDto>()
            .From<ConfirmationDto>()
            .Where<ConfirmationDto>(x => x.MessageKey == messageKey);

        return scope.Database.Fetch<ConfirmationDto>(sql)
            .Select(x => new ConfirmationRow(
                x.MessageKey,
                x.UserKey,
                x.Confirmed is null ? null : DateTime.SpecifyKind(x.Confirmed.Value, DateTimeKind.Utc)))
            .ToList();
    }
}
