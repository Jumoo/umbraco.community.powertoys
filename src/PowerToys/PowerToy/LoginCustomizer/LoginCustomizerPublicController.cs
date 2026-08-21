using System.Text.Json;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using PowerToys.Services;

namespace PowerToys.PowerToy.LoginCustomizer
{
    /// <summary>
    ///     Serves the Login Customizer's custom CSS as a small injection script, anonymously - the
    ///     login screen has no auth context, so this deliberately sits outside PowerToysApiControllerBase
    ///     (which requires backoffice auth) rather than reusing the generic settings endpoint.
    ///     Registered as a public "appEntryPoint" manifest by PowerToysPackageManifestReader.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [Route("umbraco/powertoys/login-customizer")]
    public class LoginCustomizerPublicController : ControllerBase
    {
        private readonly IPowerToyService _powerToyService;

        public LoginCustomizerPublicController(IPowerToyService powerToyService)
        {
            _powerToyService = powerToyService;
        }

        [HttpGet("style.js")]
        public IActionResult Style()
        {
            var css = LoginCustomizerSettings.GetSettings(_powerToyService)?.CustomCss ?? string.Empty;

            var js = string.IsNullOrWhiteSpace(css)
                ? "// no custom login CSS configured"
                : $"(function(){{var s=document.createElement('style');s.textContent={JsonSerializer.Serialize(css)};document.head.appendChild(s);}})();";

            return Content(js, "application/javascript");
        }
    }
}
