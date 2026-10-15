using PowerToys.PowerToy.Chat.Activity;
using PowerToys.PowerToy.Tasks.Persistence;
using PowerToys.Security;
using PowerToys.Services;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Services.AuthorizationStatus;

namespace PowerToys.PowerToy.Tasks.Reviews;

public enum ReviewOperationStatus
{
    Success,
    NotFound,
    NoAccess,
    Invalid,
}

public record ReviewRule(Guid Id, Guid ContentTypeKey, string? ContentTypeName, int IntervalMonths, bool FromPublish);

public record ReviewHistoryEntry(Guid ReviewedBy, string ReviewedByName, DateTime Date, string? Note);

/// <summary>A document's review state, for its Review panel.</summary>
public record ReviewState(
    Guid DocumentKey,
    DateTime? NextReview,
    bool SetManually,
    ReviewRule? Rule,
    IReadOnlyList<ReviewHistoryEntry> History);

/// <summary>A document due for review, for the dashboard.</summary>
public record DueReview(Guid DocumentKey, string? DocumentName, DateTime NextReview);

/// <summary>
/// Review dates. A document gets one by hand, or from a rule for its content type ("every 6
/// months from the last review" or "from the last publish"). A date set by hand wins over the
/// rule until the next review. Once the date passes the document is due; marking it reviewed
/// records who and when, and sets the next date from the rule.
/// </summary>
public class ReviewService(
    IReviewStore reviewStore,
    IContentService contentService,
    IContentTypeService contentTypeService,
    IContentPermissionService contentPermissionService,
    IUserService userService,
    IUserGroupService userGroupService,
    ActivityService activityService,
    IPowerToyService powerToyService)
{
    public const int MaxNoteLength = 1000;

    public async Task<(ReviewOperationStatus Status, ReviewState? State)> GetStateAsync(IUser user, Guid documentKey)
    {
        if (await CanAsync(user, documentKey, ActionBrowse.ActionLetter) is false)
        {
            return (ReviewOperationStatus.NoAccess, null);
        }

        IContent? content = contentService.GetById(documentKey);
        if (content is null)
        {
            return (ReviewOperationStatus.NotFound, null);
        }

        ReviewDto? review = reviewStore.Get(documentKey);
        ReviewRuleDto? rule = reviewStore.GetRuleForContentType(content.ContentType.Key);

        var history = new List<ReviewHistoryEntry>();
        foreach (ReviewHistoryDto entry in reviewStore.GetHistory(documentKey))
        {
            IUser? reviewer = await userService.GetAsync(entry.ReviewedBy);
            history.Add(new ReviewHistoryEntry(entry.ReviewedBy, reviewer?.Name ?? reviewer?.Username ?? "?", entry.Date, entry.Note));
        }

        return (ReviewOperationStatus.Success, new ReviewState(
            documentKey,
            review?.NextReview,
            review?.SetManually ?? false,
            rule is null ? null : ToRule(rule),
            history));
    }

    /// <summary>
    /// Sets the review date by hand, or clears it. Clearing it goes back to the rule's date, if
    /// there is a rule.
    /// </summary>
    public async Task<ReviewOperationStatus> SetDateAsync(IUser user, Guid documentKey, DateTime? date)
    {
        if (await CanAsync(user, documentKey, ActionUpdate.ActionLetter) is false)
        {
            return ReviewOperationStatus.NoAccess;
        }

        IContent? content = contentService.GetById(documentKey);
        if (content is null)
        {
            return ReviewOperationStatus.NotFound;
        }

        ReviewDto review = reviewStore.Get(documentKey) ?? new ReviewDto { DocumentKey = documentKey };

        if (date is not null)
        {
            review.NextReview = date.Value.ToUniversalTime();
            review.SetManually = true;
        }
        else
        {
            review.SetManually = false;
            review.NextReview = NextFromRule(content, review.LastReviewed ?? DateTime.UtcNow);
        }

        reviewStore.Save(review);
        return ReviewOperationStatus.Success;
    }

    public async Task<ReviewOperationStatus> MarkReviewedAsync(IUser user, Guid documentKey, string? note)
    {
        if (note?.Length > MaxNoteLength)
        {
            return ReviewOperationStatus.Invalid;
        }

        if (await CanAsync(user, documentKey, ActionUpdate.ActionLetter) is false)
        {
            return ReviewOperationStatus.NoAccess;
        }

        IContent? content = contentService.GetById(documentKey);
        if (content is null)
        {
            return ReviewOperationStatus.NotFound;
        }

        DateTime now = DateTime.UtcNow;
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();

        reviewStore.AddHistory(new ReviewHistoryDto { DocumentKey = documentKey, ReviewedBy = user.Key, Date = now, Note = note });

        ReviewDto review = reviewStore.Get(documentKey) ?? new ReviewDto { DocumentKey = documentKey };
        review.LastReviewed = now;
        review.LastReviewedBy = user.Key;
        review.SetManually = false;
        review.NextReview = NextFromRule(content, now);
        reviewStore.Save(review);

        await activityService.PostAsync(documentKey, ContentActivity.Reviewed, user, note);
        return ReviewOperationStatus.Success;
    }

    /// <summary>
    /// Documents due for review on or before today, soonest first. Without
    /// <paramref name="everyone"/>, only those the user is responsible for (they edited it
    /// last); with it, all of them, which needs the permission to see everything.
    /// </summary>
    public async Task<(ReviewOperationStatus Status, IReadOnlyList<DueReview> Items, long Total)> GetDueAsync(
        IUser user, bool everyone, int skip, int take)
    {
        if (everyone && user.Has(TasksPermissions.ViewAll) is false)
        {
            return (ReviewOperationStatus.NoAccess, [], 0);
        }

        // Filtered in memory, as access and responsibility aren't in our tables. Overdue lists
        // are short, so read them all.
        var (due, _) = reviewStore.GetDue(DateTime.UtcNow, 0, int.MaxValue);

        var visible = new List<DueReview>();
        foreach (ReviewDto review in due)
        {
            if (await CanAsync(user, review.DocumentKey, ActionBrowse.ActionLetter) is false)
            {
                continue;
            }

            IContent? content = contentService.GetById(review.DocumentKey);
            if (content is null || content.Trashed)
            {
                continue;
            }

            if (everyone is false && (await GetResponsibleAsync(content)).All(u => u.Key != user.Key))
            {
                continue;
            }

            visible.Add(new DueReview(review.DocumentKey, content.Name, review.NextReview!.Value));
        }

        return (ReviewOperationStatus.Success, visible.Skip(skip).Take(take).ToList(), visible.Count);
    }

    /// <summary>
    /// Who is reminded about a document's review: whoever edited it last, or the configured
    /// user group when they can't be found.
    /// </summary>
    public async Task<IReadOnlyList<IUser>> GetResponsibleAsync(IContent content)
    {
        IUser? writer = userService.GetUserById(content.WriterId);
        if (writer is not null && writer.UserState != UserState.Disabled)
        {
            return [writer];
        }

        Guid groupKey = TasksSettings.GetSettings(powerToyService)?.ReminderGroupKey
            ?? Umbraco.Cms.Core.Constants.Security.AdminGroupKey;
        IUserGroup? group = await userGroupService.GetAsync(groupKey);
        return group is null ? [] : userService.GetAllInGroup(group.Id).ToList();
    }

    // Rules

    public IReadOnlyList<ReviewRule> GetRules()
        => reviewStore.GetRules().Select(ToRule).OrderBy(r => r.ContentTypeName).ToList();

    /// <summary>
    /// Adds or changes a rule. Documents of that type without a date set by hand get the full
    /// interval from today, so a new rule doesn't make everything overdue at once.
    /// </summary>
    public ReviewOperationStatus SaveRule(IUser user, Guid? id, Guid contentTypeKey, int intervalMonths, bool fromPublish)
    {
        if (user.Has(TasksPermissions.ManageReviews) is false)
        {
            return ReviewOperationStatus.NoAccess;
        }

        IContentType? contentType = contentTypeService.Get(contentTypeKey);
        if (contentType is null || intervalMonths is < 1 or > 120)
        {
            return ReviewOperationStatus.Invalid;
        }

        ReviewRuleDto? existing = id is null ? null : reviewStore.GetRule(id.Value);
        if (id is not null && existing is null)
        {
            return ReviewOperationStatus.NotFound;
        }

        // One rule per content type
        ReviewRuleDto? clash = reviewStore.GetRuleForContentType(contentTypeKey);
        if (clash is not null && clash.Id != existing?.Id)
        {
            return ReviewOperationStatus.Invalid;
        }

        var rule = existing ?? new ReviewRuleDto { Id = Guid.NewGuid() };
        rule.ContentTypeKey = contentTypeKey;
        rule.IntervalMonths = intervalMonths;
        rule.FromPublish = fromPublish;
        reviewStore.SaveRule(rule);

        DateTime next = DateTime.UtcNow.AddMonths(intervalMonths);
        ApplyToContentType(contentType.Id, review =>
        {
            if (review.SetManually is false)
            {
                review.NextReview = next;
            }
        });

        return ReviewOperationStatus.Success;
    }

    /// <summary>
    /// Removes a rule. Dates that came from it are cleared; dates set by hand stay.
    /// </summary>
    public ReviewOperationStatus DeleteRule(IUser user, Guid id)
    {
        if (user.Has(TasksPermissions.ManageReviews) is false)
        {
            return ReviewOperationStatus.NoAccess;
        }

        ReviewRuleDto? rule = reviewStore.GetRule(id);
        if (rule is null)
        {
            return ReviewOperationStatus.NotFound;
        }

        reviewStore.DeleteRule(id);

        if (contentTypeService.Get(rule.ContentTypeKey) is { } contentType)
        {
            ApplyToContentType(contentType.Id, review =>
            {
                if (review.SetManually is false)
                {
                    review.NextReview = null;
                }
            });
        }

        return ReviewOperationStatus.Success;
    }

    /// <summary>
    /// A publish starts the clock for rules that count from publishing, and gives a document
    /// its first date if a rule covers it and it has none yet. Does nothing while reviews are off.
    /// </summary>
    public void OnPublished(IContent content)
    {
        if (TasksSettings.AreReviewsEnabled(powerToyService) is false)
        {
            return;
        }

        ReviewRuleDto? rule = reviewStore.GetRuleForContentType(content.ContentType.Key);
        if (rule is null)
        {
            return;
        }

        ReviewDto? review = reviewStore.Get(content.Key);
        if (review?.SetManually is true)
        {
            return;
        }

        if (review is null || review.NextReview is null || rule.FromPublish)
        {
            review ??= new ReviewDto { DocumentKey = content.Key };
            review.NextReview = DateTime.UtcNow.AddMonths(rule.IntervalMonths);
            reviewStore.Save(review);
        }
    }

    private DateTime? NextFromRule(IContent content, DateTime from)
    {
        ReviewRuleDto? rule = reviewStore.GetRuleForContentType(content.ContentType.Key);
        if (rule is null)
        {
            return null;
        }

        // Counting from publish uses the last publish, unless that would already be overdue
        DateTime start = rule.FromPublish && content.PublishDate is { } published && published.AddMonths(rule.IntervalMonths) > DateTime.UtcNow
            ? published.ToUniversalTime()
            : from;
        return start.AddMonths(rule.IntervalMonths);
    }

    private void ApplyToContentType(int contentTypeId, Action<ReviewDto> apply)
    {
        const int pageSize = 500;
        long page = 0;
        long total;
        do
        {
            IEnumerable<IContent> items = contentService.GetPagedOfTypes([contentTypeId], page++, pageSize, out total, null);
            foreach (IContent item in items)
            {
                ReviewDto review = reviewStore.Get(item.Key) ?? new ReviewDto { DocumentKey = item.Key };
                apply(review);
                reviewStore.Save(review);
            }
        }
        while (page * pageSize < total);
    }

    private ReviewRule ToRule(ReviewRuleDto rule)
        => new(rule.Id, rule.ContentTypeKey, contentTypeService.Get(rule.ContentTypeKey)?.Name, rule.IntervalMonths, rule.FromPublish);

    private async Task<bool> CanAsync(IUser user, Guid documentKey, string permission)
        => await contentPermissionService.AuthorizeAccessAsync(user, documentKey, permission)
            == ContentAuthorizationStatus.Success;
}
