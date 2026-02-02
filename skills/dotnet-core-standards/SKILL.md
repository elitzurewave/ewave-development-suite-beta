---
name: dotnet-core-standards
description: .NET Core coding standards, best practices, and patterns for C# development including ASP.NET Core Web API, Entity Framework Core, and clean architecture.
---

# .NET Core Coding Standards & Best Practices

Coding standards for .NET Core / ASP.NET Core projects.

## Project Detection

This skill applies when the project contains:
- `*.csproj` files
- `*.sln` files
- `appsettings.json`
- `Program.cs` or `Startup.cs`
- Directories like `Controllers/`, `Services/`, `Models/`

## Code Quality Principles

### 1. Follow Microsoft Naming Conventions
- **PascalCase** for classes, methods, properties, public fields
- **camelCase** for local variables, parameters
- **_camelCase** for private fields (with underscore prefix)
- **IPascalCase** for interfaces (prefix with I)
- **UPPER_CASE** only for constants

### 2. Async/Await Best Practices

```csharp
// GOOD: Proper async naming and pattern
public async Task<User> GetUserByIdAsync(int id, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}

// BAD: Blocking async calls
public User GetUserById(int id)
{
    return _context.Users.FirstOrDefaultAsync(u => u.Id == id).Result; // NEVER DO THIS
}
```

### 3. Dependency Injection

```csharp
// GOOD: Constructor injection
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}

// BAD: Service locator pattern
public class UserService
{
    public void DoSomething()
    {
        var repo = ServiceLocator.Get<IUserRepository>(); // AVOID
    }
}
```

## ASP.NET Core Web API Patterns

### Controller Structure

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);

        if (user is null)
        {
            _logger.LogWarning("User with ID {UserId} not found", id);
            return NotFound();
        }

        return Ok(user);
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var user = await _userService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }
}
```

### Service Layer Pattern

```csharp
public interface IUserService
{
    Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default);
    Task<UserDto> UpdateAsync(int id, UpdateUserDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository repository,
        IMapper mapper,
        ILogger<UserService> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _repository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default)
    {
        var entity = _mapper.Map<User>(dto);

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created user with ID {UserId}", entity.Id);

        return _mapper.Map<UserDto>(entity);
    }
}
```

### Repository Pattern with EF Core

```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    void Update(T entity);
    void Remove(T entity);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly ApplicationDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    public virtual async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddAsync(entity, cancellationToken);
    }

    public virtual void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public virtual void Remove(T entity)
    {
        _dbSet.Remove(entity);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
```

## Error Handling

### Global Exception Handler Middleware

```csharp
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, exception.Message),
            ValidationException => (StatusCodes.Status400BadRequest, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            _ => (StatusCodes.Status500InternalServerError, "An internal error occurred")
        };

        context.Response.StatusCode = statusCode;

        var response = new { error = message };
        await context.Response.WriteAsJsonAsync(response);
    }
}
```

### Custom Exceptions

```csharp
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string entityName, object id)
        : base($"{entityName} with ID {id} was not found") { }
}

public class ValidationException : Exception
{
    public IEnumerable<string> Errors { get; }

    public ValidationException(IEnumerable<string> errors) : base("Validation failed")
    {
        Errors = errors;
    }
}
```

## Validation with FluentValidation

```csharp
public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255);

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password must contain uppercase letter")
            .Matches("[a-z]").WithMessage("Password must contain lowercase letter")
            .Matches("[0-9]").WithMessage("Password must contain digit");
    }
}
```

## Entity Framework Core Patterns

### DbContext Configuration

```csharp
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-set audit fields
        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
```

### Entity Configuration

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasMany(u => u.Orders)
            .WithOne(o => o.User)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

## Project Structure (Clean Architecture)

```
src/
├── ProjectName.API/                 # Presentation layer
│   ├── Controllers/
│   ├── Middleware/
│   ├── Filters/
│   └── Program.cs
├── ProjectName.Application/         # Application/Business logic layer
│   ├── DTOs/
│   ├── Interfaces/
│   ├── Services/
│   ├── Validators/
│   └── Mappings/
├── ProjectName.Domain/              # Domain layer (entities, value objects)
│   ├── Entities/
│   ├── Enums/
│   ├── Exceptions/
│   └── Interfaces/
├── ProjectName.Infrastructure/      # Infrastructure layer
│   ├── Data/
│   │   ├── Configurations/
│   │   ├── Migrations/
│   │   └── ApplicationDbContext.cs
│   ├── Repositories/
│   └── Services/
└── ProjectName.Tests/               # Test projects
    ├── Unit/
    └── Integration/
