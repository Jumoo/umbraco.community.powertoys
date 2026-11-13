using System.Text.Json;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using PowerToys.Services;

namespace PowerToys.PowerToy.LoginCustomizer
{
    /// <summary>
    ///     Serves the login screen's script: the Login Customizer's custom CSS and message.
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

        // style.js is the script's old name, still answered for manifests cached before the rename
        [HttpGet("login.js")]
        [HttpGet("style.js")]
        public IActionResult Login()
        {
            var settings = LoginCustomizerSettings.GetSettings(_powerToyService);
            var css = settings?.CustomCss?.Trim() ?? string.Empty;
            var message = settings?.EffectiveMessage?.Trim() ?? string.Empty;

            Response.Headers.CacheControl = "no-cache";

            if (css.Length == 0 && message.Length == 0)
                return Content("// nothing to add to the login screen", "application/javascript");

            var script = LoginScript
                .Replace("__CSS__", JsonSerializer.Serialize(css))
                .Replace("__MESSAGE__", JsonSerializer.Serialize(message));

            return Content(script, "application/javascript");
        }

        // Runs on the login screen only: the entry point also loads in the backoffice, which
        // has no <umb-auth>.
        //
        // The message goes into <umb-auth>'s own children, ahead of the login form Umbraco adds
        // there, so the login page shows it under the greeting. It's built from text nodes and
        // links, never HTML, since anyone can load this page.
        private const string LoginScript = """
            (function () {
              var auth = document.querySelector("umb-auth");
              if (!auth) return;

              var css = __CSS__;
              if (css) {
                var style = document.createElement("style");
                style.textContent = css;
                document.head.appendChild(style);
              }

              var message = __MESSAGE__;
              if (!message || document.getElementById("powertoys-login-message")) return;

              var box = document.createElement("div");
              box.id = "powertoys-login-message";
              box.style.cssText = "text-align:center;margin:0 0 var(--uui-size-space-5,15px);color:var(--uui-color-text-alt,#68676b);white-space:pre-line;";

              var link = /(https?:\/\/[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+)/g;
              var parts = message.split(link);
              for (var i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                  if (parts[i]) box.appendChild(document.createTextNode(parts[i]));
                  continue;
                }
                // Leave trailing punctuation outside the link, e.g. "help@example.com."
                var target = parts[i].replace(/[.,;:!?)]+$/, "");
                var rest = parts[i].slice(target.length);
                var a = document.createElement("a");
                a.textContent = target;
                a.href = target.indexOf("@") > 0 && target.indexOf("//") < 0 ? "mailto:" + target : target;
                if (a.protocol === "http:" || a.protocol === "https:") {
                  a.target = "_blank";
                  a.rel = "noopener noreferrer";
                }
                box.appendChild(a);
                if (rest) box.appendChild(document.createTextNode(rest));
              }

              auth.prepend(box);
            })();
            """;
    }
}
