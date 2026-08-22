namespace PowerToys.Services
{
    /// <summary>
    ///     Thrown when trying to change a power toy's enabled flag or settings while an
    ///     appsettings.json override for it is present - that value is the source of truth
    ///     while the override exists, so a backoffice save would be silently discarded.
    /// </summary>
    public class PowerToySettingsLockedException : Exception
    {
        public PowerToySettingsLockedException(string alias)
            : base($"'{alias}' is configured in appsettings.json and cannot be changed from the backoffice.")
        {
        }
    }
}
