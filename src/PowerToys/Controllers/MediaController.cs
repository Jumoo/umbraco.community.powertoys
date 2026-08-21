using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Umbraco.Cms.Core.Routing;

namespace PowerToys.Controllers
{
    /// <summary>
    ///     Resolves a picked media item's key to its public URL server-side - useful whenever a
    ///     power toy's settings want to store a path (e.g. Login Customizer's login images) but
    ///     let the user pick it via a media picker rather than typing the path by hand.
    /// </summary>
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "PowerToys")]
    public class MediaController : PowerToysAuthControllerBase
    {
        private readonly IPublishedUrlProvider _publishedUrlProvider;

        public MediaController(IPublishedUrlProvider publishedUrlProvider)
        {
            _publishedUrlProvider = publishedUrlProvider;
        }

        [HttpGet("media/{id:guid}/url")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult GetUrl(Guid id)
        {
            var url = _publishedUrlProvider.GetMediaUrl(id);
            return string.IsNullOrEmpty(url) ? NotFound() : Ok(url);
        }
    }
}
