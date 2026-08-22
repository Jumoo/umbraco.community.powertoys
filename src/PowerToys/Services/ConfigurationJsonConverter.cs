using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;

namespace PowerToys.Services
{
    /// <summary>
    ///     Turns an appsettings.json section back into the JSON blob shape a power toy's settings
    ///     endpoint already returns, so an appsettings override is indistinguishable from a saved
    ///     one to everything downstream that deserializes it into a settings type.
    /// </summary>
    internal static class ConfigurationJsonConverter
    {
        public static string ToJson(IConfigurationSection section, params string[] excludeRootKeys)
        {
            var node = ToNode(section, excludeRootKeys);
            return node?.ToJsonString() ?? "null";
        }

        private static JsonNode? ToNode(IConfigurationSection section, IReadOnlyCollection<string>? excludeKeys)
        {
            var children = section.GetChildren().ToList();

            if (children.Count == 0)
            {
                return section.Value is null ? null : JsonValue.Create(section.Value);
            }

            if (IsArray(children))
            {
                var array = new JsonArray();
                foreach (var child in children.OrderBy(c => int.Parse(c.Key)))
                {
                    array.Add(ToNode(child, null));
                }

                return array;
            }

            var obj = new JsonObject();
            foreach (var child in children)
            {
                if (excludeKeys?.Contains(child.Key) == true) continue;
                obj[child.Key] = ToNode(child, null);
            }

            return obj;
        }

        // Configuration represents a JSON array as an object whose keys are "0", "1", "2"...
        private static bool IsArray(IReadOnlyList<IConfigurationSection> children)
        {
            for (var i = 0; i < children.Count; i++)
            {
                if (children[i].Key != i.ToString()) return false;
            }

            return true;
        }
    }
}
