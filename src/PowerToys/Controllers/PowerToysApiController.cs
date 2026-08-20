using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace PowerToys.Controllers
{
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class PowerToysApiController : PowerToysApiControllerBase
    {
        [HttpGet("ping")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string Ping() => "Pong";
    }
}
