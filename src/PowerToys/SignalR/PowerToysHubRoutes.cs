using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Services;

namespace PowerToys.SignalR;

// Maps the hub next to Umbraco's own backoffice hubs. SignalRRoutesBase applies
// Umbraco's SignalR settings, so ClientShouldSkipNegotiation covers our hub too.
internal class PowerToysHubRoutes : SignalRRoutesBase
{
    public const string HubPath = "/powertoys/hub";

    public PowerToysHubRoutes(IRuntimeState runtimeState, IOptions<SignalRSettings> signalRSettings)
        : base(runtimeState, signalRSettings)
    {
    }

    public void CreateRoutes(IEndpointRouteBuilder endpoints)
    {
        if (RuntimeState.Level is RuntimeLevel.Install or RuntimeLevel.Upgrade or RuntimeLevel.Upgrading or RuntimeLevel.Run)
        {
            endpoints.MapHub<PowerToysHub>(
                Umbraco.Cms.Core.Constants.System.UmbracoPathSegment + HubPath,
                ConfigureHubEndpoint);
        }
    }
}
