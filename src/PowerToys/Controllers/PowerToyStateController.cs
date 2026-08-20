using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PowerToys.Services;

namespace PowerToys.Controllers
{
    // Shared "does any power toy need to know if it's enabled, or read/write its own settings"
    // endpoints, so individual power toys don't each have to build this themselves.
    // Inherits the SectionAccessSettings authorization policy from PowerToysApiControllerBase -
    // power toys live in the Settings section, so hitting this API requires access to it.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToyStateController : PowerToysApiControllerBase
    {
        private readonly IPowerToyService _powerToyService;

        public PowerToyStateController(IPowerToyService powerToyService)
        {
            _powerToyService = powerToyService;
        }

        [HttpGet("{alias}/enabled")]
        [ProducesResponseType<bool>(StatusCodes.Status200OK)]
        public bool GetEnabled(string alias) => _powerToyService.IsEnabled(alias);

        [HttpPut("{alias}/enabled")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SetEnabled(string alias, [FromBody] bool enabled)
        {
            _powerToyService.SetEnabled(alias, enabled);
            return Ok();
        }

        [HttpGet("{alias}/settings")]
        [ProducesResponseType<JsonElement?>(StatusCodes.Status200OK)]
        public JsonElement? GetSettings(string alias)
        {
            var json = _powerToyService.GetSettings(alias);
            return json is null ? null : JsonDocument.Parse(json).RootElement;
        }

        [HttpPut("{alias}/settings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult SaveSettings(string alias, [FromBody] JsonElement settings)
        {
            _powerToyService.SaveSettings(alias, settings.GetRawText());
            return Ok();
        }
    }
}
