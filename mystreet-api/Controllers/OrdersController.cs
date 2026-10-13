using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyStreeT.Api.Auth;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Services;

namespace MyStreeT.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders) => _orders = orders;

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var order = await _orders.CreateAsync(User.GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetMine()
        => Ok(await _orders.GetMineAsync(User.GetUserId()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id)
        => Ok(await _orders.GetByIdAsync(User.GetUserId(), id));
}
