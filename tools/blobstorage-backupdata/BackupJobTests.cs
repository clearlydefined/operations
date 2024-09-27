namespace BackupData;

using Moq;
using NUnit.Framework;
using Azure;
using Azure.Storage.Blobs;
using MongoDB.Driver;
using MongoDB.Bson;
using Azure.Storage.Blobs.Models;
using Newtonsoft.Json.Linq;
using FluentAssertions;

using MongoDB.Bson.Serialization;
using System.Globalization;
using Microsoft.Extensions.Logging;

public interface IBlobDownloadResultWrapper
{
    BinaryData Content { get; }
}

public class Definition
{
    public Definition(string coordinate, DateTime updated)
    {
        Coordinate = coordinate;
        Updated = updated;
    }
    public string Coordinate { get; set; }
    public DateTime Updated { get; set; }
    public override string ToString()
    {
        var jsonObject = new JObject
        {
            ["_id"] = Coordinate,
            ["_meta"] = new JObject
            {
                ["updated"] = Updated.ToString("yyyy-MM-ddTHH:mm:ssZ")
            }
            ["coordinates"] = new JObject
            {
                ["type"] = "type",
                ["provider"] = "provider",
                ["namespace"] = "-",
                ["name"] = "name",
                ["revision"] = "revision"
            }
        };
        return jsonObject.ToString();
    }

    public static Definition FromJson(string json)
    {
        var jsonObject = JObject.Parse(json);
        var coordinate = jsonObject["_id"]?.ToString();
        var updated = DateTime.Parse(jsonObject["_meta"]?["updated"]?.ToString()!);
        return new Definition(coordinate!, updated);
    }

    override public bool Equals(object? obj)
    {
        if (obj == null || GetType() != obj.GetType())
        {
            return false;
        }
        var other = (Definition)obj;
        return Coordinate == other.Coordinate && Updated == other.Updated;
    }

    override public int GetHashCode()
    {
        return HashCode.Combine(Coordinate, Updated);
    }
}

public class MongoCursorWrapper : IAsyncCursor<BsonDocument>
{
    private readonly object _lock = new();
    public List<List<BsonDocument>> _documents;
    private int _index = -1;
    public MongoCursorWrapper()
    {
        _documents = new List<List<BsonDocument>>();
    }
    public void Initialize(List<List<BsonDocument>> documents)
    {
        _documents = documents;
        _index = -1;
    }
    public IEnumerable<BsonDocument> Current
    {
        get
        {
            lock (_lock)
            {
                return _documents[_index];
            }
        }
    }
    public bool MoveNext(CancellationToken cancellationToken = default)
    {
        lock (_lock)
        {
            _index++;
            return _index < _documents!.Count;
        }
    }
    public Task<bool> MoveNextAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(MoveNext(cancellationToken));
    }
    public void Dispose()
    {
    }
}

public class MockFilterRenderer : IFilterRenderer
{
    public string RenderFilter(FilterDefinition<BsonDocument> filter, IMongoCollection<BsonDocument> collection)
    {
        return "Mock filter string";
    }
}

[TestFixture]
public class BackupJobTests
{
    private Mock<BlobContainerClient> mockSnapshotBlobContainerClient = new();
    private Mock<BlobContainerClient> mockDefinitionBlobContainerClient = new();
    private Mock<IMongoClient> mockMongoClient = new();
    private MongoCursorWrapper mockCursor = new();

    ILoggerFactory loggerFactory = LoggerFactory.Create(builder =>
        {
            builder
                .AddFilter("Microsoft", LogLevel.Warning)
                .AddFilter("System", LogLevel.Warning)
                .AddFilter("BackupData", LogLevel.Debug)
                .AddConsole();
        });
    private const string indexPath = "changes/index";

