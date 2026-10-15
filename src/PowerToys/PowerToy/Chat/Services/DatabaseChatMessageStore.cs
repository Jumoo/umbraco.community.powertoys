using PowerToys.PowerToy.Chat.Persistence;
using NPoco;
using Umbraco.Extensions;
using Umbraco.Cms.Infrastructure.Scoping;

namespace PowerToys.PowerToy.Chat.Services;

public class DatabaseChatMessageStore(IScopeProvider scopeProvider) : IChatMessageStore
{
    public const int MaxHistory = 500;

    public void Add(ChatMessage message)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Insert(ChatMessageDto.From(message));
    }

    public void Update(ChatMessage message)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Update(ChatMessageDto.From(message));
    }

    public IReadOnlyList<ChatMessage> Get(IEnumerable<Guid> keys)
    {
        var list = keys.ToList();
        if (list.Count == 0)
        {
            return [];
        }

        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ChatMessageDto>()
            .From<ChatMessageDto>()
            .WhereIn<ChatMessageDto>(x => x.Id, list)
            .OrderBy<ChatMessageDto>(x => x.Date);

        return scope.Database.Fetch<ChatMessageDto>(sql).Select(r => r.ToChatMessage()).ToList();
    }

    public IReadOnlyList<ChatMessage> GetHistory(string channel)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ChatMessageDto>()
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.Channel == channel)
            .OrderByDescending<ChatMessageDto>(x => x.Date);

        // Newest first from the database, then flipped so the history reads oldest first
        var rows = scope.Database.Page<ChatMessageDto>(1, MaxHistory, sql).Items;

        return rows.Select(r => r.ToChatMessage()).Reverse().ToList();
    }

    public int CountSince(string channel, DateTime? since, Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectCount()
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.Channel == channel
                && x.Type != ChatMessage.ActivityType
                && (x.UserKey == null || x.UserKey != userKey));

        if (since is not null)
        {
            DateTime date = since.Value;
            sql = sql.Where<ChatMessageDto>(x => x.Date > date);
        }

        return scope.Database.ExecuteScalar<int>(sql);
    }

    public IReadOnlyList<string> GetChannelsPostedIn(Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectDistinct<ChatMessageDto>(x => x.Channel)
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.UserKey == userKey);

        return scope.Database.Fetch<string>(sql);
    }

    public IReadOnlyList<string> GetDirectChannels(Guid userKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        string key = userKey.ToString();
        var sql = scope.SqlContext.Sql()
            .SelectDistinct<ChatMessageDto>(x => x.Channel)
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.Channel.StartsWith(Channels.DirectPrefix) && x.Channel.Contains(key));

        return scope.Database.Fetch<string>(sql);
    }

    public IReadOnlyList<string> GetChannelsWithMessages(IEnumerable<string> channels)
    {
        var list = channels.ToList();
        if (list.Count == 0)
        {
            return [];
        }

        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectDistinct<ChatMessageDto>(x => x.Channel)
            .From<ChatMessageDto>()
            .WhereIn<ChatMessageDto>(x => x.Channel, list);

        return scope.Database.Fetch<string>(sql);
    }

    public ChatMessage? GetLatest(string channel)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ChatMessageDto>()
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.Channel == channel)
            .OrderByDescending<ChatMessageDto>(x => x.Date);

        return scope.Database.Page<ChatMessageDto>(1, 1, sql).Items.FirstOrDefault()?.ToChatMessage();
    }

    public IReadOnlyList<Guid> GetPosters(string channel)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .SelectDistinct<ChatMessageDto>(x => x.UserKey)
            .From<ChatMessageDto>()
            .Where<ChatMessageDto>(x => x.Channel == channel && x.UserKey != null);

        return scope.Database.Fetch<Guid>(sql);
    }
}
