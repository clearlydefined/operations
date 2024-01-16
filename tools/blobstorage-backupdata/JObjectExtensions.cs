namespace BackupData;

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
}