using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Routing;

namespace PowerToys.Controllers
{
    // Base for power toy endpoints any logged-in backoffice user needs to hit - e.g. so a power
    // toy's client-side behaviour (whether it renders, what its settings are) still works for
    // users who aren't power users. Endpoints that should be locked to the Settings section
    // belong on PowerToysAuthControllerBase instead.
    [ApiController]
    [BackOfficeRoute("powertoys/api/v{version:apiVersion}")]
    [Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    [MapToApi(Constants.ApiName)]
    public class PowerToysControllerBase : ControllerBase
    {
    }
}
