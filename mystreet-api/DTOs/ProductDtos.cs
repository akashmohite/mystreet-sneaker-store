using System.ComponentModel.DataAnnotations;

namespace MyStreeT.Api.DTOs;

public record ProductDto(
    Guid Id,
    string Name,
    string Brand,
    string Description,
    decimal Price,
    string SizesCsv,
    IReadOnlyList<string> Sizes,
    int StockQty,
    string ImageUrl);

public class ProductUpsertRequest
{
    [Required(ErrorMessage = "Product name is required")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Brand is required")]
    public string Brand { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    [Required(ErrorMessage = "At least one size is required")]
    public string SizesCsv { get; set; } = string.Empty;

    public int StockQty { get; set; }

    public string? ImageUrl { get; set; }
}