```

## NO Hardcoded Values (CRITICAL)

NEVER hardcode any of the following - always use configuration:

### What MUST NOT be hardcoded:
- Connection strings
- API keys / secrets / tokens
- URLs (API endpoints, base URLs)
- Credentials (usernames, passwords)
- Magic numbers (timeouts, limits, thresholds)
- File paths
- Email addresses
- Feature flags

### BAD Examples (NEVER DO THIS):

```csharp
// WRONG: Hardcoded connection string
var connectionString = "Server=myserver;Database=mydb;User=admin;Password=secret123;";

// WRONG: Hardcoded API key
var apiKey = "sk-1234567890abcdef";

// WRONG: Hardcoded URL
var apiUrl = "https://api.example.com/v1";

// WRONG: Magic numbers
if (retryCount > 3) { }
await Task.Delay(5000);

// WRONG: Hardcoded paths
var logPath = "C:\\Logs\\app.log";

// WRONG: Hardcoded email
var adminEmail = "admin@company.com";
```

### GOOD Examples (DO THIS):

```csharp
// GOOD: Connection string from configuration
var connectionString = _configuration.GetConnectionString("DefaultConnection");

// GOOD: API key from configuration/secrets
var apiKey = _configuration["ExternalApi:ApiKey"];

// GOOD: URL from configuration
var apiUrl = _options.Value.BaseUrl;

// GOOD: Named constants for magic numbers
private const int MaxRetryCount = 3;
private const int RetryDelayMs = 5000;

if (retryCount > MaxRetryCount) { }
await Task.Delay(RetryDelayMs);

// GOOD: Path from configuration
var logPath = _configuration["Logging:FilePath"];

// GOOD: Email from configuration
var adminEmail = _options.Value.AdminEmail;
```

### Where to Store Configuration:

| Environment | Storage Method |
|-------------|----------------|
| Local Dev | `appsettings.Development.json` + User Secrets |
| Testing | `appsettings.Testing.json` |
| Production | Environment variables / Azure Key Vault / AWS Secrets Manager |

```bash
# User Secrets for local development (NEVER commit these)
dotnet user-secrets set "ExternalApi:ApiKey" "your-api-key"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "your-conn-string"
```

## Configuration & Options Pattern

```csharp
// appsettings.json section
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; }
}

// Registration in Program.cs
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

// Usage with IOptions
public class TokenService
{
    private readonly JwtSettings _jwtSettings;

    public TokenService(IOptions<JwtSettings> jwtSettings)
    {
        _jwtSettings = jwtSettings.Value;
    }
}
```

## Logging Best Practices

```csharp
// GOOD: Structured logging with proper log levels
_logger.LogInformation("User {UserId} logged in from {IpAddress}", userId, ipAddress);
_logger.LogWarning("Failed login attempt for user {Email}", email);
_logger.LogError(exception, "Error processing order {OrderId}", orderId);

// BAD: String concatenation in logs
_logger.LogInformation("User " + userId + " logged in"); // AVOID
_logger.LogInformation($"User {userId} logged in"); // AVOID - no structured data
```

## Code Quality Checklist

Before marking work complete:
- [ ] All public APIs have XML documentation comments
- [ ] Async methods end with `Async` suffix
- [ ] All async methods accept `CancellationToken`
- [ ] Constructor parameters validated (null checks)
- [ ] Proper use of `readonly` for fields
- [ ] No `async void` except for event handlers
- [ ] Proper error handling with logging
- [ ] Input validation using FluentValidation or Data Annotations
- [ ] No hardcoded connection strings or secrets
- [ ] Using `ILogger<T>` for structured logging
- [ ] DTOs used for API contracts (not entities)
- [ ] Repository pattern for data access

## Common Anti-Patterns to Avoid

1. **Service Locator** - Use constructor injection instead
2. **Async void** - Always return Task
3. **Blocking async calls** - Never use `.Result` or `.Wait()`
4. **Fat controllers** - Move logic to services
5. **Exposing entities** - Use DTOs for API responses
6. **Hardcoded config** - Use IOptions pattern
7. **Catching generic Exception** - Catch specific exceptions
8. **Not using CancellationToken** - Always propagate tokens
