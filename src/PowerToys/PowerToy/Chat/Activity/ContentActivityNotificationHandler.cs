using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;

namespace PowerToys.PowerToy.Chat.Activity;

/// <summary>
/// Turns content events into activity lines in each document's chat. Only changes made by a
/// backoffice user post a line; imports and background jobs have nobody to name.
/// </summary>
public class ContentActivityNotificationHandler(
    ActivityService activityService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) :
    INotificationAsyncHandler<ContentSavedNotification>,
    INotificationAsyncHandler<ContentPublishedNotification>,
    INotificationAsyncHandler<ContentUnpublishedNotification>,
    INotificationAsyncHandler<ContentMovedNotification>,
    INotificationAsyncHandler<ContentMovedToRecycleBinNotification>,
    INotificationAsyncHandler<ContentCopiedNotification>,
    INotificationAsyncHandler<ContentRolledBackNotification>
{
    private static readonly string RecycleBinPathPart = $",{Umbraco.Cms.Core.Constants.System.RecycleBinContent},";

    public Task HandleAsync(ContentSavedNotification notification, CancellationToken cancellationToken)
        => PostAsync(notification.SavedEntities, ContentActivity.Saved);

    public Task HandleAsync(ContentPublishedNotification notification, CancellationToken cancellationToken)
        => PostAsync(notification.PublishedEntities, ContentActivity.Published);

    public Task HandleAsync(ContentUnpublishedNotification notification, CancellationToken cancellationToken)
        => PostAsync(notification.UnpublishedEntities, ContentActivity.Unpublished);

    public async Task HandleAsync(ContentMovedNotification notification, CancellationToken cancellationToken)
    {
        foreach (var move in notification.MoveInfoCollection)
        {
            // Moving out of the recycle bin is a restore
            string action = $"{move.OriginalPath},".Contains(RecycleBinPathPart)
                ? ContentActivity.Restored
                : ContentActivity.Moved;
            await PostAsync([move.Entity], action);
        }
    }

    public Task HandleAsync(ContentMovedToRecycleBinNotification notification, CancellationToken cancellationToken)
        => PostAsync(notification.MoveInfoCollection.Select(m => m.Entity), ContentActivity.Trashed);

    public Task HandleAsync(ContentCopiedNotification notification, CancellationToken cancellationToken)
        => PostAsync([notification.Original], ContentActivity.Copied);

    public Task HandleAsync(ContentRolledBackNotification notification, CancellationToken cancellationToken)
        => PostAsync([notification.Entity], ContentActivity.RolledBack);

    private async Task PostAsync(IEnumerable<IContent> entities, string action)
    {
        if (backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser is not { } user)
        {
            return;
        }

        foreach (IContent content in entities)
        {
            await activityService.PostAsync(content.Key, action, user);
        }
    }
}
