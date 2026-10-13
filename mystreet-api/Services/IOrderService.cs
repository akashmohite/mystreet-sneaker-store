using MyStreeT.Api.DTOs;

namespace MyStreeT.Api.Services;

public interface IOrderService
{
    Task<OrderDto> CreateAsync(Guid userId, CreateOrderRequest request);
    Task<IReadOnlyList<OrderDto>> GetMineAsync(Guid userId);
    Task<OrderDto> GetByIdAsync(Guid userId, Guid orderId);
}
