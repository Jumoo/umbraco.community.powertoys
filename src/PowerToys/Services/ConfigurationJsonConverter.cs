using System.Globalization;
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
                return ToLeafNode(section.Value);
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

        // Configuration stores every leaf value as a plain string (a JSON `true` becomes the
        // string "True"), so a bool/number has to be sniffed back out rather than round-tripped
        // as a string, or a settings type expecting a real bool/number fails to deserialize.
        private static JsonNode? ToLeafNode(string? value)
        {
            if (value is null) return null;
            if (bool.TryParse(value, out var boolValue)) return JsonValue.Create(boolValue);
            if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longValue)) return JsonValue.Create(longValue);
            if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var doubleValue)) return JsonValue.Create(doubleValue);
            return JsonValue.Create(value);
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
