using PowerToys.PowerToy.Chat.Persistence;
using NPoco;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Chat.Services;

public class DatabaseMentionStore(IScopeProvider scopeProvider) : IMentionStore
{
    public void Add(ChatMessage message, IEnumerable<Guid> userKeys)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        foreach (Guid userKey in userKeys)
        {
            scope.Database.Insert(new MentionDto
            {
                MessageKey = message.Key,
                UserKey = userKey,
                Channel = message.Channel,
                Date = message.Date,
            });
        }
    }

    public int CountSince(Guid userKey, string channel, DateTime? since)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectCount()
            .From<MentionDto>()
            .Where<MentionDto>(x => x.UserKey == userKey && x.Channel == channel);

        if (since is not null)
        {
            DateTime date = since.Value;
            sql = sql.Where<MentionDto>(x => x.Date > date);
        }

        return scope.Database.ExecuteScalar<int>(sql);
    }

    public IReadOnlyList<string> GetChannelsMentionedIn(Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectDistinct<MentionDto>(x => x.Channel)
            .From<MentionDto>()
            .Where<MentionDto>(x => x.UserKey == userKey);

        return scope.Database.Fetch<string>(sql);
    }

    public IReadOnlyList<Guid> GetMentionedUsers(string channel)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectDistinct<MentionDto>(x => x.UserKey)
            .From<MentionDto>()
            .Where<MentionDto>(x => x.Channel == channel);

        return scope.Database.Fetch<Guid>(sql);
    }
}
