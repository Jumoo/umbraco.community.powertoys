using Microsoft.AspNetCore.Authorization;
using Umbraco.Cms.Web.Common.Authorization;

namespace PowerToys.Controllers
{
    // Base for power toy endpoints that require Settings section access - power toys live in the
    // Settings section, so managing or configuring them requires access to it. Endpoints any
    // logged-in backoffice user should be able to hit belong on PowerToysControllerBase instead.
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public class PowerToysAuthControllerBase : PowerToysControllerBase
    {
    }
}
