using System.Reflection;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PowerToys.Controllers
{
    // Exposes the running PowerToys package version, shown in the dashboard footer - power
    // users only, since the dashboard itself only appears in the Settings section.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToysVersionController : PowerToysAuthControllerBase
    {
        [HttpGet("version")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string GetVersion() =>
            typeof(PowerToysVersionController).Assembly
                .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
                ?? typeof(PowerToysVersionController).Assembly.GetName().Version?.ToString()
                ?? string.Empty;
    }
}
