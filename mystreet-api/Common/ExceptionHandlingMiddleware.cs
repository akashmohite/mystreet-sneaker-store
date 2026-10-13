namespace MyStreeT.Api.Common;

/// <summary>Central place that converts exceptions into the structured error response.</summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogInformation("Handled {Code} on {Path}: {Message}", ex.ErrorCode, context.Request.Path, ex.Message);
            await ErrorWriter.WriteAsync(context, ex.StatusCode, ex.ErrorCode, ex.Message);
        }
        catch (Exception ex)
        {
            // Never leak exception details to the client.
            _logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);
            await ErrorWriter.WriteAsync(context, StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
        }
    }
}
