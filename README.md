# MyStreeT – Sneaker Shopping App (Foundation Capstone, .NET Edition)

A small, complete sneaker store: browse → filter → pick a size → cart → login/register → checkout (COD / mock UPI) → order confirmation → order history, plus an admin product-management screen.

> **Status:** backend builds and all 90 xUnit tests pass (81% method / 69% line coverage); frontend builds and its 16 Vitest tests pass; the full flow (register, filter, order, admin CRUD, 401/403) was exercised against the running API on SQLite. Details: [docs/TEST-REPORT.md](docs/TEST-REPORT.md).

## Architecture

```
React + Vite + TS (mystreet-ui)  ──HTTP/JSON + JWT──▶  ASP.NET Core Web API (mystreet-api)  ──EF Core──▶  SQLite (local) / SQL Server
  Context API (auth, cart, toast)                        Controllers → Services → DbContext
  cart in localStorage                                   DTOs, validation, exception middleware
```
More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Technology stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router 7, Axios, Context API + `useReducer`, plain CSS |
| Backend | .NET 8, ASP.NET Core Web API (controllers), EF Core 8 (SQLite for local dev, SQL Server supported), JWT Bearer, BCrypt.Net-Next, Swagger (Swashbuckle) |
| Tests | xUnit, Moq, FluentAssertions, EF Core InMemory (backend); Vitest (frontend); Puppeteer + Newman (UI/contract checks) |

## Prerequisites
- .NET 8 SDK, Node.js 20+ (22 used), npm
- **No database server needed for local dev**: Development uses a SQLite file (`mystreet.dev.db`, created automatically). SQL Server (LocalDB/Docker) is optional.

## Repository structure
```
mystreet-api/        ASP.NET Core Web API (Controllers, Services, DTOs, Entities, Data, Auth, Common)
mystreet-ui/         React + Vite + TypeScript SPA
tests/MyStreeT.Tests xUnit/Moq/FluentAssertions unit tests
tests/ui-e2e/        Mock API + Puppeteer scenarios (UI journeys) 
database/schema.sql  Hand-written schema (optional alternative to EF)
postman/             Postman collection (37 requests, positive + negative)
docs/                ARCHITECTURE, DEMO-GUIDE, REQUIREMENT-CHECKLIST, TEST-REPORT
```

## Quick start

### 1. Database
**Default (Development): SQLite, nothing to install.** `appsettings.Development.json` sets `Database:Provider=Sqlite` and `ConnectionStrings:Default=Data Source=mystreet.dev.db`. The file is created and seeded on first run; delete it to reset the data.

To use SQL Server instead, set `Database__Provider=SqlServer` and a SQL Server connection string (options below).

**Option A – Windows LocalDB:** the default (non-Development) connection string in `mystreet-api/appsettings.json` is
`Server=(localdb)\MSSQLLocalDB;Database=MyStreeT;Trusted_Connection=True;TrustServerCertificate=True`.

**Option B – Docker SQL Server (macOS/Linux/Windows):**
```bash
cp .env.example .env            # edit MSSQL_SA_PASSWORD
docker compose up -d
# then point the API at it (user-secrets keeps the password out of git):
cd mystreet-api
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost,1433;Database=MyStreeT;User Id=sa;Password=<your password>;TrustServerCertificate=True"
```
(Or set the env var `ConnectionStrings__Default`.)

### 2. Backend
```bash
cd mystreet-api
dotnet restore
dotnet run --launch-profile http        # http://localhost:5080  (Swagger: /swagger)
```
In **Development** the API automatically creates the database and seeds demo data on startup (`Database:InitOnStartup` + `Seed:Enabled` in `appsettings.Development.json`). No manual SQL needed.

### 3. Frontend
```bash
cd mystreet-ui
cp .env.example .env     # optional; default API URL is http://localhost:5080
npm install
npm run dev              # http://localhost:5173
```

## Demo accounts (seeded in Development only)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@mystreet.com` | `Admin@12345` |
| Customer | `demo@mystreet.com` | `Demo@12345` |

Or just click **Register** (any valid email, password with 8+ chars incl. a letter and a number). These are local demo credentials read from `appsettings.Development.json`; they are **not seeded** outside Development. Passwords are stored only as BCrypt hashes.

## Database, migrations and seed data
- Schema: `AppDbContext` (Users, Products, Orders, OrderItems; FKs: Order→User, OrderItem→Order (cascade), OrderItem→Product (restrict)).
- Startup behaviour: if EF migrations exist they are applied; otherwise the schema is created with `EnsureCreated`. 
- **Generate the initial migration once** (recommended, so the repo contains real migrations):
  ```bash
  dotnet tool install --global dotnet-ef
  cd mystreet-api
  dotnet ef migrations add InitialCreate
  dotnet ef database update      # optional - the API also applies it at startup in Development
  ```
- Seed: 50 products (Nike, Jordan, Adidas, New Balance, Converse, Vans, Puma, Reebok, Asics, Saucony), 1 admin, 1 demo customer. Seeding is idempotent and tops up missing products by name.
- `database/schema.sql` mirrors the schema for manual setup.

