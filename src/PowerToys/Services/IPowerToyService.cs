namespace PowerToys.Services
{
    /// <summary>
    ///     Provides the small set of things any power toy needs to know about itself:
    ///     whether it's enabled, and its own settings blob.
    /// </summary>
    public interface IPowerToyService
    {
        bool IsEnabled(string alias);

        void SetEnabled(string alias, bool enabled);

        /// <summary>
        ///     Gets the raw JSON settings stored for a power toy, or <c>null</c> if none have been saved yet.
        /// </summary>
        string? GetSettings(string alias);

        /// <summary>
        ///     Saves the raw JSON settings for a power toy.
        /// </summary>
        void SaveSettings(string alias, string json);

        /// <summary>
        ///     Gets the enabled flag and settings for every power toy, keyed by their raw key/value store key.
        /// </summary>
        IReadOnlyDictionary<string, string?> GetBackup();

        /// <summary>
        ///     Restores enabled flags and settings previously produced by <see cref="GetBackup"/>.
        /// </summary>
        void RestoreBackup(IReadOnlyDictionary<string, string?> values);
    }
}
