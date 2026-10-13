using System.ComponentModel.DataAnnotations;

namespace MyStreeT.Api.DTOs;

/// <summary>
/// Note: no prices or totals are accepted from the client - they are always
/// calculated on the server from product data.
/// </summary>
public class CreateOrderRequest
{
    [Required(ErrorMessage = "Full name is required")]
    public string ShippingName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Shipping address is required")]
    public string ShippingAddress { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required")]
    public string ShippingCity { get; set; } = string.Empty;

    [Required(ErrorMessage = "Postal code is required")]
    public string ShippingPostalCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required")]
    public string ShippingPhone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Payment method is required")]
    public string PaymentMethod { get; set; } = string.Empty;

    public List<CreateOrderItemRequest> Items { get; set; } = new();
}

public class CreateOrderItemRequest
{
    public Guid ProductId { get; set; }
    public string Size { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public record OrderItemDto(
    Guid ProductId,
    string ProductName,
    string Brand,
    string ImageUrl,
    string Size,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public record OrderDto(
    Guid Id,
    string Status,
    string PaymentMethod,
    decimal Total,
    DateTime CreatedAt,
    string ShippingName,
    string ShippingAddress,
    string ShippingCity,
    string ShippingPostalCode,
    string ShippingPhone,
    IReadOnlyList<OrderItemDto> Items);
