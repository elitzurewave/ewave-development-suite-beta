# Contributing to Ewave Development Suite

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/ewave/ewave-development-suite-beta.git
cd ewave-development-suite-beta
```

2. Symlink to your Claude plugins directory:
```bash
# Windows (PowerShell as Administrator)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\ewave-development-suite-beta" -Target "$(Get-Location)"

# Linux/Mac
ln -s $(pwd) ~/.claude/plugins/ewave-development-suite-beta
```

3. Enable the plugin:
```bash
claude plugins enable ewave-development-suite-beta
```

## Plugin Structure

```
ewave-development-suite-beta/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── agents/                  # Specialized agents
│   ├── architect.md
│   ├── code-reviewer.md
│   ├── security-reviewer.md
│   └── ...
├── commands/                # Slash commands
│   ├── plan.md
│   ├── code-review.md
│   └── ...
├── hooks/                   # Event hooks
│   └── hooks.json
├── rules/                   # Development rules
│   ├── coding-style.md
│   ├── dotnet-core.md
│   └── ...
├── scripts/                 # Hook scripts
│   └── hooks/
│       ├── session-start.js
│       ├── session-end.js
│       └── ...
├── skills/                  # Reusable skills
│   ├── backend-patterns/
│   ├── dotnet-core-standards/
│   └── ...
├── README.md
├── INSTALL.md
├── LICENSE
└── .gitignore
```

## Adding a New Agent

1. Create agent file in `agents/` directory:
```bash
touch agents/my-new-agent.md
```

2. Define agent behavior:
```markdown
# My New Agent

## Purpose
[What this agent does]

## When to Use
- [Scenario 1]
- [Scenario 2]

## Tools Available
- Read
- Write
- Bash
- Grep

## Workflow
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

3. Register agent in `.claude-plugin/plugin.json`:
```json
{
  "agents": [
    "./agents/my-new-agent.md"
  ]
}
```

4. Test the agent:
```bash
# In Claude Code
Use my-new-agent for [task]
```

## Adding a New Command

1. Create command file in `commands/` directory:
```bash
touch commands/my-command.md
```

2. Define command:
```markdown
---
name: my-command
description: Short description
usage: /my-command [args]
---

# My Command

[Detailed instructions for Claude to follow when this command is invoked]
```

3. Register in `.claude-plugin/plugin.json`:
```json
{
  "commands": [
    "./commands/my-command.md"
  ]
}
```

4. Test:
```bash
/my-command
```

## Adding a New Skill

1. Create skill directory:
```bash
mkdir -p skills/my-skill
```

2. Create `SKILL.md`:
```markdown
# My Skill

## When to Use
[Context when this skill should activate]

## Patterns
[Reusable patterns and best practices]

## Examples
[Code examples]
```

3. Register in plugin.json:
```json
{
  "skills": [
    "./skills/my-skill"
  ]
}
```

## Adding a New Hook

1. Edit `hooks/hooks.json`:
```json
{
  "PostToolUse": [
    {
      "matcher": "tool == \"Write\" && tool_input.file_path matches \"\\.cs$\"",
      "hooks": [
        {
          "type": "command",
          "command": "node \"{{PLUGIN_DIR}}/scripts/hooks/my-hook.js\""
        }
      ],
      "description": "My custom hook"
    }
  ]
}
```

2. Create hook script:
```javascript
// scripts/hooks/my-hook.js
const fs = require('fs');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // Your hook logic here
  console.error('[Hook] Running my custom hook');

  // Must output the input data unchanged
  console.log(data);
});
```

3. Test hook by triggering the matcher condition

## Adding Development Rules

1. Create rule file in `rules/`:
```bash
touch rules/my-rules.md
```

2. Define rules:
```markdown
# My Development Rules

## Critical Rule 1
[Description and examples]

## Rule 2
[Description and examples]
```

3. Register in plugin.json:
```json
{
  "rules": [
    "./rules/my-rules.md"
  ]
}
```

## Testing

### Manual Testing

1. Enable debug mode:
```bash
claude --debug
```

2. Test each component:
   - Agents: `Use [agent-name] for [task]`
   - Commands: `/[command-name]`
   - Hooks: Trigger hook conditions
   - Skills: Should activate automatically in context

3. Check logs:
```bash
cat ~/.claude/debug/plugin-loader.log
```

### Automated Testing

Currently no automated test framework. Manual testing required.

## Submitting Changes

1. Create a feature branch:
```bash
git checkout -b feature/my-feature
```

2. Make changes and commit:
```bash
git add .
git commit -m "feat: add my feature"
```

3. Push and create PR:
```bash
git push origin feature/my-feature
```

4. PR will be reviewed by team

## Commit Message Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

Examples:
```
feat: add Go language support agent
fix: correct TypeScript hook path resolution
docs: update installation instructions
refactor: simplify security-reviewer agent logic
```

## Version Bumping

Update version in `.claude-plugin/plugin.json`:

- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features, backwards compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Release Process

1. Update version in `plugin.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: release v0.2.0"`
4. Tag: `git tag v0.2.0`
5. Push: `git push --tags`

## Questions or Issues

Contact the Ewave development team or create an issue in the repository.