    private DateTime parseStringUTC(string date)
    {
        return DateTime.SpecifyKind(
                        DateTime.ParseExact(date, "yyyy-MM-ddTHH:mm:ssZ", null, DateTimeStyles.AdjustToUniversal),
                        DateTimeKind.Utc);

    }
    private void SetupMockBlobClient(Mock<BlobContainerClient> mockBlobContainerClient, Dictionary<string, string?> data)
    {
        foreach (var (key, value) in data)
        {
            var mockBlobClient = new Mock<BlobClient>();
            mockBlobContainerClient.Setup(x => x.GetBlobClient(key)).Returns(mockBlobClient.Object);
            // mock download
            mockBlobClient.Setup(x => x.DownloadContentAsync()).ReturnsAsync(() =>
            {
                var mockBlobDownloadResult = BlobsModelFactory.BlobDownloadResult(BinaryData.FromString(data[key]!));
                Response<BlobDownloadResult> response = Response.FromValue(mockBlobDownloadResult, new Mock<Response>().Object);
                return response;
            });
            // mock upload
            var tcs = new TaskCompletionSource<Response<BlobContentInfo>>();
            tcs.SetResult(new Mock<Response<BlobContentInfo>>().Object);
            mockBlobClient.Setup(x => x.UploadAsync(It.IsAny<Stream>(), true, It.IsAny<CancellationToken>()))
                .Callback<Stream, bool, CancellationToken>((stream, overwrite, token) =>
                {
                    var reader = new StreamReader(stream);
                    var content = reader.ReadToEnd();
                    data[key] = content;
                })
                .Returns(tcs.Task);
        }
    }

    [SetUp]
    public void SetUp()
    {
        mockSnapshotBlobContainerClient = new Mock<BlobContainerClient>();
        mockDefinitionBlobContainerClient = new Mock<BlobContainerClient>();
        mockMongoClient = new Mock<IMongoClient>();
        mockCursor = new MongoCursorWrapper();

        var mockDatabase = new Mock<IMongoDatabase>();
        var mockMongoCollection = new Mock<IMongoCollection<BsonDocument>>();
        mockMongoClient.Setup(x => x.GetDatabase("clearlydefined", null)).Returns(mockDatabase.Object);
        mockDatabase.Setup(x => x.GetCollection<BsonDocument>("definitions-trimmed", null)).Returns(mockMongoCollection.Object);
        mockMongoCollection
        .Setup(x => x.FindAsync(It.IsAny<FilterDefinition<BsonDocument>>(), It.IsAny<FindOptions<BsonDocument>>(), default))
        .Callback((FilterDefinition<BsonDocument> filter, FindOptions<BsonDocument, BsonDocument> options, CancellationToken token) =>
        {
            string dateFilter1 = "0001-01-01T00:00:00Z";
            string dateFilter2 = "2999-12-31T23:59:59Z";
            foreach (var f in filter.Render(BsonSerializer.SerializerRegistry.GetSerializer<BsonDocument>(), BsonSerializer.SerializerRegistry).Elements)
            {
                if (f.Name == "_meta.updated")
                {
                    dateFilter1 = f.Value["$gte"].ToString()!;
                    dateFilter2 = f.Value["$lt"].ToString()!;
                    break;
                }
            }
            var documents = new List<BsonDocument>();
            foreach (var batch in mockCursor._documents)
            {
                var itemsToRemove = new List<BsonDocument>();
                foreach (var document in batch)
                {
                    var docUpdated = document["_meta"]["updated"].ToString()!;
                    var date = parseStringUTC(docUpdated);
                    if (date < parseStringUTC(dateFilter1.ToString()) || date >= parseStringUTC(dateFilter2.ToString()))
                    {
                        itemsToRemove.Add(document);
                    }
                }

                foreach (var item in itemsToRemove)
                {
                    batch.Remove(item);
                }
            }
        })
        .ReturnsAsync(mockCursor);
    }

