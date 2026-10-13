# MyStreeT – Architecture

## Overview
```
┌────────────────────────── Browser ──────────────────────────┐
│ React SPA (Vite, TS)                                         │
│  Pages ─▶ Contexts (Auth, Cart, Toast) ─▶ api/client.ts      │
│  localStorage: mystreet.auth (JWT+user), mystreet.cart       │
└───────────────────────────┬──────────────────────────────────┘
                            │ JSON over HTTP, Authorization: Bearer <JWT>
┌───────────────────────────▼──────────────────────────────────┐
│ ASP.NET Core Web API                                         │
│  Middleware: ExceptionHandling → CORS → AuthN → AuthZ        │
│  Controllers (thin) ─▶ Services (business rules) ─▶ AppDbContext
│  DTOs ⇄ Entities (Mappings)   Validators   Auth (JWT, BCrypt)│
└───────────────────────────┬──────────────────────────────────┘
                            │ EF Core
                     SQL Server (Users, Products, Orders, OrderItems)
```

## Backend layers (`mystreet-api`)
| Folder | Responsibility |
|---|---|
| `Controllers/` | HTTP only: routing, `[Authorize]`, status codes. No business logic. |
| `Services/` | `AuthService`, `ProductService`, `OrderService` behind interfaces (DI). All rules live here (validation, pricing, stock, ownership). |
| `DTOs/` | Request/response contracts. Entities never leave the API; order requests carry **no prices**. |
| `Entities/` + `Data/` | EF Core entities, `AppDbContext` (constraints, indexes, FKs), `DbSeeder`. |
| `Auth/` | `ITokenService`/`JwtTokenService`, `IPasswordHasher`/BCrypt wrapper, claims helper. |
| `Common/` | Exceptions → HTTP mapping, `ExceptionHandlingMiddleware`, `ErrorResponse`, `Validators`. |

### Data model
`User 1─* Order 1─* OrderItem *─1 Product`. `OrderItem` snapshots product name/brand/image/unit price at purchase time. `Product.IsActive` supports hiding products already referenced by orders.

### Security design
- BCrypt hashes; no plaintext anywhere. Public registration can never create an admin.
- JWT (HS256, 2 h) with `sub`, `email`, `role` (`Admin`/`User`). Key from secrets/env, never committed.
- **Authorization is enforced on the server:** `[Authorize(Roles="Admin")]` on product writes; `[Authorize]` on orders. The UI hides admin links but is not relied on.
- Order reads filter by the caller's user id, so another user's order is indistinguishable from a missing one (404).
- Server-side validation of every input; price/total always recomputed from DB.
- Errors: AppExceptions → structured JSON; unexpected exceptions → generic 500 (details only in logs). 401/403 from the JWT middleware use the same body.
- CORS restricted to configured origins. Swagger only in Development.

### Request flow – place order
1. UI validates the form, sends `{shipping…, paymentMethod, items:[{productId,size,quantity}]}`.
2. `OrdersController` extracts the user id from the token → `OrderService.CreateAsync`.
3. Service validates fields/items, merges duplicates, loads active products, checks size & stock, takes `Product.Price`, decrements stock, computes the total, sets `PLACED`, saves once.
4. Response `201` with `OrderDto`; UI clears the cart **only after** success and navigates to `/order-confirmation/{id}`.

## Frontend (`mystreet-ui`)
- Routing: React Router; `ProtectedRoute` (auth) and `adminOnly` variant (shows *Access denied* for non-admins).
- State: `AuthContext` (session in localStorage, expiry check, sync across tabs, auto sign-out on 401), `CartContext` + pure `cartReducer` (unit-tested; persisted on every change), `ToastContext`.
- API: one Axios instance; `getErrorMessage` maps failures to friendly text (never raw exceptions).
- UX: loading/empty/error states, field-level validation, responsive layout, image fallback.

## Scaling / Azure path
Stateless API → scale out behind Azure App Service/Container Apps; Azure SQL; secrets in Key Vault / App Settings (`Jwt__Key`, connection string via managed identity); static UI on Azure Static Web Apps or Blob+CDN; Application Insights for logs. Later: pagination/search, refresh tokens, optimistic concurrency on stock, Redis cache for the catalog, background order processing.
