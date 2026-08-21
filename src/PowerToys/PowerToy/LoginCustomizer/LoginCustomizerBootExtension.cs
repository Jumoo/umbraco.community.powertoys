using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;

using PowerToys.Services;

namespace PowerToys.PowerToy.LoginCustomizer
{
    /// <summary>
    ///     Applies the Login Customizer power toy's saved settings on top of Umbraco's own
    ///     login-screen options at boot - the same PostConfigure trick uSync uses for
    ///     GlobalSettings.NoNodesViewPath.
    /// </summary>
    internal static class LoginCustomizerBootExtension
    {
        /// <summary>
        ///     Add the Login Customizer's PostConfigure hooks to Umbraco.
        /// </summary>
        public static IUmbracoBuilder AddLoginCustomizer(this IUmbracoBuilder builder)
        {
            builder.Services.AddOptions<ContentSettings>().PostConfigure<IPowerToyService>((settings, powerToyService) =>
            {
                var loginSettings = LoginCustomizerSettings.GetSettings(powerToyService);
                if (loginSettings is null) return;

                if (!string.IsNullOrWhiteSpace(loginSettings.BackgroundImage))
                    settings.LoginBackgroundImage = loginSettings.BackgroundImage;

                if (!string.IsNullOrWhiteSpace(loginSettings.LogoImage))
                    settings.LoginLogoImage = loginSettings.LogoImage;

                if (!string.IsNullOrWhiteSpace(loginSettings.LogoImageAlternative))
                    settings.LoginLogoImageAlternative = loginSettings.LogoImageAlternative;
            });

            builder.Services.AddOptions<SecuritySettings>().PostConfigure<IPowerToyService>((settings, powerToyService) =>
            {
                var loginSettings = LoginCustomizerSettings.GetSettings(powerToyService);
                if (loginSettings is not null)
                    settings.AllowPasswordReset = loginSettings.AllowPasswordReset;
            });

            return builder;
        }
    }
}
