using Umbraco.Cms.Core;
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
        private readonly IRuntimeState _runtimeState;

        public PowerToyService(IKeyValueService keyValueService, IRuntimeState runtimeState)
        {
            _keyValueService = keyValueService;
            _runtimeState = runtimeState;
        }

        public bool IsEnabled(string alias)
            => IsRunning && _keyValueService.GetValue(EnabledKey(alias)) == "true";

        public void SetEnabled(string alias, bool enabled)
            => _keyValueService.SetValue(EnabledKey(alias), enabled ? "true" : "false");

        public string? GetSettings(string alias)
            => IsRunning ? _keyValueService.GetValue(SettingsKey(alias)) : null;

        public void SaveSettings(string alias, string json)
            => _keyValueService.SetValue(SettingsKey(alias), json);

        public IReadOnlyDictionary<string, string?> GetBackup()
            => _keyValueService.FindByKeyPrefix(KeyPrefix) ?? new Dictionary<string, string?>();

        /// <summary>
        ///     Whether the site has finished booting into normal operation - the database isn't
        ///     available to read from before then (e.g. on a brand new, unconfigured site).
        /// </summary>
        private bool IsRunning => _runtimeState.Level == RuntimeLevel.Run;

        public void RestoreBackup(IReadOnlyDictionary<string, string?> values)
        {
            foreach (var (key, value) in values)
            {
                if (!key.StartsWith(KeyPrefix, StringComparison.Ordinal) || value is null)
                {
                    continue;
                }

                _keyValueService.SetValue(key, value);
            }
        }

        private const string KeyPrefix = "PowerToys.";

        private static string EnabledKey(string alias) => $"PowerToys.{alias}.Enabled";

        private static string SettingsKey(string alias) => $"PowerToys.{alias}.Settings";
    }
}
