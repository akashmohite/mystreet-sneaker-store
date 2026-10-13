using MyStreeT.Api.Entities;

namespace MyStreeT.Api.DTOs;

public static class Mappings
{
    public static ProductDto ToDto(this Product p) => new(
        p.Id, p.Name, p.Brand, p.Description, p.Price, p.SizesCsv,
        p.SizesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        p.StockQty, p.ImageUrl);

    public static OrderDto ToDto(this Order o) => new(
        o.Id, o.Status, o.PaymentMethod, o.Total, o.CreatedAt,
        o.ShippingName, o.ShippingAddress, o.ShippingCity, o.ShippingPostalCode, o.ShippingPhone,
        o.Items.Select(i => new OrderItemDto(
            i.ProductId, i.ProductName, i.ProductBrand, i.ImageUrl, i.Size, i.Quantity, i.UnitPrice,
            i.UnitPrice * i.Quantity)).ToList());
}
