namespace MyStreeT.Api.Entities;

public static class OrderStatus
{
    public const string Placed = "PLACED";
}

public static class PaymentMethods
{
    public const string CashOnDelivery = "COD";
    public const string MockUpi = "UPI";
}

public class Order
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string ShippingName { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingPostalCode { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;

    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = OrderStatus.Placed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public decimal Total { get; set; }

    public List<OrderItem> Items { get; set; } = new();
}
