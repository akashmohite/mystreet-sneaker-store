-- MyStreeT - SQL Server schema (alternative to EF Core migrations / EnsureCreated).
-- Use this only if you prefer to create the schema manually. The API creates the same
-- schema automatically at startup in Development (see README). Seed data is inserted by the
-- API (passwords must be BCrypt-hashed, which cannot be done in plain SQL).
-- NOTE: hand-written to mirror AppDbContext; not executed in the authoring environment.

IF DB_ID('MyStreeT') IS NULL CREATE DATABASE MyStreeT;
GO
USE MyStreeT;
GO

CREATE TABLE Users (
    Id            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Email         NVARCHAR(254)    NOT NULL,
    PasswordHash  NVARCHAR(100)    NOT NULL,
    IsAdmin       BIT              NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2        NOT NULL
);
CREATE UNIQUE INDEX IX_Users_Email ON Users(Email);

CREATE TABLE Products (
    Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name        NVARCHAR(150)    NOT NULL,
    Brand       NVARCHAR(80)     NOT NULL,
    Description NVARCHAR(2000)   NULL,
    Price       DECIMAL(18,2)    NOT NULL,
    SizesCsv    NVARCHAR(200)    NOT NULL,
    StockQty    INT              NOT NULL,
    ImageUrl    NVARCHAR(500)    NULL,
    IsActive    BIT              NOT NULL DEFAULT 1
);
CREATE INDEX IX_Products_Brand ON Products(Brand);

CREATE TABLE Orders (
    Id                 UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId             UNIQUEIDENTIFIER NOT NULL,
    ShippingName       NVARCHAR(100)    NOT NULL,
    ShippingAddress    NVARCHAR(300)    NOT NULL,
    ShippingCity       NVARCHAR(100)    NOT NULL,
    ShippingPostalCode NVARCHAR(10)     NOT NULL,
    ShippingPhone      NVARCHAR(20)     NOT NULL,
    PaymentMethod      NVARCHAR(20)     NOT NULL,
    Status             NVARCHAR(20)     NOT NULL,
    CreatedAt          DATETIME2        NOT NULL,
    Total              DECIMAL(18,2)    NOT NULL,
    CONSTRAINT FK_Orders_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
CREATE INDEX IX_Orders_UserId ON Orders(UserId);

CREATE TABLE OrderItems (
    Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    OrderId      UNIQUEIDENTIFIER NOT NULL,
    ProductId    UNIQUEIDENTIFIER NOT NULL,
    ProductName  NVARCHAR(150)    NOT NULL,
    ProductBrand NVARCHAR(80)     NOT NULL,
    ImageUrl     NVARCHAR(500)    NULL,
    Size         NVARCHAR(10)     NOT NULL,
    Quantity     INT              NOT NULL,
    UnitPrice    DECIMAL(18,2)    NOT NULL,
    CONSTRAINT FK_OrderItems_Orders   FOREIGN KEY (OrderId)   REFERENCES Orders(Id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);
CREATE INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
CREATE INDEX IX_OrderItems_ProductId ON OrderItems(ProductId);
GO
