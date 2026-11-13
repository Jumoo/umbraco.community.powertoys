using Microsoft.Extensions.Options;

using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Manifest;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Infrastructure.Manifest;

using PowerToys.PowerToy.LoginCustomizer;
using PowerToys.Services;

namespace PowerToys
{
    // Registers the backoffice package manifest in code instead of via Client/public/umbraco-package.json,
    // so the entry point stays in one place with the rest of the package's constants.
    public class PowerToysPackageManifestReader : IPackageManifestReader
    {
        private readonly IPowerToyService _powerToyService;
        private readonly IOptions<GlobalSettings> _globalSettings;

        public PowerToysPackageManifestReader(IPowerToyService powerToyService, IOptions<GlobalSettings> globalSettings)
        {
            _powerToyService = powerToyService;
            _globalSettings = globalSettings;
        }

        public Task<IEnumerable<PackageManifest>> ReadPackageManifestsAsync()
        {
            var manifest = new PackageManifest
            {
                Id = Constants.PackageId,
                Name = Constants.PackageName,
                Version = Constants.PackageVersion,
                Extensions =
                [
                    new
                    {
                        name = "Power Toys Bundle",
                        alias = "PowerToys.Bundle",
                        type = "bundle",
                        js = WebPath.Combine(Constants.PluginPath, "power-toys.js"),
                    },
                ],
            };

            var manifests = new List<PackageManifest> { manifest };

            var loginCustomizerManifest = BuildLoginCustomizerPublicManifest();
            if (loginCustomizerManifest is not null) manifests.Add(loginCustomizerManifest);

            return Task.FromResult<IEnumerable<PackageManifest>>(manifests);
        }

        // Public (anonymous-reachable) extensions for the login screen - custom CSS, the message,
        // and greeting overrides. Only returned when the power toy is enabled, and only the pieces that are
        // actually configured - see LoginCustomizerSettings.GetSettings.
        private PackageManifest? BuildLoginCustomizerPublicManifest()
        {
            var settings = LoginCustomizerSettings.GetSettings(_powerToyService);
            if (settings is null) return null;

            var extensions = new List<object>();

            if (!string.IsNullOrWhiteSpace(settings.CustomCss) || !string.IsNullOrWhiteSpace(settings.EffectiveMessage))
            {
                extensions.Add(new
                {
                    type = "appEntryPoint",
                    alias = "PowerToys.LoginCustomizer.Login",
                    name = "Login Customizer Login Screen",
                    js = "/umbraco/powertoys/login-customizer/login.js",
                });
            }

            var auth = new Dictionary<string, string>();
            for (var day = 0; day < settings.Greetings.Length; day++)
            {
                var greeting = settings.Greetings[day];
                if (!string.IsNullOrWhiteSpace(greeting))
                    auth[$"greeting{day}"] = greeting;
            }

            if (auth.Count > 0)
            {
                // The login screen uses the site's default UI language, so the greetings are
                // registered for that as well as en-US, Umbraco's default.
                var cultures = new[] { "en-US", _globalSettings.Value.DefaultUILanguage }
                    .Where(culture => !string.IsNullOrWhiteSpace(culture))
                    .Distinct(StringComparer.OrdinalIgnoreCase);

                foreach (var culture in cultures)
                {
                    extensions.Add(new
                    {
                        type = "localization",
                        alias = $"PowerToys.LoginCustomizer.Localization.{culture}",
                        name = $"Login Customizer Localization ({culture})",
                        meta = new
                        {
                            culture,
                            localizations = new { auth },
                        },
                    });
                }
            }

            if (extensions.Count == 0) return null;

            return new PackageManifest
            {
                Id = $"{Constants.PackageId}.LoginCustomizer",
                Name = "Login Customizer",
                Version = Constants.PackageVersion,
                AllowPublicAccess = true,
                Extensions = extensions.ToArray(),
            };
        }
    }
}
