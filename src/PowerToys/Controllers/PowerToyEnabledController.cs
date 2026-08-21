using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PowerToys.Services;
using Umbraco.Cms.Web.Common.Authorization;

namespace PowerToys.Controllers
{
    // Whether a power toy is enabled - readable by any logged-in backoffice user (so a toy's
    // client-side behaviour still works for non-power users), writable only by power users.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToyEnabledController : PowerToysControllerBase
    {
        private readonly IPowerToyService _powerToyService;

        public PowerToyEnabledController(IPowerToyService powerToyService)
        {
            _powerToyService = powerToyService;
        }

        [HttpGet("{alias}/enabled")]
        [ProducesResponseType<bool>(StatusCodes.Status200OK)]
        public bool GetEnabled(string alias) => _powerToyService.IsEnabled(alias);

        [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
        [HttpPut("{alias}/enabled")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SetEnabled(string alias, [FromBody] bool enabled)
        {
            _powerToyService.SetEnabled(alias, enabled);
            return Ok();
        }
    }
}
