namespace BackupData;

using System.Globalization;
using System.Text;
using Azure.Storage.Blobs;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Polly;
using Microsoft.Extensions.Logging;

internal sealed class BackupJob
{
    private readonly BlobContainerClient BlobContainerClient;
    private readonly IMongoClient MongoClient;
    private readonly DateTime Now;
    private readonly ILogger Logger;
    private readonly IFilterRenderer FilterRenderer;
    private static readonly object LockObject = new();
    private static int counter;
    private const string DateTimeFormat = "yyyy-MM-dd-HH";
    private const int BatchSize = 1000;
    private const string UpdatedFieldName = "_meta.updated";
    private const string MetaFieldName = "_meta";

    public BackupJob(BlobContainerClient blobContainerClient, IMongoClient mongoClient, DateTime now, ILoggerFactory loggerFactory, IFilterRenderer filterRenderer)
    {
        BlobContainerClient = blobContainerClient;
        MongoClient = mongoClient;
        Now = now;
        Logger = loggerFactory.CreateLogger(nameof(BackupJob));
        FilterRenderer = filterRenderer;
    }

    public async Task ProcessJob()
    {
        var existingIndex = await GetIndex();
        var changesIndex = new SortedDictionary<string, List<string>>();
        var database = MongoClient.GetDatabase("clearlydefined", null);
        var collection = database.GetCollection<BsonDocument>("definitions-trimmed");

        // lambda to enable lazy evaluation, avoiding the `IndexOutOfRangeException` exception on empty `existingIndex`
        var beginningDateFilter = () =>
            Builders<BsonDocument>.Filter.Gte(
                UpdatedFieldName,
                new BsonDateTime(
                    DateTime.SpecifyKind(
                        DateTime.ParseExact(existingIndex[^1], DateTimeFormat, null, DateTimeStyles.AdjustToUniversal),
                        DateTimeKind.Utc)).ToString());

        var beginningOfCurrentHour = new BsonDateTime(Now.Date.AddHours(Now.Hour));
        var currentDateFilter = Builders<BsonDocument>.Filter.Lt(UpdatedFieldName, beginningOfCurrentHour.ToString());
        var metaNameFilter = Builders<BsonDocument>.Filter.Exists(MetaFieldName);
        var filter = existingIndex.Length == 0 ? metaNameFilter : metaNameFilter & beginningDateFilter() & currentDateFilter;

        var findOptions = new FindOptions<BsonDocument>
        {
            BatchSize = BatchSize,
            NoCursorTimeout = false,
            Projection = Builders<BsonDocument>.Projection
                    .Exclude("_mongo")
                    .Exclude("coordinates"),
            Sort = Builders<BsonDocument>.Sort.Ascending(UpdatedFieldName)
        };

        Logger.LogInformation("Starting the backup job with filter: {Filter}", FilterRenderer.RenderFilter(filter, collection));
        var cursor = await collection.FindAsync(filter, findOptions);

        await SaveData(cursor, existingIndex, changesIndex);
    }

    private async Task SaveData(
        IAsyncCursor<BsonDocument> cursor,
        string[] existingIndex,
        SortedDictionary<string, List<string>> changesIndex)
    {
        var retryPolicy = Policy
            .Handle<MongoConnectionException>()
            .Or<MongoExecutionTimeoutException>()
            .Or<TimeoutException>()
            .Or<AggregateException>()
            .WaitAndRetryAsync(new[]
            {
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(3),
                TimeSpan.FromSeconds(9)
            }, (exception, timeSpan, retryCount, context) =>
            {
                // Log details of the retry.
                Logger.LogError("Retry {retryCount} after {timeSpanSeconds} seconds due to {exceptionMessage}", retryCount, timeSpan.Seconds, exception.Message);
            });

        await retryPolicy.ExecuteAsync(async () =>
        {
            while (await cursor.MoveNextAsync())
            {
                await Parallel.ForEachAsync(cursor.Current, async (document, _) =>
                {
                    try
                    {
                        if (JsonConvert.DeserializeObject(document.ToString()) is not JObject jObject)
                        {
                            throw new Exception("Failed to deserialize the document.");
                        }
                        var blobName = jObject.GetBlobName();
                        if (string.IsNullOrWhiteSpace(blobName))
                        {
                            throw new Exception("Blob name is null or empty.");
                        }
                        await UploadString(jObject.ToString(), blobName);
                        AddChangesToIndex(changesIndex, jObject, blobName);
                    }
                    catch (Exception e)
                    {
                        Logger.LogError("Failed to process the document: {document}, exception: {exceptionMessage}", document, e.Message);
                        throw;
                    }
                });

                if (changesIndex.Count > 0)
                {
                    Logger.LogInformation("{counter} have been saved to the blob storage.", counter);
                    await SaveIndexToBlobStorage(existingIndex, changesIndex);
                }
            }
        });
    }

    private void AddChangesToIndex(
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

    private async Task SaveIndexToBlobStorage(
        string[] existingIndex,
        SortedDictionary<string, List<string>> changesIndex)
    {
        await Parallel.ForEachAsync(changesIndex, async (kv, _) =>
        {
            await UploadString(
                string.Join(Environment.NewLine, kv.Value),
                $"changes/{kv.Key}");
        });

        await UploadString(
            string.Join(Environment.NewLine, existingIndex.Union(changesIndex.Keys)),
            "changes/index");
    }

    private async Task UploadString(
        string blobContent,
        string blobName)
    {
        try
        {
            var blobClient = BlobContainerClient.GetBlobClient(blobName);
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(blobContent));
            await blobClient.UploadAsync(stream, overwrite: true);
        }
        catch (Exception e)
        {
            Logger.LogError("Failed to upload the blob: {blobName}, error message: {exceptionMessage}", blobName, e.Message);
            throw;
        }
    }

    internal async Task<string[]> GetIndex()
    {
        try
        {
            var blobClient = BlobContainerClient.GetBlobClient("changes/index");
            return (await blobClient.DownloadContentAsync()).Value.Content.ToString()
                .Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        }
        catch (Exception e)
        {
            Logger.LogError("Failed to get the index from the blob storage, exception: {exceptionMessage}", e.Message);
            throw;
        }
    }
}
public interface IFilterRenderer
{
    string RenderFilter(FilterDefinition<BsonDocument> filter, IMongoCollection<BsonDocument> collection);
}

public class FilterRenderer : IFilterRenderer
{
    public string RenderFilter(FilterDefinition<BsonDocument> filter, IMongoCollection<BsonDocument> collection)
    {
        return filter.Render(collection.DocumentSerializer, collection.Settings.SerializerRegistry).ToString();
    }
}