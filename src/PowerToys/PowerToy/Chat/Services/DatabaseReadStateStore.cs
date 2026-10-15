using PowerToys.PowerToy.Chat.Persistence;
using NPoco;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Chat.Services;

public class DatabaseReadStateStore(IScopeProvider scopeProvider) : IReadStateStore
{
    public void MarkRead(Guid userKey, string channel, DateTime date)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ReadStateDto>()
            .From<ReadStateDto>()
            .Where<ReadStateDto>(x => x.UserKey == userKey && x.Channel == channel);

        ReadStateDto? row = scope.Database.FirstOrDefault<ReadStateDto>(sql);

        if (row is null)
        {
            scope.Database.Insert(new ReadStateDto { UserKey = userKey, Channel = channel, LastRead = date });
        }
        else if (row.LastRead < date)
        {
            row.LastRead = date;
            scope.Database.Update(row);
        }
    }

    public IReadOnlyDictionary<string, DateTime> GetLastRead(Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ReadStateDto>()
            .From<ReadStateDto>()
            .Where<ReadStateDto>(x => x.UserKey == userKey);

        return scope.Database.Fetch<ReadStateDto>(sql)
            .ToDictionary(x => x.Channel, x => DateTime.SpecifyKind(x.LastRead, DateTimeKind.Utc));
    }
}
