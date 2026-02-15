# .NET Core Project Rules

## Project Detection

When working in a project, ALWAYS check for .NET Core indicators:
- `*.csproj` or `*.sln` files present
- `appsettings.json` or `appsettings.*.json` files
- `Program.cs`, `Startup.cs`
- `Controllers/`, `Services/`, `Models/` directories

If .NET Core is detected, these rules MUST be followed.
For code examples and patterns, invoke `/dotnet-core-standards`.

## Mandatory Practices

### 1. Async/Await
- ALL async methods MUST end with `Async` suffix
- ALWAYS use `CancellationToken` parameter
- NEVER block on async (no `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`)
- NO `async void` except event handlers

### 2. Dependency Injection
- ALWAYS use constructor injection
- NEVER use service locator pattern
- Register services in `Program.cs` or dedicated extension methods
- Use appropriate lifetime (Singleton, Scoped, Transient)

### 3. Error Handling
- ALWAYS log errors with structured logging (`ILogger<T>`)
- Include correlation/request IDs in logs
- Create custom exceptions for domain errors
- Use global exception middleware
- NEVER use string concatenation/interpolation in log templates

### 4. API Design
- Controllers MUST be thin - logic goes in services
- Use DTOs for API contracts (never expose entities directly)
- Always return appropriate HTTP status codes
- Use `[ApiController]` attribute
- Document endpoints with `[ProducesResponseType]`

### 5. Entity Framework Core
- Use `DbContext` with dependency injection
- Apply configurations via `IEntityTypeConfiguration<T>`
- Use migrations for schema changes
- NEVER use lazy loading without explicit reason
- Always use `AsNoTracking()` for read-only queries

### 6. Configuration & NO HARDCODED VALUES (CRITICAL)
- Use Options pattern (`IOptions<T>`)
- NEVER hardcode connection strings, secrets, API keys, tokens, URLs, file paths
- NEVER use magic numbers - define named constants
- Use environment-specific `appsettings.{Environment}.json`
- Use User Secrets for local development
- Use environment variables or Key Vault for production secrets

### 7. Validation
- Validate ALL user input
- Use FluentValidation or Data Annotations
- Validate at controller/endpoint level
- Return 400 Bad Request for validation errors

### 8. Naming Conventions
- PascalCase: classes, methods, properties, public fields
- camelCase: local variables, parameters
- _camelCase: private fields (underscore prefix)
- IPascalCase: interfaces (I prefix)
- UPPER_CASE: constants only

### 9. Immutability
- Prefer record types for DTOs and value objects
- Use `with` expressions for modifications
- Return new instances instead of mutating parameters

## Code Structure (Clean Architecture)

```
src/
├── ProjectName.API/           # Controllers, middleware
├── ProjectName.Application/   # Services, DTOs, interfaces
├── ProjectName.Domain/        # Entities, value objects
├── ProjectName.Infrastructure/# Data access, external services
└── ProjectName.Tests/         # Unit & integration tests
```

## Forbidden Practices

- NO hardcoded configuration values (connection strings, URLs, paths)
- NO hardcoded secrets (API keys, tokens, passwords, credentials)
- NO magic numbers (use named constants)
- NO service locator pattern
- NO async void (except event handlers)
- NO blocking async calls
- NO exposing EF entities in API responses
- NO fat controllers with business logic
- NO catching generic Exception without logging
- NO ignoring CancellationToken
