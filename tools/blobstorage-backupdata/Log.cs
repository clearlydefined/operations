namespace BackupData;

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;

public class CustomConsoleFormatter : ConsoleFormatter
{
    public CustomConsoleFormatter(IOptionsMonitor<ConsoleFormatterOptions> options) : base("custom")
    {
    }
    private static string GetLogLevelColor(LogLevel logLevel)
    {
        return logLevel switch
        {
            LogLevel.Trace => "\x1b[37m", // White
            LogLevel.Debug => "\x1b[36m", // Cyan
            LogLevel.Information => "\x1b[32m", // Green
            LogLevel.Warning => "\x1b[33m", // Yellow
            LogLevel.Error => "\x1b[31m", // Red
            LogLevel.Critical => "\x1b[35m", // Magenta
            _ => "\x1b[0m", // Reset
        };
    }
    public override void Write<TState>(in LogEntry<TState> logEntry, IExternalScopeProvider? scopeProvider, TextWriter textWriter)
    {
        var logLevel = logEntry.LogLevel;
        var logLevelColor = GetLogLevelColor(logLevel);
        var resetColor = "\x1b[0m";

        var message = logEntry.Formatter(logEntry.State, logEntry.Exception);
        var timestamp = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

        textWriter.WriteLine($"{timestamp} {logLevelColor}[{logLevel}]{resetColor} {logEntry.Category} - {message}");
    }
}

public class CustomJsonConsoleFormatter : ConsoleFormatter
{
    public CustomJsonConsoleFormatter(IOptionsMonitor<ConsoleFormatterOptions> options) : base("customJson")
    {
    }
    
    public override void Write<TState>(in LogEntry<TState> logEntry, IExternalScopeProvider? scopeProvider, TextWriter textWriter)
    {
        var jsonObject = new
        {
            Timestamp = DateTime.UtcNow.ToString("o"),
            logEntry.Category,
            LogLevel = logEntry.LogLevel.ToString(),
            Exception = logEntry.Exception?.ToString(),
            Message = logEntry.Formatter(logEntry.State, logEntry.Exception)
        };

        var options = new JsonSerializerOptions
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        string jsonString = JsonSerializer.Serialize(jsonObject, options);
        textWriter.WriteLine(jsonString);
    }
}

public class CustomLoggerFactory 
{
    public static ILoggerFactory Create(bool useJsonLogging)
    {
        return LoggerFactory.Create(builder =>
            builder
            .AddFilter("BackupData", LogLevel.Information)
            .AddConsoleFormatter<CustomConsoleFormatter, ConsoleFormatterOptions>()
            .AddConsoleFormatter<CustomJsonConsoleFormatter, ConsoleFormatterOptions>()
            .AddConsole(options => options.FormatterName = useJsonLogging ? "customJson" : "custom"));
    }
}