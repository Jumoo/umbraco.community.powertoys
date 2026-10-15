using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.DependencyInjection;

namespace PowerToys.SignalR;

public static class PowerToysHubExtensions
{
    public static IUmbracoBuilder AddPowerToysHub(this IUmbracoBuilder builder)
    {
        builder.Services.AddSignalR();
        builder.Services.AddSingleton<PowerToysHubRoutes>();
        builder.Services.AddSingleton<HubConnections>();
        builder.Services.ConfigureOptions<ConfigureHubOptions>();

        return builder;
    }
}
