using Asp.Versioning;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PowerToys.Controllers
{
    // Exposes host environment information (e.g. EnvironmentName) to logged-in backoffice users
    // so power toys like Environment Indicator can match against it.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class EnvironmentController : PowerToysControllerBase
    {
        private readonly IWebHostEnvironment _webHostEnvironment;

        public EnvironmentController(IWebHostEnvironment webHostEnvironment)
        {
            _webHostEnvironment = webHostEnvironment;
        }

        [HttpGet("environment")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string GetEnvironmentName() => _webHostEnvironment.EnvironmentName;
    }
}
