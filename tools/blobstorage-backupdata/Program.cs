namespace BackupData;

using Azure.Core;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

internal sealed class Program
{
    internal static void Main()
    {
        string? useJsonLoggingEnvVar = Environment.GetEnvironmentVariable("USE_JSON_LOGGING");
        _ = bool.TryParse(useJsonLoggingEnvVar, out bool useJsonLogging);
        using ILoggerFactory loggerFactory = CustomLoggerFactory.Create(useJsonLogging);

        ILogger logger = loggerFactory.CreateLogger(nameof(Program));
        logger.LogInformation("Backup job started.");
        var backupJob = CreateBackupJob(loggerFactory);
        try
        {
            backupJob.ProcessJob().Wait();
        }
        catch (AggregateException ae)
        {
            foreach (var e in ae.InnerExceptions)
            {
                logger.LogError(e, "Backup job failed.");
            }
        }
        catch (Exception e)
        {
            logger.LogError(e, "Backup job failed.");
        }
        logger.LogInformation("Backup job completed.");
    }

    private static string GetEnvironmentVariable(string name)
    {
        string? value = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrEmpty(value))
        {
            throw new ArgumentNullException(name);
        }
        return value;
    }

    private static BackupJob CreateBackupJob(ILoggerFactory loggerFactory)
    {
        string mongoClientConnectionString = GetEnvironmentVariable("MONGO_CONNECTION_STRING");
        string blobServiceConnectionString = GetEnvironmentVariable("BLOB_SERVICE_CONNECTION_STRING");
        string blobContainerName = GetEnvironmentVariable("BLOB_CONTAINER_NAME");
        string definitionBlobContainerName = GetEnvironmentVariable("DEFINITION_BLOB_CONTAINER_NAME");

        var dbClient = new MongoClient(mongoClientConnectionString);
        var blobOptions = new BlobClientOptions
        {
            Retry =
            {
                Mode = RetryMode.Exponential,
                MaxRetries = 5,
                Delay = TimeSpan.FromSeconds(2),
                MaxDelay = TimeSpan.FromSeconds(10),
                NetworkTimeout = TimeSpan.FromSeconds(100)
            }
        };

        var blobServiceClient = new BlobServiceClient(blobServiceConnectionString, blobOptions);

        var definitionBlobContainerClient = blobServiceClient.GetBlobContainerClient(definitionBlobContainerName);
        var blobContainerClient = blobServiceClient.GetBlobContainerClient(blobContainerName);


        return new BackupJob(blobContainerClient, definitionBlobContainerClient, dbClient, DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc), loggerFactory, new FilterRenderer());
    }
}
