using Microsoft.EntityFrameworkCore;
using MyStreeT.Api.Auth;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Data;

/// <summary>Seeds demo products and demo accounts. Passwords come from configuration and are hashed with BCrypt.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, IConfiguration config, ILogger logger)
    {
        var adminEmail = config["Seed:AdminEmail"] ?? "admin@mystreet.com";
        var adminPassword = config["Seed:AdminPassword"];
        var demoEmail = config["Seed:DemoUserEmail"] ?? "demo@mystreet.com";
        var demoPassword = config["Seed:DemoUserPassword"];

        if (!string.IsNullOrWhiteSpace(adminPassword) && !await db.Users.AnyAsync(u => u.Email == adminEmail))
        {
            db.Users.Add(new User { Id = Guid.NewGuid(), Email = adminEmail, PasswordHash = hasher.Hash(adminPassword), IsAdmin = true });
            logger.LogInformation("Seeded admin user {Email}", adminEmail);
        }

        if (!string.IsNullOrWhiteSpace(demoPassword) && !await db.Users.AnyAsync(u => u.Email == demoEmail))
        {
            db.Users.Add(new User { Id = Guid.NewGuid(), Email = demoEmail, PasswordHash = hasher.Hash(demoPassword), IsAdmin = false });
            logger.LogInformation("Seeded demo user {Email}", demoEmail);
        }

        // Top-up by name so an existing database also receives newly added catalogue entries.
        var existing = (await db.Products.Select(p => p.Name).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = Products().Where(p => !existing.Contains(p.Name)).ToList();
        if (missing.Count > 0)
        {
            db.Products.AddRange(missing);
            logger.LogInformation("Seeded {Count} demo products", missing.Count);
        }

        await db.SaveChangesAsync();
    }

    private static Product P(string name, string brand, decimal price, string sizes, int stock, string image, string description) =>
        new()
        {
            Id = Guid.NewGuid(), Name = name, Brand = brand, Price = price, SizesCsv = sizes,
            StockQty = stock, ImageUrl = $"/sneakers/{image}.svg", Description = description
        };

    private static IEnumerable<Product> Products() => new[]
    {
        P("Air Max 90", "Nike", 119.99m, "7,8,9,10", 50, "air-max-90", "A street classic with a visible Air unit, waffle outsole and layered leather upper."),
        P("Air Force 1 Low", "Nike", 109.99m, "6,7,8,9,10,11", 60, "air-force-1", "The clean court icon: durable leather, cupped sole and all-day cushioning."),
        P("Dunk Low Retro", "Nike", 114.99m, "7,8,9,10,11", 40, "dunk-low", "Basketball heritage turned everyday staple, with a padded collar and bold colour blocking."),
        P("Ultraboost Light", "Adidas", 139.99m, "7,8,9,10,11", 35, "ultraboost", "Responsive Boost cushioning and a sock-like Primeknit upper for long city miles."),
        P("Samba OG", "Adidas", 99.99m, "6,7,8,9,10", 45, "samba", "Terrace-born, suede-toed and gum-soled. Understated, always in rotation."),
        P("Gazelle", "Adidas", 94.99m, "7,8,9,10", 30, "gazelle", "Soft suede, a slim profile and the unmistakable three stripes."),
        P("574 Core", "New Balance", 89.99m, "7,8,9,10,11", 55, "nb-574", "Heritage runner silhouette with ENCAP midsole support for everyday comfort."),
        P("990v6", "New Balance", 199.99m, "8,9,10,11", 20, "nb-990", "Premium suede and mesh with a cushioned ENCAP and FuelCell midsole."),
        P("Chuck 70 High", "Converse", 89.99m, "6,7,8,9,10", 70, "chuck-70", "Heavier canvas, cushioned insole and vintage detailing on the iconic high-top."),
        P("Old Skool", "Vans", 74.99m, "6,7,8,9,10,11", 80, "old-skool", "The original side-stripe skate shoe with a durable suede and canvas upper."),
        P("Suede Classic XXI", "Puma", 79.99m, "7,8,9,10", 38, "puma-suede", "Soft suede, a formstrip and a legacy built on the 60s basketball court."),
        P("Classic Leather", "Reebok", 84.99m, "7,8,9,10,11", 42, "reebok-classic", "Soft garment leather and a die-cut EVA midsole in a timeless low-top profile."),
        P("Air Max 97", "Nike", 174.99m, "7,8,9,10,11", 28, "air-max-97", "Full-length Air and flowing metallic lines inspired by bullet trains."),
        P("Air Max 270", "Nike", 149.99m, "7,8,9,10,11", 33, "air-max-270", "A tall heel Air unit for all-day, lifestyle-first cushioning."),
        P("Blazer Mid 77", "Nike", 104.99m, "6,7,8,9,10", 36, "blazer-mid", "Vintage basketball styling with an exposed foam tongue and a clean leather upper."),
        P("Cortez", "Nike", 89.99m, "6,7,8,9,10,11", 44, "cortez", "The 1972 runner: simple, lightweight and unmistakably retro."),
        P("Pegasus 41", "Nike", 139.99m, "7,8,9,10,11", 31, "pegasus-41", "Responsive daily trainer with a breathable engineered mesh upper."),
        P("Air Huarache", "Nike", 129.99m, "7,8,9,10", 24, "air-huarache", "A sleeve-like inner bootie and heel cage for a locked-in fit."),
        P("Air Jordan 1 High OG", "Jordan", 179.99m, "7,8,9,10,11", 18, "jordan-1-chicago", "The original high-top silhouette in a bold red, white and black colour blocking."),
        P("Air Jordan 1 Bred", "Jordan", 169.99m, "7,8,9,10,11", 15, "jordan-1-bred", "Black and varsity red overlays on the court classic that started it all."),
        P("Air Jordan 4 Military", "Jordan", 209.99m, "8,9,10,11", 12, "jordan-4-military", "Mesh panels, wing eyelets and a visible heel Air unit in neutral grey."),
        P("Air Jordan 3 White Cement", "Jordan", 199.99m, "8,9,10,11", 14, "jordan-3-cement", "Elephant-print overlays and the first visible Air unit on a Jordan."),
        P("Air Jordan 11 Low", "Jordan", 189.99m, "7,8,9,10,11", 16, "jordan-11-low", "Patent leather mudguard and a carbon-fibre plate in a low-cut profile."),
        P("Stan Smith", "Adidas", 94.99m, "6,7,8,9,10,11", 65, "stan-smith", "Clean white leather with perforated stripes and a green heel tab."),
        P("Superstar", "Adidas", 99.99m, "6,7,8,9,10,11", 58, "superstar", "The shell-toe icon, from the basketball court to the street."),
        P("Campus 00s", "Adidas", 109.99m, "6,7,8,9,10", 40, "campus-00s", "Chunky 2000s proportions in soft suede with a gum-style cupsole."),
        P("Forum Low", "Adidas", 99.99m, "7,8,9,10,11", 37, "forum-low", "80s basketball heritage with a crisp leather upper and a clean low profile."),
        P("550", "New Balance", 119.99m, "7,8,9,10,11", 41, "nb-550", "A 1989 basketball shoe revived with premium leather and a retro cupsole."),
        P("327", "New Balance", 99.99m, "7,8,9,10,11", 39, "nb-327", "Racing-inspired design with an oversized N logo and lightweight foam."),
        P("2002R", "New Balance", 149.99m, "7,8,9,10,11", 26, "nb-2002r", "Early-2000s running tech with ABZORB cushioning and a metallic mesh upper."),
        P("Chuck Taylor All Star Low", "Converse", 69.99m, "6,7,8,9,10,11", 90, "chuck-low", "The timeless canvas low-top with a rubber toe cap."),
        P("One Star Pro", "Converse", 84.99m, "7,8,9,10", 34, "one-star", "A suede skate shoe with a cushioned insole and the signature star."),
        P("Run Star Hike", "Converse", 109.99m, "6,7,8,9,10", 27, "run-star-hike", "A chunky platform sole and jagged teeth under a classic high-top."),
        P("Sk8-Hi", "Vans", 79.99m, "6,7,8,9,10,11", 62, "sk8-hi", "The first Vans high-top with a padded collar and side stripe."),
        P("Authentic", "Vans", 59.99m, "6,7,8,9,10,11", 85, "authentic", "The original lace-up canvas shoe with a vulcanised waffle sole."),
        P("Era", "Vans", 64.99m, "6,7,8,9,10,11", 70, "era", "A low-profile skate staple with padded collars for support."),
        P("Knu Skool", "Vans", 84.99m, "6,7,8,9,10", 33, "knu-skool", "An oversized 90s skate look with a puffy tongue and bold laces."),
        P("Speedcat OG", "Puma", 99.99m, "6,7,8,9,10", 29, "speedcat", "Motorsport-inspired low profile with a slim driving-shoe silhouette."),
        P("Palermo", "Puma", 89.99m, "6,7,8,9,10", 35, "palermo", "A 70s terrace trainer with a suede toe and gum sole."),
        P("RS-X", "Puma", 109.99m, "7,8,9,10,11", 32, "rs-x", "Running System cushioning in a chunky, colour-blocked design."),
        P("Club C 85", "Reebok", 79.99m, "6,7,8,9,10,11", 53, "club-c-85", "A clean 80s tennis shoe in soft leather with a vintage midsole."),
        P("Question Mid", "Reebok", 139.99m, "7,8,9,10,11", 19, "question-mid", "Iconic basketball high-top with a distinctive two-tone toe."),
        P("Nano X4", "Reebok", 129.99m, "7,8,9,10,11", 30, "nano-x4", "A stable, flexible cross-training shoe built for varied workouts."),
        P("Gel-Kayano 14", "Asics", 159.99m, "7,8,9,10,11", 23, "gel-kayano-14", "Early-2000s running tech with a metallic mesh upper and GEL cushioning."),
        P("Gel-1130", "Asics", 119.99m, "7,8,9,10,11", 38, "gel-1130", "Retro running styling with breathable mesh and synthetic overlays."),
        P("Gel-Lyte III", "Asics", 129.99m, "7,8,9,10", 22, "gel-lyte-iii", "The split-tongue runner with a soft, flexible midsole."),
        P("GT-2160", "Asics", 139.99m, "7,8,9,10,11", 25, "gt-2160", "Stability running heritage with a dual-density midsole."),
        P("Shadow 6000", "Saucony", 119.99m, "7,8,9,10,11", 27, "shadow-6000", "Vintage 80s trainer with a ribbed midsole and suede overlays."),
        P("Jazz Original", "Saucony", 84.99m, "7,8,9,10", 43, "jazz-original", "A lightweight classic with a nylon and suede upper."),
        P("ProGrid Triumph 4", "Saucony", 129.99m, "7,8,9,10,11", 21, "progrid-triumph", "Cushioned 90s trainer with PWRGRID technology.")
    };
}
