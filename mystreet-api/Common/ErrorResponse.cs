using System.Text.Json;

namespace MyStreeT.Api.Common;

/// <summary>Consistent error body required by the capstone (timestamp, path, error, message).</summary>
public record ErrorResponse(DateTime Timestamp, string Path, string Error, string Message);

public static class ErrorWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task WriteAsync(HttpContext context, int status, string error, string message)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        var body = new ErrorResponse(DateTime.UtcNow, context.Request.Path.Value ?? string.Empty, error, message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
    }
}
