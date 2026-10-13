using Microsoft.EntityFrameworkCore;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProductService> _logger;

    public ProductService(AppDbContext db, ILogger<ProductService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync(string? brand, string? size)
    {
        var query = _db.Products.AsNoTracking().Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(brand))
        {
            var b = brand.Trim().ToLower();
            query = query.Where(p => p.Brand.ToLower() == b);
        }

        if (!string.IsNullOrWhiteSpace(size))
        {
            // Wrap in commas so size "1" can never match "10" or "11".
            var token = "," + size.Trim() + ",";
            query = query.Where(p => ("," + p.SizesCsv + ",").Contains(token));
        }

        var items = await query.OrderBy(p => p.Brand).ThenBy(p => p.Name).ToListAsync();
        return items.Select(p => p.ToDto()).ToList();
    }

    public async Task<ProductDto> GetByIdAsync(Guid id)
    {
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && p.IsActive);
        return product?.ToDto() ?? throw new NotFoundException("Product not found");
    }

    public async Task<ProductDto> CreateAsync(ProductUpsertRequest request)
    {
        var product = new Product { Id = Guid.NewGuid() };
        Apply(product, request);
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Product created: {ProductId}", product.Id);
        return product.ToDto();
    }

    public async Task<ProductDto> UpdateAsync(Guid id, ProductUpsertRequest request)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsActive)
                      ?? throw new NotFoundException("Product not found");
        Apply(product, request);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Product updated: {ProductId}", product.Id);
        return product.ToDto();
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsActive)
                      ?? throw new NotFoundException("Product not found");

        var usedInOrders = await _db.OrderItems.AnyAsync(i => i.ProductId == id);
        if (usedInOrders)
        {
            // Keep historical orders valid: hide instead of physically deleting.
            product.IsActive = false;
            _logger.LogInformation("Product deactivated (has orders): {ProductId}", id);
        }
        else
        {
            _db.Products.Remove(product);
            _logger.LogInformation("Product deleted: {ProductId}", id);
        }

        await _db.SaveChangesAsync();
    }

    private static void Apply(Product product, ProductUpsertRequest request)
    {
        if (request is null) throw new RequestValidationException("Product data is required");

        var name = (request.Name ?? string.Empty).Trim();
        var brand = (request.Brand ?? string.Empty).Trim();
        var description = (request.Description ?? string.Empty).Trim();

        if (name.Length == 0) throw new RequestValidationException("Product name is required");
        if (name.Length > 150) throw new RequestValidationException("Product name must be 150 characters or fewer");
        if (brand.Length == 0) throw new RequestValidationException("Brand is required");
        if (brand.Length > 80) throw new RequestValidationException("Brand must be 80 characters or fewer");
        if (description.Length > 2000) throw new RequestValidationException("Description must be 2000 characters or fewer");
        if (request.Price <= 0 || request.Price > 100000) throw new RequestValidationException("Price must be greater than 0 and at most 100000");
        if (decimal.Round(request.Price, 2) != request.Price) throw new RequestValidationException("Price can have at most 2 decimal places");
        if (request.StockQty < 0 || request.StockQty > 100000) throw new RequestValidationException("Stock quantity must be between 0 and 100000");

        product.Name = name;
        product.Brand = brand;
        product.Description = description;
        product.Price = request.Price;
        product.SizesCsv = Validators.NormalizeSizes(request.SizesCsv);
        product.StockQty = request.StockQty;
        product.ImageUrl = Validators.NormalizeImageUrl(request.ImageUrl);
    }
}
