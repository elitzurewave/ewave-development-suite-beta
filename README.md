# Ewave Development Suite (Beta)

Enterprise .NET development workflow optimized for Claude Code with TDD, security review, code quality enforcement, and multi-agent orchestration.

## Features

### 📊 Custom Statusline
Beautiful terminal statusline showing:
- Current user and hostname
- Working directory
- Git branch (if in a git repo)
- Color-coded for easy reading

Format: `username@hostname:/path/to/project (git:branch)`

### 🤖 Specialized Agents
- **architect** - System design and architectural decisions
- **build-error-resolver** - Fix build errors and type issues
- **code-reviewer** - Comprehensive code quality review
- **database-reviewer** - PostgreSQL query optimization and schema design
- **doc-updater** - Documentation and codemap management
- **e2e-runner** - End-to-end testing with Playwright
- **planner** - Implementation planning for complex features
- **refactor-cleaner** - Dead code cleanup and refactoring
- **security-reviewer** - Security vulnerability detection
- **tdd-guide** - Test-driven development enforcement

### 📜 Development Rules
- **.NET Core Standards** - C#/.NET 10 best practices, async/await, DI, EF Core
- **Coding Style** - Immutability, file organization, error handling
- **Git Workflow** - Conventional commits, PR templates
- **Security** - Secret management, input validation, OWASP protection
- **Testing** - 80%+ coverage requirement, TDD workflow
- **Performance** - Model selection, context management

### 🎯 Skills
- **backend-patterns** - API design, database optimization
- **coding-standards** - Universal TypeScript/JavaScript/C# standards
- **dotnet-core-standards** - .NET Core specific patterns
- **frontend-patterns** - React, Next.js, state management
- **postgres-patterns** - PostgreSQL optimization
- **security-review** - Comprehensive security checklist
- **tdd-workflow** - Test-driven development patterns

### ⚡ Commands
- `/plan` - Create implementation plan before coding
- `/code-review` - Review code quality and security
- `/tdd` - Enforce test-first development
- `/build-fix` - Fix build and type errors
- `/refactor-clean` - Remove dead code
- `/update-docs` - Update documentation
- `/checkpoint` - Save progress checkpoint
- `/verify` - Verify implementation completeness

### 🪝 Hooks
- **Pre-commit** - Block unnecessary documentation files
- **Post-edit** - Auto-format with Prettier, TypeScript checking
- **Console.log detection** - Warn about debug statements
- **Git push reminder** - Review changes before push
- **PR creation** - Log PR URL and review commands
- **Session management** - Persist state, evaluate patterns

## Installation

### From Ewave Marketplace (Recommended)

1. **Open Claude Code**

2. **In the chat, type:**
```
/plugin marketplace add https://github.com/elitzurewave/claude-ewave-marketplace
```

3. **Browse and install:**
```
/plugin
```

4. **Go to "Discover" tab** and install **ewave-development-suite-beta**

### Verification

In Claude Code chat:
```
/plugin
```

Go to **Installed** tab - you should see:
```
✓ ewave-development-suite-beta@0.1.0-beta (enabled)
```

## Usage

### Agents

Agents are automatically activated based on context:
- Writing code → **code-reviewer** runs automatically
- Build fails → **build-error-resolver** activates
- Complex feature request → **planner** agent suggested

Manually invoke agents:
```bash
# Plan complex feature
Use planner agent for authentication system

# Security review
Use security-reviewer agent for API endpoints

# TDD workflow
Use tdd-guide agent for new user service
```

### Commands

```bash
# Create implementation plan
/plan

# Review code quality
/code-review

# Enforce TDD workflow
/tdd

# Fix build errors
/build-fix

# Clean dead code
/refactor-clean
```

### Configuration

#### Disable Specific Hooks

Edit `~/.claude/settings.json`:
```json
{
  "disabledHooks": {
    "ewave-development-suite-beta": [
      "console-log-check",
      "prettier-format"
    ]
  }
}
```

#### Customize Agent Behavior

Create project-specific overrides in `CLAUDE.md`:
```markdown
# Project Rules

Override plugin defaults:
- Skip TDD for prototype code
- Allow console.log in development
```

## Requirements

- **Node.js 18+** - For hook scripts
- **Git** - For git-based hooks
- **.NET 10 SDK** - For .NET projects (optional)
- **Prettier** - For auto-formatting (optional)
- **TypeScript** - For TS checking (optional)

## Tech Stack Support

- ✅ .NET Core 10 (primary)
- ✅ TypeScript/JavaScript
- ✅ React/Next.js
- ✅ PostgreSQL
- ✅ ClickHouse
- ✅ Node.js/Express

## Roadmap

- [ ] Add Python support
- [ ] Rust-specific patterns
- [ ] Go development workflow
- [ ] Kubernetes deployment agents
- [ ] Database migration tools
- [ ] Performance profiling agent

## Contributing

This is an internal Ewave plugin. For issues or suggestions, contact the development team.

## Credits

Based on [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) by Affaan M, with additional .NET Core patterns, enterprise workflows, and custom agents.

## License

MIT - See [LICENSE](LICENSE) for details.

## Changelog

### 0.1.0-beta (2026-02-01)
- Initial beta release
- 10 specialized agents
- 15 skills
- 15 commands
- 9 development rules
- Comprehensive hooks system
- .NET Core focus with multi-language support
