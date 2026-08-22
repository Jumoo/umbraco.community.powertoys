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

        [HttpGet("{alias}/enabled/locked")]
        [ProducesResponseType<bool>(StatusCodes.Status200OK)]
        public bool GetEnabledLocked(string alias) => _powerToyService.IsEnabledLocked(alias);

        [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
        [HttpPut("{alias}/enabled")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public IActionResult SetEnabled(string alias, [FromBody] bool enabled)
        {
            try
            {
                _powerToyService.SetEnabled(alias, enabled);
            }
            catch (PowerToySettingsLockedException ex)
            {
                return Conflict(ex.Message);
            }

            return Ok();
        }
    }
}
