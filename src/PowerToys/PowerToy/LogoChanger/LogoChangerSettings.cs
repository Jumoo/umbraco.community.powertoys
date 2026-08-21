using System.Text.Json;

using PowerToys.Services;

namespace PowerToys.PowerToy.LogoChanger
{
    /// <summary>
    ///     The Logo Changer power toy's settings, as saved via the generic settings endpoint.
    /// </summary>
    internal sealed class LogoChangerSettings
    {
        public const string PowerToyAlias = "PowerToys.PowerToy.LogoChanger";

        public string? Logo { get; set; }

        public string? LogoAlternative { get; set; }

        /// <summary>
        ///     Reads the power toy's saved settings, or null if it's disabled or has none saved yet.
        /// </summary>
        public static LogoChangerSettings? GetSettings(IPowerToyService powerToyService)
        {
            if (!powerToyService.IsEnabled(PowerToyAlias)) return null;

            var json = powerToyService.GetSettings(PowerToyAlias);
            if (string.IsNullOrWhiteSpace(json)) return null;

            return JsonSerializer.Deserialize<LogoChangerSettings>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });
        }
    }
}
