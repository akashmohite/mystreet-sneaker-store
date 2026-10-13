using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MyStreeT.Api.Data;
using MyStreeT.Api.Entities;

namespace MyStreeT.Tests;

public static class TestHelpers
{
    public static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    public static Product NewProduct(string name = "Air Max 90", string brand = "Nike", decimal price = 100m,
        string sizes = "7,8,9,10", int stock = 10, bool active = true) => new()
    {
        Id = Guid.NewGuid(), Name = name, Brand = brand, Price = price, SizesCsv = sizes,
        StockQty = stock, ImageUrl = "/sneakers/placeholder.svg", Description = "desc", IsActive = active
    };

    public static User NewUser(string email = "user@test.com", bool admin = false) => new()
    {
        Id = Guid.NewGuid(), Email = email, PasswordHash = "hash", IsAdmin = admin
    };

    public static NullLogger<T> Log<T>() => NullLogger<T>.Instance;
}
