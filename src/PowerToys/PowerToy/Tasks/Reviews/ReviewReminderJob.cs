using PowerToys.PowerToy.Chat.Activity;
using PowerToys.PowerToy.Tasks.Persistence;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.SignalR;
using Microsoft.AspNetCore.SignalR;
using System.Globalization;
using Microsoft.Extensions.Logging;
using PowerToys.Services;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.BackgroundJobs;

namespace PowerToys.PowerToy.Tasks.Reviews;

/// <summary>
/// Reminds people when a document falls due for review. Distributed, so on a load balanced
/// site only one server sends reminders, and each due date is reminded once.
/// </summary>
/// <remarks>
/// <para>
/// The reminder is a toast for each person responsible if they're signed in. With the Chat
/// power toy on, it's also a line in the document's chat that counts as a mention for each of them.
/// </para>
/// <para>
/// Umbraco stores a distributed job's period when the site starts, so a period read from the
/// settings would only change on a restart. Instead the job wakes on a short fixed period and
/// checks the configured hours against when it last looked, kept in the key/value store so every
/// server sees it. A change to the setting takes effect on the next wake.
/// </para>
/// </remarks>
public class ReviewReminderJob(
    IReviewStore reviewStore,
    ReviewService reviewService,
    IContentService contentService,
    ActivityService activityService,
    IMentionStore mentionStore,
    ChatNotifier notifier,
    IHubContext<PowerToysHub> hubContext,
    IPowerToyService powerToyService,
    IKeyValueService keyValueService,
    ILogger<ReviewReminderJob> logger) : IDistributedBackgroundJob
{
    // Not under the "PowerToys." prefix, so backup/restore of the power toys' settings leaves it out
    private const string LastCheckedKey = "PowerToysState.ReviewReminders.LastChecked";

    public string Name => "PowerToys.ReviewReminders";

    public TimeSpan Period => TimeSpan.FromMinutes(5);

    public async Task ExecuteAsync()
    {
        TasksSettings? settings = TasksSettings.GetSettings(powerToyService);
        if (settings?.ReviewsEnabled is not true || IsDue(settings) is false)
        {
            return;
        }

        keyValueService.SetValue(LastCheckedKey, DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture));

        foreach (ReviewDto review in reviewStore.GetDueNotReminded(DateTime.UtcNow))
        {
            try
            {
                await RemindAsync(review);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Power Toys: couldn't send the review reminder for {DocumentKey}", review.DocumentKey);
            }
        }
    }

    // Whether the configured number of hours has passed since the job last looked
    private bool IsDue(TasksSettings settings)
    {
        string? value = keyValueService.GetValue(LastCheckedKey);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out DateTime lastChecked) is false)
        {
            return true;
        }

        return DateTime.UtcNow - lastChecked >= TimeSpan.FromHours(Math.Max(1, settings.ReminderHours));
    }

    private async Task RemindAsync(ReviewDto review)
    {
        IContent? content = contentService.GetById(review.DocumentKey);

        // Nothing to remind about for a deleted or binned document; mark it done so it isn't retried
        if (content is not null && content.Trashed is false)
        {
            IReadOnlyList<IUser> responsible = await reviewService.GetResponsibleAsync(content);
            ChatMessage? line = await activityService.PostAsync(content.Key, ContentActivity.ReviewDue, null);

            foreach (IUser user in responsible)
            {
                if (line is not null)
                {
                    mentionStore.Add(line, [user.Key]);
                    await notifier.SendUnreadCountAsync(user.Key, line.Channel);
                }

                await hubContext.Clients.Group(PowerToysHub.UserGroupName(user.Key))
                    .SendAsync("reviewDue", new { DocumentKey = content.Key, DocumentName = content.Name });
            }
        }

        review.RemindedFor = review.NextReview;
        reviewStore.Save(review);
    }
}
