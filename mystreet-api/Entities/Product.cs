namespace MyStreeT.Api.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }

    /// <summary>Comma separated sizes, e.g. "7,8,9,10" (kept simple per the capstone brief).</summary>
    public string SizesCsv { get; set; } = string.Empty;

    public int StockQty { get; set; }
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// False once an admin "deletes" a product that already appears in past orders.
    /// Keeps order history intact while hiding the product from the catalog.
    /// </summary>
    public bool IsActive { get; set; } = true;
}
