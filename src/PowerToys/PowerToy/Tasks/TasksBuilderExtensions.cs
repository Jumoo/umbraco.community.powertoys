using Microsoft.Extensions.DependencyInjection;
using PowerToys.PowerToy.Tasks.Reviews;
using Umbraco.Cms.Infrastructure.BackgroundJobs;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Extensions;

namespace PowerToys.PowerToy.Tasks;

internal static class TasksBuilderExtensions
{
    /// <summary>
    /// Registers the Tasks power toy's services. They're always registered; the API checks the
    /// power toy is enabled. Tasks uses the Chat services for activity lines and the people
    /// list, which are registered whether or not Chat is on.
    /// </summary>
    public static IUmbracoBuilder AddTasks(this IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<ITaskStore, DatabaseTaskStore>();
        builder.Services.AddSingleton<TaskService>();
        builder.AddNotificationHandler<ContentDeletedNotification, DeleteTasksWithDocumentHandler>();

        // Content reviews, part of Tasks. The handler and job check reviews are switched on.
        builder.Services.AddSingleton<IReviewStore, DatabaseReviewStore>();
        builder.Services.AddSingleton<ReviewService>();
        builder.Services.AddSingleton<IDistributedBackgroundJob, ReviewReminderJob>();
        builder
            .AddNotificationHandler<ContentPublishedNotification, ReviewNotificationHandler>()
            .AddNotificationHandler<ContentDeletedNotification, ReviewNotificationHandler>();

        return builder;
    }
}