## Configuration & secrets
| Setting | Where | Notes |
|---|---|---|
| `ConnectionStrings:Default` | appsettings / user-secrets / env | no password committed |
| `Jwt:Key` | **user-secrets or env `Jwt__Key`** | min 32 chars. Not committed. In Development, if unset, an ephemeral random key is generated per run (sessions end on restart). In any other environment the API refuses to start without it. |
| `Cors:Origins` | appsettings | `http://localhost:5173` by default |
| `Seed:*` | appsettings.Development.json | demo passwords, Development only |

```bash
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
```

## API overview (Swagger: http://localhost:5080/swagger)
| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account (always non-admin), returns JWT |
| POST | `/api/auth/login` | – | Returns `{ token, email, isAdmin, expiresAt }` |
| POST | `/api/auth/logout` | user | Validates token; client discards it (stateless JWT) |
| GET | `/api/products?brand=Nike&size=9` | – | List/filter (exact size match) |
| GET | `/api/products/{id}` | – | Details |
| POST / PUT / DELETE | `/api/products[/{id}]` | **Admin** | CRUD (delete hides products that already appear in orders) |
| POST | `/api/orders` | user | Create order (prices computed server-side), status `PLACED` |
| GET | `/api/orders/mine` | user | My orders |
| GET | `/api/orders/{id}` | user | Own order only (others → 404) |

Errors always look like `{ "timestamp", "path", "error", "message" }` with 400/401/403/404/409/500.

## Running tests
```bash
# Backend (needs NuGet access)
dotnet test                                                         # from repo root (90 tests)
dotnet test --collect:"XPlat Code Coverage"                        # coverage (coverlet)

# Frontend
cd mystreet-ui && npm test

# UI journeys against the mock API (no SQL Server needed)
cd mystreet-ui && npm run build
cd ../tests/ui-e2e && npm install
CHROME_PATH=/path/to/chrome ./run-e2e.sh
```
**Coverage:** the backend suite has 90 test cases focused on Auth/Product/Order services, token creation, validators and error middleware (the business logic). Measured result: 90 tests, **81% method coverage / 69% line coverage** (target ≥60%).

## Postman
Import `postman/MyStreeT.postman_collection.json`, start the API, then run the collection with the Collection Runner **in order**. Tokens/IDs are saved to collection variables by test scripts. Variables `adminEmail`/`adminPassword` default to the seeded admin.

## Assumptions & trade-offs
- **JWT (not cookies):** simple SPA↔API story and Swagger/Postman friendly; downside is XSS exposure of a token in `localStorage` and no server-side revocation (logout is client-side; tokens expire after 2 h). 
- **Cart in localStorage:** per requirements; it is display-only — the server re-prices everything from the DB.
- **`IsAdmin` flag → `Admin` role claim:** minimal authorization per brief; role changes apply at next login.
- **SizesCsv:** per brief; filtering wraps in commas so size `1` never matches `10`.
- **Stock:** validated and decremented on order; no reservation/concurrency control (out of Foundation scope).
- **Soft delete:** deleting a product that has been ordered sets `IsActive=false` so order history stays intact.
- **Money:** USD display, `decimal(18,2)` in SQL.
- **Registration auto-logs-in** and returns a token.

## AI-assisted development notes
This project was built with an AI assistant (Claude) acting as pair programmer. Example prompts used:
- "Act as a senior .NET architect: take the MyStreeT Foundation capstone PDF and produce a requirement → implementation → gap checklist before changing any code."
- "Write ASP.NET Core services for auth/products/orders with DTOs, DI, EF Core and a central exception middleware that returns `{timestamp,path,error,message}`."
- "Generate xUnit + Moq + FluentAssertions tests for OrderService: invalid quantity, insufficient stock, server-side pricing, other user's order → 404."
- "Write a Puppeteer script covering guest browse, register, cart persistence, checkout, admin CRUD and 403 checks."
- "Run `npm audit` and fix the advisories without breaking the build."

AI output was reviewed, compiled/tested where the environment allowed, and every claim of "verified" in `docs/TEST-REPORT.md` corresponds to a command that was actually run.

## Troubleshooting
| Symptom | Fix |
|---|---|
| API exits: `Jwt:Key must be configured` | Only in non-Development: set `Jwt__Key` (32+ chars). |
| `Cannot open database` / login failed | Check `ConnectionStrings:Default`; for Docker confirm the container is healthy and the SA password matches. LocalDB is Windows-only. |
| UI shows "Cannot reach the server" | API not running or `VITE_API_URL` wrong; CORS origins must include the UI origin. |
| Everything logs out after restarting the API (Development) | Expected with the ephemeral JWT key; set `Jwt:Key` via user-secrets to keep sessions. |
| Port 5173 in use | Vite is configured with `strictPort`; free the port (CORS is configured for 5173). |
| Seed data missing | Seeding runs only when `Seed:Enabled=true` (Development) and the Products table is empty. |
