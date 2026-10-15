using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace PowerToys.PowerToy.Tasks.Reviews;

/// <summary>
/// Keeps review dates in step with content: a publish can start or restart the clock, and
/// deleting a document removes its review state.
/// </summary>
public class ReviewNotificationHandler(ReviewService reviewService, IReviewStore reviewStore) :
    INotificationHandler<ContentPublishedNotification>,
    INotificationHandler<ContentDeletedNotification>
{
    public void Handle(ContentPublishedNotification notification)
    {
        foreach (var content in notification.PublishedEntities)
        {
            reviewService.OnPublished(content);
        }
    }

    public void Handle(ContentDeletedNotification notification)
    {
        foreach (var content in notification.DeletedEntities)
        {
            reviewStore.Delete(content.Key);
        }
    }
}
