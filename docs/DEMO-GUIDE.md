# MyStreeT – Demo Guide (10–15 min)

**Before you start:** SQL Server reachable (LocalDB or Docker, see README). Demo logins: `admin@mystreet.com / Admin@12345`, `demo@mystreet.com / Demo@12345`.
Do a dry run first: if this is your first run on the machine, run `dotnet build`, `dotnet test`, `npm install`, `npm run build` ahead of the demo.

| # | Action | Expected result | Concept to explain |
|---|---|---|---|
| 1 | `cd mystreet-api && dotnet run --launch-profile http` | Console shows listening on `:5080`; DB created + seeded on first run | EF Core `EnsureCreated/Migrate`, idempotent seeding, config per environment |
| 2 | `cd mystreet-ui && npm run dev` | Vite on `:5173` | SPA + separate API, CORS allow-list |
| 3 | Open http://localhost:5173 | 50 sneakers with images, price, sizes, stock | Data comes from `GET /api/products`, not hard-coded |
| 4 | Say 30 seconds of architecture (see ARCHITECTURE.md) | – | Controllers → Services → EF; DTOs; DI |
| 5 | Brand filter → **Nike** | 9 Nike pairs; URL has `?brand=Nike` | Server-side filtering, URL as state (refresh keeps it) |
| 6 | Size filter → **11** (brand cleared) | Only pairs that have size 11 | Exact CSV match (`,11,`) so "1" never matches "10" |
| 7 | Open **Air Max 90** | Large image, brand, description, price, sizes | Route params, loading/not-found states |
| 8 | Click **Add to cart** without size | "Please select a size…" | Client validation with friendly messages |
| 9 | Pick size 9, quantity 2, **Add to cart** | Toast; header badge = 2 | Context API + `useReducer` |
| 10 | Add Ultraboost size 8, open **Cart**, press **+** on Air Max | Line totals and grand total update instantly | Pure reducer, unit-tested |
| 11 | Refresh the page | Cart and totals unchanged | `localStorage` persistence |
| 12 | Click **Checkout** (not logged in) | Redirected to Login, "cart is saved" | Protected routes + redirect back |
| 13 | **Register** a new user (e.g. `me@test.com` / `Password123`) | Signed in, returned to checkout; refresh keeps you signed in | BCrypt hash, JWT, persisted session |
| 14 | Press **Place order** empty | Field errors shown, nothing created | Client + server validation |
| 15 | Fill shipping, choose **Mock UPI** (or COD), **Place order** | "Order successfully placed" + Order ID; cart badge 0 | Server recomputes price; status `PLACED`; cart cleared only on success |
| 16 | **My Orders** → View | Same order, items, shipping, total | Ownership check: `/api/orders/mine`, `/api/orders/{id}` |
| 17 | **Logout** | Header back to Login/Register | Stateless JWT logout |
| 18 | Login as **admin** | **Admin** menu appears | `IsAdmin` → `Admin` role claim |
| 19 | Admin → **Add product** (empty save shows errors, then create "Demo Runner", Nike, 129.5, `8,9,10`, stock 7) | Appears in table and in the customer catalog | Admin CRUD, validation |
| 20 | **Edit** it (price 99) | Catalog shows $99.00 | PUT, immediate consistency |
| 21 | **Delete** it | Gone from admin table and catalog | DELETE (soft-deletes if it was ordered) |
| 22 | Open http://localhost:5080/swagger, **Authorize** with a normal-user token, try `POST /api/products` | **403** with structured error body | Backend authorization is mandatory, not just hidden UI |
| 23 | `dotnet test` (and `npm test` in the UI) | Test results; optionally coverage report | xUnit/Moq/FluentAssertions; business-logic focus |

Optional extras: run the Postman collection (37 requests); open two tabs and place orders at once (5–10 concurrent requests) to discuss stock handling.

## If evaluator asks…
- **Why JWT?** Stateless, easy for a SPA + API, works with Swagger/Postman. Trade-off: no server-side revocation; token in localStorage is XSS-sensitive → short expiry (2 h), validated issuer/audience/signature/lifetime. Cookies+CSRF would be the alternative.
- **Why BCrypt?** Slow, salted, adaptive hash designed for passwords; resists brute-force and rainbow tables. Never reversible; plain text never stored.
- **Why DTOs?** Decouple the API contract from the DB model, prevent over-posting (e.g. a client can't set `IsAdmin`, price or total) and over-exposure (`PasswordHash` never serialized).
- **Why a service layer?** Controllers stay thin; business rules (pricing, stock, ownership) are reusable and unit-testable with an in-memory DB and mocks.
- **Why EF Core?** Strongly-typed LINQ, parameterised queries (SQL-injection safe), migrations, relationship mapping.
- **Why localStorage for the cart?** Required by the brief; works for guests, survives refresh, no server state. Safe because the server never trusts it for prices.
- **Why is backend authorization still required?** Anyone can call the API directly with curl/Postman; hiding the Admin menu is cosmetic. `[Authorize(Roles="Admin")]` returns 403 regardless of the UI.
- **How is dependency injection used?** Services/hasher/token service are registered by interface in `Program.cs` and constructor-injected; tests substitute `IPasswordHasher`/`ITokenService` with Moq.
- **How are SOLID principles applied?** S: controller/service/validator split. O/L: new payment or token strategies via interfaces. I: small focused interfaces (`ITokenService`, `IPasswordHasher`). D: depend on abstractions, composed at the root.
- **How are errors handled?** Domain exceptions (`RequestValidationException`, `NotFoundException`, …) → `ExceptionHandlingMiddleware` → `{timestamp,path,error,message}`; JWT 401/403 use the same shape; unexpected errors return a generic 500 and are logged. The UI maps errors to friendly messages.
- **How could it scale later?** Stateless API behind a load balancer, Azure SQL, caching for the catalog, pagination/search, optimistic concurrency/reservations for stock, refresh tokens, background order processing.
- **How would we deploy to Azure?** API → App Service/Container Apps; DB → Azure SQL (managed identity); secrets → Key Vault/App Settings; UI → Static Web Apps; CI/CD via GitHub Actions (build, test, deploy); Application Insights for telemetry.
