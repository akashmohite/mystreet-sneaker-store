using FluentAssertions;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Entities;
using MyStreeT.Api.Services;

namespace MyStreeT.Tests;

public class ProductServiceTests
{
    private static ProductService Create(out AppDbContext db)
    {
        db = TestHelpers.NewDb();
        return new ProductService(db, TestHelpers.Log<ProductService>());
    }

    private static ProductUpsertRequest ValidRequest() => new()
    {
        Name = "  Demo Sneaker ", Brand = "Nike", Description = "Nice", Price = 99.5m,
        SizesCsv = "10, 8,9", StockQty = 5, ImageUrl = ""
    };

    private static async Task<ProductService> Seeded(Action<AppDbContext>? extra = null)
    {
        var sut = Create(out var db);
        db.Products.AddRange(
            TestHelpers.NewProduct("Air Max 90", "Nike", 119.99m, "7,8,9,10"),
            TestHelpers.NewProduct("Dunk Low", "Nike", 110m, "10,11"),
            TestHelpers.NewProduct("Ultraboost", "Adidas", 139.99m, "7,8,9,10,11"),
            TestHelpers.NewProduct("Samba", "Adidas", 99m, "6,7"),
            TestHelpers.NewProduct("Hidden", "Nike", 50m, "9", active: false));
        extra?.Invoke(db);
        await db.SaveChangesAsync();
        return sut;
    }

    [Fact]
    public async Task GetAll_returns_only_active_products()
    {
        var sut = await Seeded();
        var all = await sut.GetAllAsync(null, null);
        all.Should().HaveCount(4);
        all.Select(p => p.Name).Should().NotContain("Hidden");
    }

    [Fact]
    public async Task GetAll_filters_by_brand_case_insensitively()
    {
        var sut = await Seeded();
        var nike = await sut.GetAllAsync("nIkE", null);
        nike.Should().HaveCount(2).And.OnlyContain(p => p.Brand == "Nike");
    }

    [Fact]
    public async Task GetAll_filters_by_exact_size_not_substring()
    {
        var sut = await Seeded();

        (await sut.GetAllAsync(null, "1")).Should().BeEmpty();          // "1" must not match 10/11
        (await sut.GetAllAsync(null, "11")).Select(p => p.Name).Should().BeEquivalentTo(new[] { "Dunk Low", "Ultraboost" });
        (await sut.GetAllAsync(null, "9")).Select(p => p.Name).Should().BeEquivalentTo(new[] { "Air Max 90", "Ultraboost" });
    }

    [Fact]
    public async Task GetAll_combines_brand_and_size()
    {
        var sut = await Seeded();
        var result = await sut.GetAllAsync("Nike", "10");
        result.Select(p => p.Name).Should().BeEquivalentTo(new[] { "Air Max 90", "Dunk Low" });
    }

    [Fact]
    public async Task GetById_returns_product_with_parsed_sizes()
    {
        var sut = Create(out var db);
        var p = TestHelpers.NewProduct(sizes: "7,8,9");
        db.Products.Add(p);
        await db.SaveChangesAsync();

        var dto = await sut.GetByIdAsync(p.Id);

        dto.Id.Should().Be(p.Id);
        dto.Sizes.Should().Equal("7", "8", "9");
    }

    [Fact]
    public async Task GetById_throws_NotFound_for_missing_or_inactive_product()
    {
        var sut = Create(out var db);
        var hidden = TestHelpers.NewProduct(active: false);
        db.Products.Add(hidden);
        await db.SaveChangesAsync();

        await ((Func<Task>)(() => sut.GetByIdAsync(Guid.NewGuid()))).Should().ThrowAsync<NotFoundException>();
        await ((Func<Task>)(() => sut.GetByIdAsync(hidden.Id))).Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Create_trims_normalises_sizes_and_defaults_image()
    {
        var sut = Create(out var db);

        var dto = await sut.CreateAsync(ValidRequest());

        dto.Name.Should().Be("Demo Sneaker");
        dto.SizesCsv.Should().Be("8,9,10");
        dto.ImageUrl.Should().Be(Validators.DefaultImage);
        db.Products.Should().ContainSingle();
    }

    [Fact]
    public async Task Created_product_appears_in_catalog()
    {
        var sut = Create(out _);
        var created = await sut.CreateAsync(ValidRequest());

        var catalog = await sut.GetAllAsync(null, null);

        catalog.Should().Contain(p => p.Id == created.Id);
    }

    public static IEnumerable<object[]> InvalidRequests()
    {
        ProductUpsertRequest R(Action<ProductUpsertRequest> mutate) { var r = ValidRequest(); mutate(r); return r; }
        yield return new object[] { R(r => r.Name = " ") };
        yield return new object[] { R(r => r.Brand = "") };
        yield return new object[] { R(r => r.Price = 0) };
        yield return new object[] { R(r => r.Price = -5) };
        yield return new object[] { R(r => r.Price = 10.123m) };
        yield return new object[] { R(r => r.StockQty = -1) };
        yield return new object[] { R(r => r.SizesCsv = "") };
        yield return new object[] { R(r => r.SizesCsv = "abc") };
        yield return new object[] { R(r => r.ImageUrl = "javascript:alert(1)") };
    }

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Create_rejects_invalid_input(ProductUpsertRequest request)
    {
        var sut = Create(out var db);

        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<RequestValidationException>();
        db.Products.Should().BeEmpty();
    }

    [Fact]
    public async Task Update_changes_fields_and_is_visible_in_catalog()
    {
        var sut = Create(out var db);
        var p = TestHelpers.NewProduct();
        db.Products.Add(p);
        await db.SaveChangesAsync();

        var req = ValidRequest();
        req.Name = "Renamed";
        req.Price = 42m;
        await sut.UpdateAsync(p.Id, req);

        var fromCatalog = (await sut.GetAllAsync(null, null)).Single();
        fromCatalog.Name.Should().Be("Renamed");
        fromCatalog.Price.Should().Be(42m);
    }

    [Fact]
    public async Task Update_missing_product_throws_NotFound()
    {
        var sut = Create(out _);
        var act = () => sut.UpdateAsync(Guid.NewGuid(), ValidRequest());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Delete_removes_product_that_was_never_ordered()
    {
        var sut = Create(out var db);
        var p = TestHelpers.NewProduct();
        db.Products.Add(p);
        await db.SaveChangesAsync();

        await sut.DeleteAsync(p.Id);

        db.Products.Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_deactivates_product_that_has_orders_and_hides_it()
    {
        var sut = Create(out var db);
        var user = TestHelpers.NewUser();
        var p = TestHelpers.NewProduct();
        var order = new Order
        {
            Id = Guid.NewGuid(), UserId = user.Id, ShippingName = "n", ShippingAddress = "a", ShippingCity = "c",
            ShippingPostalCode = "12345", ShippingPhone = "1234567", PaymentMethod = "COD", Total = 100m,
            Items = { new OrderItem { Id = Guid.NewGuid(), ProductId = p.Id, ProductName = p.Name, ProductBrand = p.Brand, Size = "9", Quantity = 1, UnitPrice = 100m } }
        };
        db.Users.Add(user); db.Products.Add(p); db.Orders.Add(order);
        await db.SaveChangesAsync();

        await sut.DeleteAsync(p.Id);

        db.Products.Single().IsActive.Should().BeFalse();
        (await sut.GetAllAsync(null, null)).Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_missing_product_throws_NotFound()
    {
        var sut = Create(out _);
        var act = () => sut.DeleteAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
