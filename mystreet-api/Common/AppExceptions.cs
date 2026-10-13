namespace MyStreeT.Api.Common;

public abstract class AppException : Exception
{
    protected AppException(int statusCode, string errorCode, string message) : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }

    public int StatusCode { get; }
    public string ErrorCode { get; }
}

public class RequestValidationException : AppException
{
    public RequestValidationException(string message) : base(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", message) { }
}

public class UnauthorizedAppException : AppException
{
    public UnauthorizedAppException(string message) : base(StatusCodes.Status401Unauthorized, "UNAUTHORIZED", message) { }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(StatusCodes.Status404NotFound, "NOT_FOUND", message) { }
}

public class ConflictException : AppException
{
    public ConflictException(string message) : base(StatusCodes.Status409Conflict, "CONFLICT", message) { }
}
