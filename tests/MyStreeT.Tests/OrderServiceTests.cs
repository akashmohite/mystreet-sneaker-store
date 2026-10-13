using FluentAssertions;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Entities;
using MyStreeT.Api.Services;

namespace MyStreeT.Tests;

public class OrderServiceTests
{
    private readonly AppDbContext _db = TestHelpers.NewDb();
    private readonly OrderService _sut;
    private readonly User _user = TestHelpers.NewUser();
    private readonly Product _nike = TestHelpers.NewProduct("Air Max 90", "Nike", 120m, "7,8,9,10", 5);
    private readonly Product _adidas = TestHelpers.NewProduct("Ultraboost", "Adidas", 140.50m, "8,9", 3);

    public OrderServiceTests()
    {
        _db.Users.Add(_user);
        _db.Products.AddRange(_nike, _adidas);
        _db.SaveChanges();
        _sut = new OrderService(_db, TestHelpers.Log<OrderService>());
    }

    private CreateOrderRequest Request(params (Product p, string size, int qty)[] lines) => new()
    {
        ShippingName = "Jane Doe", ShippingAddress = "12 Main Street", ShippingCity = "Pune",
        ShippingPostalCode = "411001", ShippingPhone = "+91 98765 43210", PaymentMethod = "cod",
        Items = lines.Select(l => new CreateOrderItemRequest { ProductId = l.p.Id, Size = l.size, Quantity = l.qty }).ToList()
    };

    [Fact]
    public async Task Create_places_order_with_PLACED_status_and_server_calculated_total()
    {
        var order = await _sut.CreateAsync(_user.Id, Request((_nike, "9", 2), (_adidas, "8", 1)));

        order.Status.Should().Be("PLACED");
        order.Total.Should().Be(2 * 120m + 140.50m);
        order.Items.Should().HaveCount(2);
        order.PaymentMethod.Should().Be("COD");
        order.Id.Should().NotBe(Guid.Empty);
        _db.Orders.Should().ContainSingle();
        _db.OrderItems.Should().HaveCount(2);
    }

    [Fact]
    public async Task Create_snapshots_product_details_and_unit_price()
    {
        var order = await _sut.CreateAsync(_user.Id, Request((_nike, "10", 1)));

        var item = order.Items.Single();
        item.ProductName.Should().Be("Air Max 90");
        item.Brand.Should().Be("Nike");
        item.UnitPrice.Should().Be(120m);
        item.LineTotal.Should().Be(120m);
        item.Size.Should().Be("10");
    }

    [Fact]
    public async Task Create_decrements_stock()
    {
        await _sut.CreateAsync(_user.Id, Request((_nike, "9", 2)));
        _db.Products.Single(p => p.Id == _nike.Id).StockQty.Should().Be(3);
    }

    [Fact]
    public async Task Create_merges_duplicate_lines_for_same_product_and_size()
    {
        var order = await _sut.CreateAsync(_user.Id, Request((_nike, "9", 1), (_nike, "9", 2)));

        order.Items.Should().ContainSingle().Which.Quantity.Should().Be(3);
        order.Total.Should().Be(360m);
    }

    [Fact]
    public async Task Create_accepts_UPI_payment()
    {
        var req = Request((_nike, "9", 1));
        req.PaymentMethod = "UPI";
        (await _sut.CreateAsync(_user.Id, req)).PaymentMethod.Should().Be("UPI");
    }

    [Fact]
    public async Task Create_rejects_empty_cart_and_does_not_persist()
    {
        var act = () => _sut.CreateAsync(_user.Id, Request());
        await act.Should().ThrowAsync<RequestValidationException>().WithMessage("*cart is empty*");
        _db.Orders.Should().BeEmpty();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(11)]
    public async Task Create_rejects_invalid_quantity(int qty)
    {
        var act = () => _sut.CreateAsync(_user.Id, Request((_nike, "9", qty)));
        await act.Should().ThrowAsync<RequestValidationException>();
    }

