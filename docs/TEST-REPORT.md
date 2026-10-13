# Test Report

**Date:** 2026-10-13 · **Environment:** Windows 10, .NET SDK 8, Node 24, SQLite (Development).

| Check | Command | Result |
|---|---|---|
| Backend build | `dotnet build` | 0 errors, 0 warnings |
| Backend unit tests | `dotnet test` | **90 passed, 0 failed** (xUnit, Moq, FluentAssertions, EF InMemory) |
| Backend coverage | `dotnet test --collect:"XPlat Code Coverage"` | **81% method (142/175), 69% line, 65% branch** - target >=60% met |
| Frontend build | `npm run build` | Succeeded |
| Frontend tests | `npm test` | 16 passed (cart reducer, validation) |
| Live API on SQLite | `dotnet run` + HTTP calls | DB created and seeded (50 products, admin, demo user); register, login, brand+size filter (Nike + 9 -> 3 results), order creation (status PLACED, server-side total), `GET /orders/mine`, non-admin `POST /products` -> 403, no token -> 401, empty order -> structured `VALIDATION_ERROR` |
| Visual check | Headless browser screenshots | Catalog, hero, product detail render with distinct product images |

Fix made while verifying: the test project lacked a global `using Xunit`, so it did not compile; added `<Using Include="Xunit" />`.

Not automated: the Puppeteer journeys in `tests/ui-e2e` run against a mock API; the live-API flow above was run manually/with curl. Concurrency (5-10 parallel requests) is a manual Postman Runner exercise.
