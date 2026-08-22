using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PowerToys.Services;
using Umbraco.Cms.Web.Common.Authorization;

namespace PowerToys.Controllers
{
    // A power toy's own settings - readable by any logged-in backoffice user (so a toy's
    // client-side behaviour still works for non-power users), writable only by power users.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToySettingsController : PowerToysControllerBase
    {
        private readonly IPowerToyService _powerToyService;

        public PowerToySettingsController(IPowerToyService powerToyService)
        {
            _powerToyService = powerToyService;
        }

        [HttpGet("{alias}/settings")]
        [ProducesResponseType<JsonElement?>(StatusCodes.Status200OK)]
        public JsonElement? GetSettings(string alias)
        {
            var json = _powerToyService.GetSettings(alias);
            return json is null ? null : JsonDocument.Parse(json).RootElement;
        }

        [HttpGet("{alias}/settings/locked")]
        [ProducesResponseType<bool>(StatusCodes.Status200OK)]
        public bool GetSettingsLocked(string alias) => _powerToyService.IsSettingsLocked(alias);

        [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
        [HttpPut("{alias}/settings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public IActionResult SaveSettings(string alias, [FromBody] JsonElement settings)
        {
            try
            {
                _powerToyService.SaveSettings(alias, settings.GetRawText());
            }
            catch (PowerToySettingsLockedException ex)
            {
                return Conflict(ex.Message);
            }

            return Ok();
        }
    }
}
