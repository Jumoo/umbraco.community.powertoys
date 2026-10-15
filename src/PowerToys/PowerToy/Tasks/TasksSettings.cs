using System.Text.Json;
using PowerToys.Services;

namespace PowerToys.PowerToy.Tasks;

/// <summary>
/// The Tasks power toy's settings, saved from its card or set under <c>PowerToys:Tasks</c> in
/// appsettings. They're about content reviews, which are part of Tasks and off until switched on.
/// </summary>
public class TasksSettings
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public bool ReviewsEnabled { get; set; }

    /// <summary>
    /// The user group reminded about a review when the page's last editor can't be found.
    /// Null means Administrators.
    /// </summary>
    public Guid? ReminderGroupKey { get; set; }

    /// <summary>How often, in hours, to look for pages that have fallen due.</summary>
    public int ReminderHours { get; set; } = 1;

    /// <summary>
    /// The saved settings, or null while the Tasks power toy is turned off.
    /// </summary>
    public static TasksSettings? GetSettings(IPowerToyService powerToyService)
    {
        if (powerToyService.IsEnabled(TasksConstants.PowerToyAlias) is false) return null;

        string? json = powerToyService.GetSettings(TasksConstants.PowerToyAlias);
        if (string.IsNullOrWhiteSpace(json)) return new TasksSettings();

        try
        {
            return JsonSerializer.Deserialize<TasksSettings>(json, JsonOptions) ?? new TasksSettings();
        }
        catch (JsonException)
        {
            return new TasksSettings();
        }
    }

    /// <summary>
    /// Whether content reviews are on: the Tasks power toy is enabled and reviews are switched on in it.
    /// </summary>
    public static bool AreReviewsEnabled(IPowerToyService powerToyService)
        => GetSettings(powerToyService)?.ReviewsEnabled is true;
}
