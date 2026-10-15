namespace PowerToys.PowerToy.Chat.Activity;

/// <summary>
/// The things that can happen to a document, as stored in an activity line's payload.
/// The client turns each into a localised sentence.
/// </summary>
public static class ContentActivity
{
    public const string Saved = "Saved";
    public const string Published = "Published";
    public const string Unpublished = "Unpublished";
    public const string Moved = "Moved";
    public const string Copied = "Copied";
    public const string RolledBack = "RolledBack";
    public const string Trashed = "Trashed";
    public const string Restored = "Restored";
    public const string TaskAssigned = "TaskAssigned";
    public const string TaskCompleted = "TaskCompleted";
    public const string Reviewed = "Reviewed";
    public const string ReviewDue = "ReviewDue";

    /// <summary>
    /// Actions that come with a save of their own ("Save and publish"), so a save line just
    /// before them is folded in.
    /// </summary>
    public static bool FollowsSave(string action) => action is Published or Unpublished;
}

/// <param name="Action">One of <see cref="ContentActivity"/>.</param>
/// <param name="Count">How many times it happened, for saves that have collapsed.</param>
/// <param name="Title">What it was about, such as a task's title.</param>
/// <param name="Target">Who it was about, such as the person a task was assigned to.</param>
public record ActivityPayload(string Action, int Count = 1, string? Title = null, string? Target = null);
