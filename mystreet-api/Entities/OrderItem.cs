namespace MyStreeT.Api.Entities;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    // Snapshot of product details at purchase time.
    public string ProductName { get; set; } = string.Empty;
    public string ProductBrand { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;

    public string Size { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
