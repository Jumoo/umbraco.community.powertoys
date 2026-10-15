using PowerToys.PowerToy.Tasks.Persistence;
using NPoco;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Tasks.Reviews;

public class DatabaseReviewStore(IScopeProvider scopeProvider) : IReviewStore
{
    public IReadOnlyList<ReviewRuleDto> GetRules()
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        return scope.Database.Fetch<ReviewRuleDto>(scope.SqlContext.Sql().Select<ReviewRuleDto>().From<ReviewRuleDto>());
    }

    public ReviewRuleDto? GetRule(Guid id)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        return scope.Database.FirstOrDefault<ReviewRuleDto>(
            scope.SqlContext.Sql().Select<ReviewRuleDto>().From<ReviewRuleDto>().Where<ReviewRuleDto>(x => x.Id == id));
    }

    public ReviewRuleDto? GetRuleForContentType(Guid contentTypeKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        return scope.Database.FirstOrDefault<ReviewRuleDto>(
            scope.SqlContext.Sql().Select<ReviewRuleDto>().From<ReviewRuleDto>()
                .Where<ReviewRuleDto>(x => x.ContentTypeKey == contentTypeKey));
    }

    public void SaveRule(ReviewRuleDto rule)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        if (GetRule(rule.Id) is null)
        {
            scope.Database.Insert(rule);
        }
        else
        {
            scope.Database.Update(rule);
        }
    }

    public void DeleteRule(Guid id)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Delete<ReviewRuleDto>(scope.SqlContext.Sql().Where<ReviewRuleDto>(x => x.Id == id));
    }

    public ReviewDto? Get(Guid documentKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        return Utc(scope.Database.FirstOrDefault<ReviewDto>(
            scope.SqlContext.Sql().Select<ReviewDto>().From<ReviewDto>().Where<ReviewDto>(x => x.DocumentKey == documentKey)));
    }

    public void Save(ReviewDto review)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        if (Get(review.DocumentKey) is null)
        {
            scope.Database.Insert(review);
        }
        else
        {
            scope.Database.Update(review);
        }
    }

    public void Delete(Guid documentKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Delete<ReviewDto>(scope.SqlContext.Sql().Where<ReviewDto>(x => x.DocumentKey == documentKey));
        scope.Database.Delete<ReviewHistoryDto>(scope.SqlContext.Sql().Where<ReviewHistoryDto>(x => x.DocumentKey == documentKey));
    }

    public IReadOnlyList<ReviewHistoryDto> GetHistory(Guid documentKey)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        return scope.Database.Fetch<ReviewHistoryDto>(
                scope.SqlContext.Sql().Select<ReviewHistoryDto>().From<ReviewHistoryDto>()
                    .Where<ReviewHistoryDto>(x => x.DocumentKey == documentKey)
                    .OrderByDescending<ReviewHistoryDto>(x => x.Date))
            .Select(h =>
            {
                h.Date = DateTime.SpecifyKind(h.Date, DateTimeKind.Utc);
                return h;
            })
            .ToList();
    }

    public void AddHistory(ReviewHistoryDto entry)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);
        scope.Database.Insert(entry);
    }

    public (IReadOnlyList<ReviewDto> Items, long Total) GetDue(DateTime before, int skip, int take)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ReviewDto>()
            .From<ReviewDto>()
            .Where<ReviewDto>(x => x.NextReview != null && x.NextReview <= before)
            .OrderBy<ReviewDto>(x => x.NextReview);

        take = Math.Max(take, 1);
        Page<ReviewDto> page = scope.Database.Page<ReviewDto>((skip / take) + 1, take, sql);
        return (page.Items.Select(x => Utc(x)!).ToList(), page.TotalItems);
    }

    public IReadOnlyList<ReviewDto> GetDueNotReminded(DateTime before)
    {
        using IScope scope = scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.SqlContext.Sql()
            .Select<ReviewDto>()
            .From<ReviewDto>()
            .Where<ReviewDto>(x => x.NextReview != null && x.NextReview <= before);

        return scope.Database.Fetch<ReviewDto>(sql)
            .Select(x => Utc(x)!)
            .Where(x => x.RemindedFor != x.NextReview)
            .ToList();
    }

    private static ReviewDto? Utc(ReviewDto? dto)
    {
        if (dto is null)
        {
            return null;
        }

        dto.NextReview = Utc(dto.NextReview);
        dto.LastReviewed = Utc(dto.LastReviewed);
        dto.RemindedFor = Utc(dto.RemindedFor);
        return dto;
    }

    private static DateTime? Utc(DateTime? date) => date is null ? null : DateTime.SpecifyKind(date.Value, DateTimeKind.Utc);
}
