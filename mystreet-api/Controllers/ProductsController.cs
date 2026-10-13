using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyStreeT.Api.Auth;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Services;

namespace MyStreeT.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _products;

    public ProductsController(IProductService products) => _products = products;

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll([FromQuery] string? brand, [FromQuery] string? size)
        => Ok(await _products.GetAllAsync(brand, size));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductDto>> GetById(Guid id)
        => Ok(await _products.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = JwtTokenService.AdminRole)]
    public async Task<ActionResult<ProductDto>> Create(ProductUpsertRequest request)
    {
        var created = await _products.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = JwtTokenService.AdminRole)]
    public async Task<ActionResult<ProductDto>> Update(Guid id, ProductUpsertRequest request)
        => Ok(await _products.UpdateAsync(id, request));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = JwtTokenService.AdminRole)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _products.DeleteAsync(id);
        return NoContent();
    }
}
