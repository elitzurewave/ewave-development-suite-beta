# Installation Guide

## Method 1: From Marketplace (Recommended)

### 1. Add Ewave Marketplace

In Claude Code chat:
```
/plugin marketplace add https://github.com/elitzurewave/claude-ewave-marketplace.git
```

### 2. Install Plugin

```
/plugin
```

Go to **Discover** tab → Install **ewave-development-suite-beta**

### 3. Verify Installation

```
/plugin
```

Go to **Installed** tab - you should see:
```
✓ ewave-development-suite-beta@0.1.0-beta (enabled)
```

## Method 2: Direct Git Installation

```bash
# Clone and install directly
claude plugins install https://github.com/elitzurewave/ewave-development-suite-beta.git
```

## Method 3: Local Development

### 1. Clone Repository

```bash
git clone https://github.com/elitzurewave/ewave-development-suite-beta.git
cd ewave-development-suite-beta
```

### 2. Create Symlink

```bash
# Windows (PowerShell as Administrator)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\ewave-development-suite-beta" -Target "$(Get-Location)"

# Linux/Mac
ln -s "$(pwd)" ~/.claude/plugins/ewave-development-suite-beta
```

### 3. Enable Plugin

```bash
claude plugins enable ewave-development-suite-beta
```

**Benefits:** Changes to the plugin source are immediately reflected without copying.

## Troubleshooting

### Plugin Not Detected

1. Check directory structure:
```bash
ls ~/.claude/plugins/ewave-development-suite-beta/.claude-plugin/plugin.json
```

2. Validate plugin.json syntax:
```bash
cat ~/.claude/plugins/ewave-development-suite-beta/.claude-plugin/plugin.json | jq .
```

### Hooks Not Working

1. Verify Node.js is installed:
```bash
node --version
```

2. Check hook permissions (Linux/Mac):
```bash
chmod +x ~/.claude/plugins/ewave-development-suite-beta/scripts/hooks/*.js
```

### Agents Not Loading

1. Verify agent files exist:
```bash
ls ~/.claude/plugins/ewave-development-suite-beta/agents/
```

2. Restart Claude Code

## Updating the Plugin

In Claude Code chat:
```
/plugin
```

Go to **Installed** tab → Click plugin → Click **Update**

Or via CLI:
```bash
claude plugins update ewave-development-suite-beta
```

## Uninstalling

In Claude Code chat:
```
/plugin
```

Go to **Installed** tab → Click plugin → Click **Uninstall**

Or via CLI:
```bash
claude plugins uninstall ewave-development-suite-beta
```

## Next Steps

1. Read [README.md](./README.md) for usage guide
2. Explore agents in [agents/](./agents/) directory
3. Test commands: `/plan`, `/code-review`, `/tdd`

## Support

For issues, create an issue in the [plugin repository](https://github.com/elitzurewave/ewave-development-suite-beta).
