using Microsoft.Extensions.DependencyInjection;
using PowerToys.PowerToy.Chat.Activity;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.SignalR;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Chat;

internal static class ChatBuilderExtensions
{
    /// <summary>
    /// Registers the Chat power toy's services. They're always registered; the hub, the API and
    /// the activity lines check the power toy is enabled before doing anything.
    /// </summary>
    public static IUmbracoBuilder AddChat(this IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<IChatMessageStore, DatabaseChatMessageStore>();
        builder.Services.AddSingleton<IReadStateStore, DatabaseReadStateStore>();
        builder.Services.AddSingleton<IMentionStore, DatabaseMentionStore>();
        builder.Services.AddSingleton<IConfirmationStore, DatabaseConfirmationStore>();
        builder.Services.AddSingleton<ChannelAccessService>();
        builder.Services.AddSingleton<MentionService>();
        builder.Services.AddSingleton<UnreadService>();
        builder.Services.AddSingleton<ConversationService>();
        builder.Services.AddSingleton<ConfirmationService>();
        builder.Services.AddSingleton<ChatNotifier>();

        builder.Services.AddSingleton<ActivityService>();
        builder
            .AddNotificationAsyncHandler<ContentSavedNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentPublishedNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentUnpublishedNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentMovedNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentMovedToRecycleBinNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentCopiedNotification, ContentActivityNotificationHandler>()
            .AddNotificationAsyncHandler<ContentRolledBackNotification, ContentActivityNotificationHandler>();

        return builder;
    }
}
