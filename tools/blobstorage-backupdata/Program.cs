namespace BackupData;

using Azure.Storage.Blobs;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;
using System.Text;
using Newtonsoft.Json.Linq;

internal sealed class Program
{
    private static readonly object LockObject = new ();
    private static int counter;
    private static string[] existingIndex;
    private const string DateTimeFormat = "yyyy-MM-dd-HH";
    private const int BatchSize = 10000;
    private const string UpdatedFieldName = "_meta.updated";
    private const string MetaFieldName = "_meta";

    internal static async Task Main(string[] args)
    {
        var connections = GetConnections(args);
        existingIndex = await GetIndex(connections.blobContainerClient);
        var changesIndex = new SortedDictionary<string, List<string>>();

        var cursor = await connections.mongoClient
            .GetDatabase("clearlydefined")
            .GetCollection<BsonDocument>("definitions-trimmed")
            .FindAsync(
                existingIndex.Length > 0 ? Builders<BsonDocument>.Filter.Exists(MetaFieldName)
                                           & Builders<BsonDocument>.Filter.Gte(
                                               UpdatedFieldName,
                                               new BsonDateTime(DateTime.ParseExact(existingIndex[^1], DateTimeFormat, null))
                                                   .ToString())
                    : Builders<BsonDocument>.Filter.Exists(MetaFieldName),
                new FindOptions<BsonDocument>
            {
                BatchSize = BatchSize,
                NoCursorTimeout = false,
                Projection = Builders<BsonDocument>.Projection
                    .Exclude("_mongo")
                    .Exclude("files")
                    .Exclude("coordinates"),
                Sort = Builders<BsonDocument>.Sort.Ascending(UpdatedFieldName)
                });

        await SaveData(cursor, connections, changesIndex);
    }

    private static async Task SaveData(
        IAsyncCursor<BsonDocument> cursor,
        (BlobContainerClient blobContainerClient, MongoClient mongoClient) connections,
        SortedDictionary<string, List<string>> changesIndex)
    {
        while (await cursor.MoveNextAsync())
        {
            await Parallel.ForEachAsync(cursor.Current, async (document, _) =>
            {
                try
                {
                    if (JsonConvert.DeserializeObject(document.ToString()) is not JObject jObject)
                    {
                        return;
                    }
                    var blobName = jObject.GetBlobName();

                    if (string.IsNullOrWhiteSpace(blobName))
                    {
                        return;
                    }
                    if (!await UploadString(
                            connections.blobContainerClient,
                            jObject.ToString(),
                            blobName))
                    {
                        return;
                    }
                    
                    AddChangesToIndex(changesIndex, jObject, blobName);
                }
                catch
                {
                    // ignored
                }
            });

            if (changesIndex.Count > 0)
            {
                Console.WriteLine($"{counter} have been saved to the blob storage.");
                await SaveIndexToBlobStorage(
                    connections.blobContainerClient,
                    changesIndex);
            }
        }
    }

    private static void AddChangesToIndex(
        SortedDictionary<string, List<string>> changesIndex,
        JObject jObject,
        string blobName)
    {
        var keyDate = jObject.GetDateTime().ToString(DateTimeFormat);

        lock (LockObject)
        {
            counter++;
            if (!changesIndex.ContainsKey(keyDate))
            {
                changesIndex[keyDate] = new List<string>();
            }

            changesIndex[keyDate].Add(blobName);
        }
    }

    private static async Task SaveIndexToBlobStorage(
        BlobContainerClient blobContainerClient,
        SortedDictionary<string, List<string>> changesIndex)
    {
        await Parallel.ForEachAsync(changesIndex, async (kv, _) =>
        {
            await UploadString(
                blobContainerClient,
                string.Join(Environment.NewLine, kv.Value),
                $"changes/{kv.Key}");
        });

        await UploadString(
            blobContainerClient,
            string.Join(Environment.NewLine, existingIndex.Union(changesIndex.Keys)),
            "changes/index");
    }

    private static async Task<bool> UploadString(
        BlobContainerClient blobContainerClient,
        string blobContent,
        string blobName)
    {
        try
        {
            var blobClient = blobContainerClient.GetBlobClient(blobName);
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(blobContent));
            await blobClient.UploadAsync(stream, overwrite:true);
            return true;
        }
        catch
        {
            // ignored
        }

        return false;
    }

    private static async Task<string[]> GetIndex(BlobContainerClient blobContainerClient)
    {
        try
        {
            var blobClient = blobContainerClient.GetBlobClient("changes/index");
            return (await blobClient.DownloadContentAsync()).Value.Content.ToString()
                .Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        }
        catch
        {
            // ignored
        }

        return new List<string>().ToArray();
    }

    private static (BlobContainerClient blobContainerClient, MongoClient mongoClient) 
        GetConnections(string[] args)
    {
        var client = new MongoClient(args[0]);

        var blobServiceClient = new BlobServiceClient(args[1]);
        var blobContainerClient = blobServiceClient.GetBlobContainerClient("definitions-snapshots");

        return (blobContainerClient, client);
    }
}
