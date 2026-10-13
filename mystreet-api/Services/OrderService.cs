using Microsoft.EntityFrameworkCore;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Services;

public class OrderService : IOrderService
{
    private const int MaxQuantityPerLine = 10;
    private const int MaxLines = 50;

    private readonly AppDbContext _db;
    private readonly ILogger<OrderService> _logger;

    public OrderService(AppDbContext db, ILogger<OrderService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<OrderDto> CreateAsync(Guid userId, CreateOrderRequest request)
    {
        if (request is null) throw new RequestValidationException("Order data is required");

        var shippingName = Require(request.ShippingName, "Full name", 100);
        var shippingAddress = Require(request.ShippingAddress, "Shipping address", 300);
        var shippingCity = Require(request.ShippingCity, "City", 100);
        var postal = Require(request.ShippingPostalCode, "Postal code", 10);
        var phone = Require(request.ShippingPhone, "Phone number", 20);
        if (!Validators.IsValidPostalCode(postal)) throw new RequestValidationException("Please enter a valid postal code");
        if (!Validators.IsValidPhone(phone)) throw new RequestValidationException("Please enter a valid phone number");

        var payment = (request.PaymentMethod ?? string.Empty).Trim().ToUpperInvariant();
        if (payment != PaymentMethods.CashOnDelivery && payment != PaymentMethods.MockUpi)
            throw new RequestValidationException("Payment method must be Cash on Delivery or UPI");

        if (request.Items is null || request.Items.Count == 0)
            throw new RequestValidationException("Your cart is empty");
        if (request.Items.Count > MaxLines)
            throw new RequestValidationException("Too many items in one order");

        foreach (var item in request.Items)
        {
            if (item.ProductId == Guid.Empty) throw new RequestValidationException("Invalid product in cart");
            if (string.IsNullOrWhiteSpace(item.Size)) throw new RequestValidationException("Please select a size for every item");
            if (item.Quantity < 1 || item.Quantity > MaxQuantityPerLine)
                throw new RequestValidationException($"Quantity must be between 1 and {MaxQuantityPerLine}");
        }

        if (!await _db.Users.AnyAsync(u => u.Id == userId))
            throw new UnauthorizedAppException("Please sign in to continue");

        // Merge duplicate (product,size) lines.
        var lines = request.Items
            .GroupBy(i => (i.ProductId, Size: i.Size.Trim()))
            .Select(g => (g.Key.ProductId, g.Key.Size, Quantity: g.Sum(x => x.Quantity)))
            .ToList();

        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await _db.Products.Where(p => productIds.Contains(p.Id) && p.IsActive).ToListAsync();
        var byId = products.ToDictionary(p => p.Id);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ShippingName = shippingName,
            ShippingAddress = shippingAddress,
            ShippingCity = shippingCity,
            ShippingPostalCode = postal,
            ShippingPhone = phone,
            PaymentMethod = payment,
            Status = OrderStatus.Placed,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var line in lines)
        {
            if (!byId.TryGetValue(line.ProductId, out var product))
                throw new RequestValidationException("One of the products in your cart is no longer available");

            var sizes = product.SizesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!sizes.Contains(line.Size))
                throw new RequestValidationException($"Size {line.Size} is not available for {product.Name}");

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                ProductName = product.Name,
                ProductBrand = product.Brand,
                ImageUrl = product.ImageUrl,
                Size = line.Size,
                Quantity = line.Quantity,
                UnitPrice = product.Price // authoritative price from the database
            });
        }

        // Stock check across all sizes of the same product, then decrement.
        foreach (var group in order.Items.GroupBy(i => i.ProductId))
        {
            var product = byId[group.Key];
            var requested = group.Sum(i => i.Quantity);
            if (requested > product.StockQty)
                throw new ConflictException(product.StockQty == 0
                    ? $"{product.Name} is out of stock"
                    : $"Only {product.StockQty} pair(s) of {product.Name} left in stock");
            product.StockQty -= requested;
        }

        order.Total = order.Items.Sum(i => i.UnitPrice * i.Quantity);

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Order {OrderId} placed by {UserId}, total {Total}", order.Id, userId, order.Total);
        return order.ToDto();
    }

    public async Task<IReadOnlyList<OrderDto>> GetMineAsync(Guid userId)
    {
        var orders = await _db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return orders.Select(o => o.ToDto()).ToList();
    }

    public async Task<OrderDto> GetByIdAsync(Guid userId, Guid orderId)
    {
        // Filtering by owner means another user's order looks exactly like a missing one.
        var order = await _db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);
        return order?.ToDto() ?? throw new NotFoundException("Order not found");
    }

    private static string Require(string? value, string field, int maxLength)
    {
        var v = (value ?? string.Empty).Trim();
        if (v.Length == 0) throw new RequestValidationException($"{field} is required");
        if (v.Length > maxLength) throw new RequestValidationException($"{field} must be {maxLength} characters or fewer");
        return v;
    }
}
