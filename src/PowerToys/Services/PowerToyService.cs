using Umbraco.Cms.Core.Services;

namespace PowerToys.Services
{
    /// <summary>
    ///     Stores per-power-toy state (enabled flag, settings) in Umbraco's key/value store,
    ///     so it's shared across users/devices instead of living in browser localStorage.
    /// </summary>
    public class PowerToyService : IPowerToyService
    {
        private readonly IKeyValueService _keyValueService;

        public PowerToyService(IKeyValueService keyValueService)
        {
            _keyValueService = keyValueService;
        }

        public bool IsEnabled(string alias)
            => _keyValueService.GetValue(EnabledKey(alias)) != "false";

        public void SetEnabled(string alias, bool enabled)
            => _keyValueService.SetValue(EnabledKey(alias), enabled ? "true" : "false");

        public string? GetSettings(string alias)
            => _keyValueService.GetValue(SettingsKey(alias));

        public void SaveSettings(string alias, string json)
            => _keyValueService.SetValue(SettingsKey(alias), json);

        private static string EnabledKey(string alias) => $"PowerToys.{alias}.Enabled";

        private static string SettingsKey(string alias) => $"PowerToys.{alias}.Settings";
    }
}
