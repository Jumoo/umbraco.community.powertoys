using System.Linq;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PowerToys.Services;

namespace PowerToys.Controllers
{
    // Exports/imports every power toy's enabled flag and settings in one go - power users only,
    // since restoring overwrites whatever every power toy currently has configured.
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToysBackupController : PowerToysAuthControllerBase
    {
        private readonly IPowerToyService _powerToyService;

        public PowerToysBackupController(IPowerToyService powerToyService)
        {
            _powerToyService = powerToyService;
        }

        [HttpGet("backup")]
        [ProducesResponseType<Dictionary<string, string>>(StatusCodes.Status200OK)]
        public IReadOnlyDictionary<string, string?> GetBackup() => _powerToyService.GetBackup();

        [HttpPost("backup")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult RestoreBackup([FromBody] Dictionary<string, string> values)
        {
            _powerToyService.RestoreBackup(values.ToDictionary(kv => kv.Key, kv => (string?)kv.Value));
            return Ok();
        }
    }
}
