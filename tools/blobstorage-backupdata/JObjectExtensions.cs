namespace BackupData;

using System.Web;
using Newtonsoft.Json.Linq;

internal static class JObjectExtensions
{
    /// <summary>
    /// Gets the name of the blob.
    /// </summary>
    /// <param name="jObject">Json object extension param.</param>
    /// <returns>returns the blob name.</returns>
    internal static string GetBlobName(this JObject jObject)
    {
        return jObject["_id"] == null
            ? string.Empty : $"{jObject["_id"]?.ToString().ToLower().Trim()}.json";
    }

    /// <summary>
    /// Gets the datetime from _meta.updated field.
    /// </summary>
    /// <param name="jObject">Json object extension param.</param>
    /// <returns>returns the updated datetime from the meta field</returns>
    internal static DateTime GetDateTime(this JObject jObject)
    {
        return DateTime.Parse(jObject["_meta"]?["updated"]?.ToString()!);
    }

    /// <summary>
    /// Gets the blob definition url.
    /// </summary>
    /// <param name="jObject">Json object extension param.</param>
    /// <returns>returns the constructed definition url from the coordinates field</returns>
    internal static string ConstructBlobUrl(this JObject jObject)
    {
        if (jObject?["coordinates"]?.Type == null || jObject["coordinates"]!.Type == JTokenType.Null)
        {
            return string.Empty;
        }

        var defaultNamespace = (jObject["coordinates"]?["namespace"]?.ToString() ?? "") == "" ? "-"
                                : jObject["coordinates"]?["namespace"]?.ToString();

        var type = HttpUtility.UrlEncode(jObject["coordinates"]?["type"]?.ToString().Trim());
        var provider = HttpUtility.UrlEncode(jObject["coordinates"]?["provider"]?.ToString().Trim());
        var namespaceName = HttpUtility.UrlEncode(defaultNamespace!.Trim());
        var name = HttpUtility.UrlEncode(jObject["coordinates"]?["name"]?.ToString().Trim());
        var revision = HttpUtility.UrlEncode(jObject["coordinates"]?["revision"]?.ToString().Trim());

        if (string.IsNullOrEmpty(type) ||
            string.IsNullOrEmpty(provider) ||
            string.IsNullOrEmpty(namespaceName) ||
            string.IsNullOrEmpty(name) ||
            string.IsNullOrEmpty(revision))
        {
            return string.Empty;
        }

        var constructedUrl = $"{type}/{provider}/{namespaceName}/{name}/revision/{revision}.json".ToLower();

        return constructedUrl;
    }
}