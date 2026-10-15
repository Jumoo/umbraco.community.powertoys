using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using PowerToys.Services;

namespace PowerToys.Controllers
{
    // Puts a power toy's endpoints behind its enabled flag - a turned off power toy answers
    // 404, as if it wasn't installed.
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class PowerToyEnabledAttribute : ActionFilterAttribute
    {
        public PowerToyEnabledAttribute(string alias)
        {
            Alias = alias;
        }

        public string Alias { get; }

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var powerToyService = context.HttpContext.RequestServices.GetRequiredService<IPowerToyService>();
            if (!powerToyService.IsEnabled(Alias))
            {
                context.Result = new NotFoundResult();
            }
        }
    }
}
