namespace PowerToys.PowerToy.Tasks;

public interface ITaskStore
{
    ContentTask? Get(Guid key);

    /// <summary>
    /// The document's tasks in their sort order, or the global tasks when the key is null.
    /// </summary>
    IReadOnlyList<ContentTask> GetForDocument(Guid? documentKey);

    /// <summary>
    /// Open tasks, soonest due first (tasks with no due date last). Filtered to one assignee
    /// when one is given.
    /// </summary>
    (IReadOnlyList<ContentTask> Items, long Total) GetOpen(Guid? assigneeKey, int skip, int take);

    void Save(ContentTask task);

    void Delete(Guid key);

    void DeleteForDocument(Guid documentKey);
}
