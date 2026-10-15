using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Web.Common.ApplicationBuilder;

namespace PowerToys.SignalR;

internal class PowerToysHubFilter : UmbracoPipelineFilter
{
    public PowerToysHubFilter() : base(nameof(PowerToysHub))
    {
        Endpoints = app =>
        {
            app.UseEndpoints(endpoints =>
            {
                app.ApplicationServices
                    .GetRequiredService<PowerToysHubRoutes>()
                    .CreateRoutes(endpoints);
            });
        };
    }
}