    [Fact]
    public async Task Create_rejects_size_that_product_does_not_have()
    {
        var act = () => _sut.CreateAsync(_user.Id, Request((_adidas, "10", 1)));
        await act.Should().ThrowAsync<RequestValidationException>().WithMessage("*Size 10*");
    }

    [Fact]
    public async Task Create_rejects_unknown_or_inactive_product()
    {
        _nike.IsActive = false;
        await _db.SaveChangesAsync();

        var act = () => _sut.CreateAsync(_user.Id, Request((_nike, "9", 1)));
        await act.Should().ThrowAsync<RequestValidationException>();
    }

    [Fact]
    public async Task Create_rejects_quantity_above_stock_without_changing_stock()
    {
        var act = () => _sut.CreateAsync(_user.Id, Request((_adidas, "8", 2), (_adidas, "9", 2)));

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*Only 3*");
        _db.Products.Single(p => p.Id == _adidas.Id).StockQty.Should().Be(3);
        _db.Orders.Should().BeEmpty();
    }

    [Theory]
    [InlineData("name")]
    [InlineData("address")]
    [InlineData("city")]
    [InlineData("postal")]
    [InlineData("phone")]
    public async Task Create_requires_every_shipping_field(string field)
    {
        var req = Request((_nike, "9", 1));
        switch (field)
        {
            case "name": req.ShippingName = " "; break;
            case "address": req.ShippingAddress = ""; break;
            case "city": req.ShippingCity = ""; break;
            case "postal": req.ShippingPostalCode = ""; break;
            case "phone": req.ShippingPhone = ""; break;
        }

        var act = () => _sut.CreateAsync(_user.Id, req);
        await act.Should().ThrowAsync<RequestValidationException>();
    }

    [Fact]
    public async Task Create_rejects_bad_phone_postal_and_payment_method()
    {
        var bad = Request((_nike, "9", 1)); bad.ShippingPhone = "abc";
        await ((Func<Task>)(() => _sut.CreateAsync(_user.Id, bad))).Should().ThrowAsync<RequestValidationException>();

        bad = Request((_nike, "9", 1)); bad.ShippingPostalCode = "!!";
        await ((Func<Task>)(() => _sut.CreateAsync(_user.Id, bad))).Should().ThrowAsync<RequestValidationException>();

        bad = Request((_nike, "9", 1)); bad.PaymentMethod = "BITCOIN";
        await ((Func<Task>)(() => _sut.CreateAsync(_user.Id, bad))).Should().ThrowAsync<RequestValidationException>();
    }

    [Fact]
    public async Task Create_rejects_unknown_user()
    {
        var act = () => _sut.CreateAsync(Guid.NewGuid(), Request((_nike, "9", 1)));
        await act.Should().ThrowAsync<UnauthorizedAppException>();
    }

    [Fact]
    public async Task GetMine_returns_only_the_callers_orders_newest_first()
    {
        var other = TestHelpers.NewUser("other@test.com");
        _db.Users.Add(other);
        await _db.SaveChangesAsync();

        var first = await _sut.CreateAsync(_user.Id, Request((_nike, "9", 1)));
        await Task.Delay(5);
        var second = await _sut.CreateAsync(_user.Id, Request((_nike, "8", 1)));
        await _sut.CreateAsync(other.Id, Request((_nike, "7", 1)));

        var mine = await _sut.GetMineAsync(_user.Id);

        mine.Select(o => o.Id).Should().Equal(second.Id, first.Id);
    }

    [Fact]
    public async Task GetById_returns_own_order_with_items()
    {
        var created = await _sut.CreateAsync(_user.Id, Request((_nike, "9", 2)));

        var fetched = await _sut.GetByIdAsync(_user.Id, created.Id);

        fetched.Id.Should().Be(created.Id);
        fetched.Items.Should().ContainSingle().Which.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task GetById_hides_other_users_orders_as_NotFound()
    {
        var other = TestHelpers.NewUser("other@test.com");
        _db.Users.Add(other);
        await _db.SaveChangesAsync();
        var created = await _sut.CreateAsync(other.Id, Request((_nike, "9", 1)));

        var act = () => _sut.GetByIdAsync(_user.Id, created.Id);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
