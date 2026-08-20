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
    }
}
