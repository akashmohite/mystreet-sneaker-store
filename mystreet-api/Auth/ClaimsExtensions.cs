using System.Security.Claims;
using MyStreeT.Api.Common;

namespace MyStreeT.Api.Auth;

public static class ClaimsExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirst("sub")?.Value;
        return Guid.TryParse(raw, out var id)
            ? id
            : throw new UnauthorizedAppException("Please sign in to continue");
    }
}
