namespace PowerToys.PowerToy.Tasks;

/// <summary>
/// The Tasks power toy's own user group permissions, set in the user group editor under the
/// Tasks heading. Tasks on a document follow the document's own permissions and need neither.
/// </summary>
/// <remarks>The client registers the same strings in <c>Client/src/power-toy/tasks/permissions</c>.</remarks>
public static class TasksPermissions
{
    /// <summary>Create, change, reorder and delete global tasks (ones not on a document).</summary>
    public const string ManageGlobal = "PowerToys.Tasks.ManageGlobal";

    /// <summary>See everyone's open tasks and due reviews, not only your own.</summary>
    public const string ViewAll = "PowerToys.Tasks.ViewAll";

    /// <summary>Manage the rules that give content its review dates.</summary>
    public const string ManageReviews = "PowerToys.Tasks.ManageReviews";

    public static readonly IReadOnlyList<string> All = [ManageGlobal, ViewAll, ManageReviews];
}
