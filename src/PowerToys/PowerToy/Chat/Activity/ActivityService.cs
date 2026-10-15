using System.Text.Json;
using PowerToys.PowerToy.Chat.Services;
using PowerToys.Services;
using PowerToys.SignalR;
using Microsoft.AspNetCore.SignalR;
using Umbraco.Cms.Core.Models.Membership;

namespace PowerToys.PowerToy.Chat.Activity;

/// <summary>
/// Posts activity lines to a document's chat and sends them to anyone who has it open.
/// Activity lines don't count as unread.
/// </summary>
public class ActivityService(
    IChatMessageStore messageStore,
    IHubContext<PowerToysHub> hubContext,
    IPowerToyService powerToyService)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // A publish straight after a save is one action ("Save and publish"), so the save line
    // becomes the publish line rather than leaving both
    private static readonly TimeSpan SaveThenActWindow = TimeSpan.FromSeconds(10);

    public bool IsEnabled(string action) => IsEnabled(ChatActivitySettings.GetSettings(powerToyService), action);

    private static bool IsEnabled(ChatActivitySettings? settings, string action)
        => settings is not null
           && settings.ActivityEnabled
           && settings.ActivityEvents.Contains(action, StringComparer.OrdinalIgnoreCase);

    /// <returns>The line posted, or null when that kind of activity is turned off or the
    /// line was folded into an earlier one.</returns>
    public async Task<ChatMessage?> PostAsync(
        Guid documentKey, string action, IUser? user, string? title = null, string? target = null)
    {
        ChatActivitySettings? settings = ChatActivitySettings.GetSettings(powerToyService);
        if (IsEnabled(settings, action) is false)
        {
            return null;
        }

        string channel = documentKey.ToString();
        DateTime now = DateTime.UtcNow;

        ChatMessage? latest = messageStore.GetLatest(channel);
        ActivityPayload? latestActivity = ReadPayload(latest);

        if (latest is not null && latestActivity is not null && latest.UserKey == user?.Key)
        {
            TimeSpan age = now - latest.Date;

            if (action == ContentActivity.Saved
                && latestActivity.Action == ContentActivity.Saved
                && age < TimeSpan.FromMinutes(settings!.CollapseMinutes))
            {
                await UpdateAsync(latest, latestActivity with { Count = latestActivity.Count + 1 }, now);
                return null;
            }

            if (ContentActivity.FollowsSave(action)
                && latestActivity.Action == ContentActivity.Saved
                && age < SaveThenActWindow)
            {
                if (latestActivity.Count == 1)
                {
                    await UpdateAsync(latest, new ActivityPayload(action), now);
                    return null;
                }

                // Take the save that came with this action back off the earlier saves
                await UpdateAsync(latest, latestActivity with { Count = latestActivity.Count - 1 }, latest.Date);
            }
        }

        var message = new ChatMessage
        {
            Channel = channel,
            Message = string.Empty,
            Type = ChatMessage.ActivityType,
            Payload = JsonSerializer.Serialize(new ActivityPayload(action, Title: title, Target: target), JsonOptions),
            UserName = user?.Name ?? user?.Username ?? string.Empty,
            UserKey = user?.Key,
            Date = now,
        };

        messageStore.Add(message);
        await SendAsync(message);
        return message;
    }

    private async Task UpdateAsync(ChatMessage message, ActivityPayload payload, DateTime date)
    {
        message.Payload = JsonSerializer.Serialize(payload, JsonOptions);
        message.Date = date;
        messageStore.Update(message);
        await SendAsync(message);
    }

    // Clients replace a message they already have by its key, so an update is sent the same way
    private Task SendAsync(ChatMessage message)
        => hubContext.Clients.Group(PowerToysHub.GroupName(message.Channel)).SendAsync("chat", message);

    private static ActivityPayload? ReadPayload(ChatMessage? message)
    {
        if (message?.Type != ChatMessage.ActivityType || message.Payload is null)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<ActivityPayload>(message.Payload, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
