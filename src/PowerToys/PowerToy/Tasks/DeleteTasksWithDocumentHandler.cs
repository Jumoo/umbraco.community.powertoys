using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace PowerToys.PowerToy.Tasks;

/// <summary>
/// Deleting a document deletes its tasks. Moving it to the recycle bin keeps them, so a
/// restore brings them back.
/// </summary>
public class DeleteTasksWithDocumentHandler(ITaskStore taskStore) : INotificationHandler<ContentDeletedNotification>
{
    public void Handle(ContentDeletedNotification notification)
    {
        foreach (var content in notification.DeletedEntities)
        {
            taskStore.DeleteForDocument(content.Key);
        }
    }
}
