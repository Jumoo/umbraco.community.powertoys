using PowerToys.PowerToy.Tasks.Persistence;

namespace PowerToys.PowerToy.Tasks.Reviews;

/// <summary>
/// Review rules, review state and history. Works in the DTOs directly; there's no logic here
/// worth a separate model.
/// </summary>
public interface IReviewStore
{
    IReadOnlyList<ReviewRuleDto> GetRules();

    ReviewRuleDto? GetRule(Guid id);

    ReviewRuleDto? GetRuleForContentType(Guid contentTypeKey);

    void SaveRule(ReviewRuleDto rule);

    void DeleteRule(Guid id);

    ReviewDto? Get(Guid documentKey);

    void Save(ReviewDto review);

    void Delete(Guid documentKey);

    IReadOnlyList<ReviewHistoryDto> GetHistory(Guid documentKey);

    void AddHistory(ReviewHistoryDto entry);

    /// <summary>
    /// Reviews due on or before the date, soonest first, paged.
    /// </summary>
    (IReadOnlyList<ReviewDto> Items, long Total) GetDue(DateTime before, int skip, int take);

    /// <summary>
    /// Every review that's due on or before the date and hasn't been reminded for that due date yet.
    /// </summary>
    IReadOnlyList<ReviewDto> GetDueNotReminded(DateTime before);
}
