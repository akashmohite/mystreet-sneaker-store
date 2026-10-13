using Microsoft.EntityFrameworkCore;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).IsRequired().HasMaxLength(254);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.PasswordHash).IsRequired().HasMaxLength(100);
        });

        b.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(150);
            e.Property(x => x.Brand).IsRequired().HasMaxLength(80);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.SizesCsv).IsRequired().HasMaxLength(200);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.HasIndex(x => x.Brand);
        });

        b.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ShippingName).IsRequired().HasMaxLength(100);
            e.Property(x => x.ShippingAddress).IsRequired().HasMaxLength(300);
            e.Property(x => x.ShippingCity).IsRequired().HasMaxLength(100);
            e.Property(x => x.ShippingPostalCode).IsRequired().HasMaxLength(10);
            e.Property(x => x.ShippingPhone).IsRequired().HasMaxLength(20);
            e.Property(x => x.PaymentMethod).IsRequired().HasMaxLength(20);
            e.Property(x => x.Status).IsRequired().HasMaxLength(20);
            e.Property(x => x.Total).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.User).WithMany(u => u.Orders).HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.UserId);
        });

        b.Entity<OrderItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ProductName).IsRequired().HasMaxLength(150);
            e.Property(x => x.ProductBrand).IsRequired().HasMaxLength(80);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Size).IsRequired().HasMaxLength(10);
            e.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Order).WithMany(o => o.Items).HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
