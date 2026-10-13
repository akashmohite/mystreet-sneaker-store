using MyStreeT.Api.DTOs;

namespace MyStreeT.Api.Services;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetAllAsync(string? brand, string? size);
    Task<ProductDto> GetByIdAsync(Guid id);
    Task<ProductDto> CreateAsync(ProductUpsertRequest request);
    Task<ProductDto> UpdateAsync(Guid id, ProductUpsertRequest request);
    Task DeleteAsync(Guid id);
}
