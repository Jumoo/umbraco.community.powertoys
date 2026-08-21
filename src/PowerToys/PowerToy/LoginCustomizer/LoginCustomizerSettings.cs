using System.Text.Json;

using PowerToys.Services;

namespace PowerToys.PowerToy.LoginCustomizer
{
    /// <summary>
    ///     The Login Customizer power toy's settings, as saved via the generic settings endpoint.
    /// </summary>
    internal sealed class LoginCustomizerSettings
    {
        public const string PowerToyAlias = "PowerToys.PowerToy.LoginCustomizer";

        public string? BackgroundImage { get; set; }

        public string? LogoImage { get; set; }

        public string? LogoImageAlternative { get; set; }

        public bool AllowPasswordReset { get; set; } = true;

        public string? CustomCss { get; set; }

        public string? Instruction { get; set; }

        /// <summary>
        ///     Login screen greeting overrides, index 0 = Sunday ... 6 = Saturday.
        /// </summary>
        public string?[] Greetings { get; set; } = new string?[7];

        /// <summary>
        ///     Reads the power toy's saved settings, or null if it's disabled or has none saved yet.
        /// </summary>
        public static LoginCustomizerSettings? GetSettings(IPowerToyService powerToyService)
        {
            if (!powerToyService.IsEnabled(PowerToyAlias)) return null;

            var json = powerToyService.GetSettings(PowerToyAlias);
            if (string.IsNullOrWhiteSpace(json)) return null;

            return JsonSerializer.Deserialize<LoginCustomizerSettings>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });
        }
    }
}
