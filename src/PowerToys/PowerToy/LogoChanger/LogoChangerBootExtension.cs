using Microsoft.Extensions.DependencyInjection;

using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;

using PowerToys.Services;

namespace PowerToys.PowerToy.LogoChanger
{
    /// <summary>
    ///     Applies the Logo Changer power toy's saved settings on top of Umbraco's own
    ///     backoffice logo options at boot - the same PostConfigure trick used by the
    ///     Login Customizer power toy.
    /// </summary>
    internal static class LogoChangerBootExtension
    {
        /// <summary>
        ///     Add the Logo Changer's PostConfigure hook to Umbraco.
        /// </summary>
        public static IUmbracoBuilder AddLogoChanger(this IUmbracoBuilder builder)
        {
            builder.Services.AddOptions<ContentSettings>().PostConfigure<IPowerToyService>((settings, powerToyService) =>
            {
                var logoSettings = LogoChangerSettings.GetSettings(powerToyService);
                if (logoSettings is null) return;

                if (!string.IsNullOrWhiteSpace(logoSettings.Logo))
                    settings.BackOfficeLogo = logoSettings.Logo;

                if (!string.IsNullOrWhiteSpace(logoSettings.LogoAlternative))
                    settings.BackOfficeLogoAlternative = logoSettings.LogoAlternative;
            });

            return builder;
        }
    }
}
