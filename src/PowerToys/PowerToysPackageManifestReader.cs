using Umbraco.Cms.Core.Manifest;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Infrastructure.Manifest;

namespace PowerToys
{
    // Registers the backoffice package manifest in code instead of via Client/public/umbraco-package.json,
    // so the entry point stays in one place with the rest of the package's constants.
    public class PowerToysPackageManifestReader : IPackageManifestReader
    {
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

            return Task.FromResult<IEnumerable<PackageManifest>>([manifest]);
        }
    }
}
