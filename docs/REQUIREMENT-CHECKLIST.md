# Requirement Checklist

No repository existed when work started (only the capstone PDF), so every item was built new: "Existing implementation" is *none*.
**Status** = is it implemented in the code. **Verified by** = what was actually executed.
Legend for *Verified by*: **UI+mock** = Puppeteer vs mock API · **Logic** = executed harness / compile type-check · **Unit(UI)** = Vitest · **NOT RUN** = needs `dotnet restore` (NuGet blocked in authoring sandbox).

| # | Requirement | Implementation | Status | Gap / action | Verified by |
|---|---|---|---|---|---|
| 1 | Register / Login / Logout | `AuthController`, `AuthService`, UI pages, `AuthContext` | COMPLETE | Run backend to confirm | UI+mock; backend NOT RUN |
| 2 | BCrypt hashing | `BCryptPasswordHasher` | COMPLETE | – | NOT RUN (unit tests written with mocks) |
| 3 | JWT auth + persistence on refresh | `JwtTokenService`, bearer config, localStorage session | COMPLETE | – | UI+mock (refresh); JWT code NOT RUN |
| 4 | Admin flag, seeded admin, backend-protected admin APIs | `IsAdmin` → `Admin` role; `[Authorize(Roles)]`; `DbSeeder` | COMPLETE | – | UI+mock 403/401 (mock mirrors rules); real API NOT RUN |
| 5 | Product list (name, price, thumbnail, brand, sizes, stock) | `ProductsController`, `ProductsPage` | COMPLETE | – | UI+mock |
| 6 | Filters brand & size | `ProductService.GetAllAsync` | COMPLETE | EF translation of the size filter not run on SQL Server | UI+mock; unit tests written |
| 7 | Product detail + size selection + add to cart + validation | `ProductDetailPage` | COMPLETE | – | UI+mock |
| 8 | Cart add/remove/qty/total/localStorage/empty state | `cartReducer`, `CartContext`, `CartPage` | COMPLETE | – | Unit(UI) 9 tests; UI+mock |
| 9 | Checkout (shipping form, COD/Mock UPI, validation) | `CheckoutPage`, `OrderService` | COMPLETE | – | UI+mock |
| 10 | Order created with PLACED, returns ID, cart cleared only on success | `OrderService.CreateAsync`, `CheckoutPage` | COMPLETE | – | UI+mock (incl. failure keeps cart) |
| 11 | Confirmation page with Order ID | `OrderConfirmationPage` | COMPLETE | – | UI+mock |
| 12 | `GET /orders/mine`, `GET /orders/{id}` + ownership | `OrdersController`/`OrderService`; `OrdersPage` | COMPLETE | – | UI+mock (other user → 404) |
| 13 | Admin product CRUD UI | `AdminProductsPage` | COMPLETE | – | UI+mock (create/edit/delete reflected in catalog) |
| 14 | Server-side validation; never trust browser prices | `Validators`, services, DTOs without price fields | COMPLETE | – | Logic (Validators executed: 25 checks); service rules NOT RUN |
| 15 | Structured error body; 400/401/403/404/500 | `ExceptionHandlingMiddleware`, JWT events, model-state factory | COMPLETE | – | UI+mock; real middleware NOT RUN |
| 16 | Data model + EF migrations + seed ≥ 8 products | Entities, `AppDbContext`, `DbSeeder` (50 products) | PARTIAL | **Migration files not generated** (needs `dotnet ef`); app falls back to `EnsureCreated`. Run `dotnet ef migrations add InitialCreate`. | NOT RUN |
| 17 | Swagger | Swashbuckle in Development, JWT Authorize button | COMPLETE | – | NOT RUN |
| 18 | Unit tests xUnit/Moq/FluentAssertions, ≥60% coverage | 51 test methods | PARTIAL | Written, **not executed, coverage not measured** | NOT RUN |
| 19 | Postman collection | `postman/…json` (37 requests) | COMPLETE | Needs a run vs the real API | Newman vs mock: 37/37, 72 assertions |
| 20 | Frontend tests (optional) | Vitest: cart reducer, validation | COMPLETE | – | Unit(UI) 16 passing |
| 21 | Frontend UX: header, loading/empty/error/success states, responsive, no broken images | Components + CSS + image fallback | COMPLETE | Visual polish not reviewed by screenshot | UI+mock (images load, mobile menu, no overflow) |
| 22 | Security review | See below | COMPLETE | – | Review + `npm audit` (0) |
| 23 | Docs: README, DEMO-GUIDE, ARCHITECTURE, TEST-REPORT | `README.md`, `docs/` | COMPLETE | – | – |
| 24 | AI-assisted notes with prompts | README | COMPLETE | – | – |
| 25 | Git branching / PRs, Agile | n/a to this deliverable | NOT APPLICABLE | Team process | – |
| 26 | Stretch goals (pagination, search, upload, Docker app, Azure) | Docker Compose for SQL Server only | NOT APPLICABLE | Optional | – |

## Security review (summary)
| Item | Result |
|---|---|
| Plain-text passwords | None; BCrypt only. |
| Hard-coded secrets / JWT key in source | None. Key from secrets/env; Development uses an ephemeral random key; other envs fail fast. Demo seed passwords live in `appsettings.Development.json` (local demo only, not seeded elsewhere). |
| SQL injection | EF Core LINQ only (parameterised); no raw SQL. |
| Missing authorization / admin APIs | Admin writes require `Admin` role; orders require auth and filter by owner. |
| Excessive data exposure | DTOs only; `PasswordHash` never returned; login errors don't reveal whether an email exists. |
| Unsafe exceptions | Central middleware returns generic 500; details only in logs. |
| CORS | Allow-list from config (no wildcard). |
| Packages | UI: `npm audit` = 0 after upgrading Vite/Vitest/React Router. API: floating `8.0.*` for Microsoft packages, BCrypt.Net-Next 4.0.3, Swashbuckle 6.6.2 – **run `dotnet list package --vulnerable`** (not possible offline). |
| Client-only security | None relied upon; verified 403/401 via direct API calls. |
| Known residual risks | JWT in localStorage (XSS), no token revocation, no rate limiting/lockout, no HTTPS redirect configured for local demo, no stock concurrency control. |