    [Test]
    public void TestGetIndex()
    {
        var backupJob = new BackupJob(mockSnapshotBlobContainerClient.Object, mockDefinitionBlobContainerClient.Object, mockMongoClient.Object, DateTime.UtcNow, loggerFactory, new MockFilterRenderer());
        var changesets = new string[] { "2021-01-01-00", "2021-01-01-01", "2021-01-01-02" };
        var binaryData = string.Join("\n", changesets);
        var data = new Dictionary<string, string?>
        {
            {"changes/index", binaryData}
        };
        SetupMockBlobClient(mockSnapshotBlobContainerClient, data);

        var result = backupJob.GetIndex().Result;
        Assert.AreEqual(changesets, result);
    }

    [Test]
    public void TestGetDefinitionData()
    {
        var backupJob = new BackupJob(mockSnapshotBlobContainerClient.Object, mockDefinitionBlobContainerClient.Object, mockMongoClient.Object, DateTime.UtcNow, loggerFactory, new MockFilterRenderer());
        var data = new Dictionary<string, string?>
        {
            {"type/provider/-/name/revision/revision.json", """{"licensed": { "toolScore": { "total": 17, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "MIT" }}}"""}
        };

        SetupMockBlobClient(mockDefinitionBlobContainerClient, data);

        var result = backupJob.GetDefinition("type/provider/-/name/revision/revision.json").Result;
        Assert.AreEqual(data["type/provider/-/name/revision/revision.json"], result);
    }

    [Test]
    public void TestSaveData_HappyCase()
    {
        var backupJob = new BackupJob(mockSnapshotBlobContainerClient.Object, mockDefinitionBlobContainerClient.Object, mockMongoClient.Object, DateTime.UtcNow, loggerFactory, new MockFilterRenderer());
        // before start, data is empty
        // index can't be null because it must be read
        var data = new Dictionary<string, string?>
        {
            {indexPath, ""},
            {"changes/2023-01-01-00", null},
            {"changes/2023-01-01-01", null},
            {"changes/2023-01-02-00", null},
            {"type/provider/-/name/1.json", null},
            {"type/provider/-/name/2.json", null},
            {"type/provider/-/name/3.json", null},
            {"type/provider/-/name/4.json", null},
        };
        SetupMockBlobClient(mockSnapshotBlobContainerClient, data);

        var definitionData = new Dictionary<string, string?>
        {
            {"type/provider/-/name/revision/1.json", """{"licensed": { "toolScore": { "total": 17, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "MIT" }}}"""},
            {"type/provider/-/name/revision/2.json", """{"licensed": { "toolScore": { "total": 34, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "Apache 2.0" }}}"""},
            {"type/provider/-/name/revision/3.json", """{"licensed": { "toolScore": { "total": 78, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "MIT" }}}"""},
            {"type/provider/-/name/revision/4.json", """{"licensed": { "toolScore": { "total": 12, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "Apache 2.0" }}}"""},
        };
        SetupMockBlobClient(mockDefinitionBlobContainerClient, definitionData);

        // Format the data to be used in the test
        string[] definitions = definitionData
                             .Select(x => x.Value!.ToString())
                             .ToArray();

        // these are the definitions that database returns
        var bsonDefinitions = new List<string>() {
            """{"_id": "type/provider/-/name/1", "_meta": {"updated": "2023-01-01T00:00:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "1"}}""",
            """{"_id": "type/provider/-/name/2", "_meta": {"updated": "2023-01-01T01:00:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "2"}}""",
            """{"_id": "type/provider/-/name/3", "_meta": {"updated": "2023-01-02T00:00:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "3"}}""",
            """{"_id": "type/provider/-/name/4", "_meta": {"updated": "2023-01-02T00:05:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "4"}}""",
        }.Select(x => BsonDocument.Parse(x)).ToList();

        mockCursor.Initialize(new List<List<BsonDocument>>() { bsonDefinitions });

        // run the test
        backupJob.ProcessJob().Wait();

        // index should be replaced with new values
        data[indexPath]?.ToString().Should().Be("2023-01-01-00\n2023-01-01-01\n2023-01-02-00");

        // all changesets should be replaced with new values
        data["changes/2023-01-01-00"]?.Should().Be("type/provider/-/name/1.json");
        data["changes/2023-01-01-01"]?.Should().Be("type/provider/-/name/2.json");
        // because of concurrency, we can't guarantee the order of changesets
        data["changes/2023-01-02-00"]?.Split("\n")
            .ToHashSet()
            .Should().BeEquivalentTo(new HashSet<string>() { "type/provider/-/name/3.json", "type/provider/-/name/4.json" });

        // definitions should be uploaded
        data.Where(x => x.Key.StartsWith("type/provider/-/name/"))
            .Select(x => x.Value)
            .Should().BeEquivalentTo(definitions).And.HaveCount(4);
    }

