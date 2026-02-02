# Coding Style

## Stack Detection (CRITICAL)

BEFORE writing any code, detect the project's tech stack:
- **JavaScript/TypeScript**: `package.json`, `*.ts`, `*.js`, `tsconfig.json`
- **.NET Core/C#**: `*.csproj`, `*.sln`, `appsettings.json`, `Program.cs`
- **Python**: `requirements.txt`, `pyproject.toml`, `*.py`

If .NET Core is detected, follow `rules/dotnet-core.md` for C#-specific standards.

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate (where applicable):

### JavaScript/TypeScript:
```javascript
// WRONG: Mutation
function updateUser(user, name) {
  user.name = name  // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user, name) {
  return {
    ...user,
    name
  }
}
```

### C#/.NET Core:
```csharp
// WRONG: Mutating passed object
public void UpdateUser(User user, string name)
{
    user.Name = name; // Mutating input
}

// CORRECT: Return new instance or use record types
public User UpdateUser(User user, string name)
{
    return user with { Name = name }; // C# record with-expression
}
```

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large components
- Organize by feature/domain, not by type

## Error Handling

ALWAYS handle errors comprehensively:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

## Input Validation

ALWAYS validate user input:

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)
- [ ] Stack-specific rules applied (.NET Core: see `rules/dotnet-core.md`)
