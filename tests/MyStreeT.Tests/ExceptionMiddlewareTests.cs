using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using MyStreeT.Api.Common;

namespace MyStreeT.Tests;

public class ExceptionMiddlewareTests
{
    private static async Task<(int status, JsonElement body)> Run(Exception ex)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = "/api/orders";
        ctx.Response.Body = new MemoryStream();
        var mw = new ExceptionHandlingMiddleware(_ => throw ex, TestHelpers.Log<ExceptionHandlingMiddleware>());

        await mw.InvokeAsync(ctx);

        ctx.Response.Body.Position = 0;
        var doc = await JsonDocument.ParseAsync(ctx.Response.Body);
        return (ctx.Response.StatusCode, doc.RootElement.Clone());
    }

    [Fact]
    public async Task AppException_maps_to_structured_error()
    {
        var (status, body) = await Run(new RequestValidationException("Shipping address is required"));

        status.Should().Be(400);
        body.GetProperty("error").GetString().Should().Be("VALIDATION_ERROR");
        body.GetProperty("message").GetString().Should().Be("Shipping address is required");
        body.GetProperty("path").GetString().Should().Be("/api/orders");
        body.TryGetProperty("timestamp", out _).Should().BeTrue();
    }

    [Theory]
    [InlineData(typeof(NotFoundException), 404, "NOT_FOUND")]
    [InlineData(typeof(ConflictException), 409, "CONFLICT")]
    [InlineData(typeof(UnauthorizedAppException), 401, "UNAUTHORIZED")]
    public async Task Each_app_exception_has_expected_status_and_code(Type type, int expectedStatus, string expectedCode)
    {
        var ex = (Exception)Activator.CreateInstance(type, "msg")!;
        var (status, body) = await Run(ex);
        status.Should().Be(expectedStatus);
        body.GetProperty("error").GetString().Should().Be(expectedCode);
    }

    [Fact]
    public async Task Unexpected_exception_returns_500_without_leaking_details()
    {
        var (status, body) = await Run(new InvalidOperationException("SELECT * FROM secrets failed"));

        status.Should().Be(500);
        body.GetProperty("error").GetString().Should().Be("INTERNAL_ERROR");
        body.GetProperty("message").GetString().Should().NotContain("secrets");
    }
}
