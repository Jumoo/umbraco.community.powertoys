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

        /// <summary>
        ///     Plain text shown under the login screen's greeting, e.g. who to contact for help.
        /// </summary>
        public string? Message { get; set; }

        /// <summary>
        ///     The message's old name. It was saved as Umbraco's <c>auth_instruction</c> text,
        ///     which the v17 login screen no longer shows, so it's read as the message instead.
        /// </summary>
        public string? Instruction { get; set; }

        /// <summary>
        ///     The message to show: <see cref="Message" />, or the old <see cref="Instruction" />
        ///     when the settings haven't been saved since the rename.
        /// </summary>
        public string? EffectiveMessage =>
            string.IsNullOrWhiteSpace(Message) ? Instruction : Message;

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