    [Test]
    public void TestSaveData_ShouldExcludeCurrentHour()
    {
        var now = DateTime.Parse("2023-01-01T01:03:00Z");
        var backupJob = new BackupJob(mockSnapshotBlobContainerClient.Object, mockDefinitionBlobContainerClient.Object, mockMongoClient.Object, now, loggerFactory, new MockFilterRenderer());
        var data = new Dictionary<string, string?>
        {
            {indexPath, "2022-12-31-23"},
            {"changes/2023-01-01-00", null},
            {"type/provider/-/name/1.json", null},
        };
        SetupMockBlobClient(mockSnapshotBlobContainerClient, data);

        var definitionData = new Dictionary<string, string?>
        {
            {"type/provider/-/name/revision/1.json", """{"licensed": { "toolScore": { "total": 17, "declared": 0, "discovered": 2, "consistency": 0, "spdx": 0, "texts": 15, "declared": "MIT" }}}"""},
        };
        SetupMockBlobClient(mockDefinitionBlobContainerClient, definitionData);

        string[] definitions = definitionData
                             .Select(x => x.Value!.ToString())
                             .ToArray();

        var bsonDefinitions = new List<List<string>>() {
            new List<string>() {"""{"_id": "type/provider/-/name/1", "_meta": {"updated": "2023-01-01T00:00:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "1"}}""",},
            new List<string>() {"""{"_id": "type/provider/-/name/2", "_meta": {"updated": "2023-01-01T01:01:00Z"}, "coordinates": {"type": "type", "provider": "provider", "namespace": "-", "name": "name", "revision": "2"}}""",},
        }.Select(x => x.Select(x => BsonDocument.Parse(x)).ToList()).ToList();
        mockCursor.Initialize(bsonDefinitions);
        backupJob.ProcessJob().Wait();

        data[indexPath]?.ToString().Should().Be("2022-12-31-23\n2023-01-01-00");
        data["changes/2023-01-01-00"]?.Split("\n")
            .ToHashSet()
            .Should().Contain(new HashSet<string>() { "type/provider/-/name/1.json" })
            .And.NotContain(new HashSet<string>() { "type/provider/-/name/2.json" });

        data.Where(x => x.Key.StartsWith("type/provider/-/name/"))
            .Select(x => x.Value)
            .Should().BeEquivalentTo(definitions).And.HaveCount(1);
    }

    [Test]
    public void TestConstructBlobUrl()
    {
        var jsonObject = new JObject
        {
            ["coordinates"] = new JObject
            {
                ["type"] = "type",
                ["provider"] = "provider",
                ["namespace"] = "-",
                ["name"] = "name",
                ["revision"] = "revision"
            }
        };
        var result = jsonObject.ConstructBlobUrl();
        Assert.AreEqual("type/provider/-/name/revision/revision.json", result);

        // test with null namespace
        jsonObject = new JObject
        {
            ["coordinates"] = new JObject
            {
                ["type"] = "type",
                ["provider"] = "provider",
                ["namespace"] = null,
                ["name"] = "name",
                ["revision"] = "revision"
            }
        };

        result = jsonObject.ConstructBlobUrl();
        Assert.AreEqual("type/provider/-/name/revision/revision.json", result);
    }

    [Test]
    public void TestConstructInvalidBlobUrl()
    {
        var jsonObject = JObject.Parse("{}");
        var result = jsonObject.ConstructBlobUrl();
        Assert.AreEqual("", result);
    }
}