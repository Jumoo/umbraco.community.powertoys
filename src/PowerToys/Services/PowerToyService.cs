using Microsoft.Extensions.Configuration;
using System.Linq;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;

namespace PowerToys.Services
{
    /// <summary>
    ///     Stores per-power-toy state (enabled flag, settings) in Umbraco's key/value store,
    ///     so it's shared across users/devices instead of living in browser localStorage - unless
    ///     an appsettings.json "PowerToys:{Name}" section overrides it, in which case that value
    ///     is used instead and the key/value store is never written to for it.
    /// </summary>
    public class PowerToyService : IPowerToyService
    {
        private readonly IKeyValueService _keyValueService;
        private readonly IRuntimeState _runtimeState;
        private readonly IConfiguration _configuration;

        public PowerToyService(IKeyValueService keyValueService, IRuntimeState runtimeState, IConfiguration configuration)
        {
            _keyValueService = keyValueService;
            _runtimeState = runtimeState;
            _configuration = configuration;
        }

        public bool IsEnabled(string alias)
        {
            if (IsEnabledLocked(alias))
            {
                return ConfigurationSection(alias).GetValue<bool>("Enabled");
            }

            return IsRunning && _keyValueService.GetValue(EnabledKey(alias)) == "true";
        }

        public void SetEnabled(string alias, bool enabled)
        {
            if (IsEnabledLocked(alias)) throw new PowerToySettingsLockedException(alias);

            _keyValueService.SetValue(EnabledKey(alias), enabled ? "true" : "false");
        }

        public bool IsEnabledLocked(string alias)
            => ConfigurationSection(alias).GetSection("Enabled").Exists();

        public string? GetSettings(string alias)
        {
            if (IsSettingsLocked(alias))
            {
                return ConfigurationJsonConverter.ToJson(ConfigurationSection(alias), "Enabled");
            }

            return IsRunning ? _keyValueService.GetValue(SettingsKey(alias)) : null;
        }

        public void SaveSettings(string alias, string json)
        {
            if (IsSettingsLocked(alias)) throw new PowerToySettingsLockedException(alias);

            _keyValueService.SetValue(SettingsKey(alias), json);
        }

        public bool IsSettingsLocked(string alias)
            => ConfigurationSection(alias).GetChildren().Any(child => child.Key != "Enabled");

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

        // Aliases are "PowerToys.PowerToy.{Name}" - appsettings just needs the short name,
        // nested under a "PowerToys" section, e.g. PowerToys:EnvironmentIndicator:Enabled.
        private IConfigurationSection ConfigurationSection(string alias)
            => _configuration.GetSection($"PowerToys:{ShortAlias(alias)}");

        private static string ShortAlias(string alias) => alias[(alias.LastIndexOf('.') + 1)..];
    }
}
