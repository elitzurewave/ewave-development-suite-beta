# Installation Guide

## Method 1: Local Marketplace (Recommended)

### 1. Create Local Marketplace Directory

```bash
# Create marketplace directory if it doesn't exist
mkdir -p ~/.claude/marketplace/local
```

### 2. Copy Plugin to Marketplace

```bash
# Copy the entire plugin directory
cp -r /path/to/ewave-development-suite-beta ~/.claude/marketplace/local/
```

**For your setup:**
```bash
cp -r "C:\elitzur\Ewave.ai\claude-plugins\ewave-development-suite-beta" "$HOME/.claude/marketplace/local/"
```

### 3. Register Plugin

Claude Code will automatically detect plugins in the marketplace directory. Restart Claude Code or run:

```bash
claude plugins refresh
```

### 4. Enable Plugin

```bash
claude plugins enable ewave-development-suite-beta
```

### 5. Verify Installation

```bash
claude plugins list
```

Expected output:
```
Installed Plugins:
✓ ewave-development-suite-beta@0.1.0-beta (enabled)
  - 10 agents
  - 15 skills
  - 15 commands
  - 9 rules
  - Hooks enabled
```

## Method 2: Direct Installation (Development)

### 1. Copy to Plugins Directory

```bash
cp -r /path/to/ewave-development-suite-beta ~/.claude/plugins/
```

### 2. Update settings.json

Edit `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "ewave-development-suite-beta": true
  }
}
```

### 3. Restart Claude Code

Close and reopen Claude Code to load the plugin.

## Method 3: Symlink (Best for Development)

### 1. Create Symlink

```bash
# Windows (PowerShell as Administrator)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\ewave-development-suite-beta" -Target "C:\elitzur\Ewave.ai\claude-plugins\ewave-development-suite-beta"

# Linux/Mac
ln -s /path/to/ewave-development-suite-beta ~/.claude/plugins/ewave-development-suite-beta
```

### 2. Enable Plugin

```bash
claude plugins enable ewave-development-suite-beta
```

**Benefits:** Changes to the plugin source are immediately reflected without copying.

## Publishing to Team Marketplace

### 1. Create Git Repository

```bash
cd C:\elitzur\Ewave.ai\claude-plugins\ewave-development-suite-beta
git init
git add .
git commit -m "Initial commit: Ewave Development Suite v0.1.0-beta"
```

### 2. Push to Company Git Server

```bash
# Add remote
git remote add origin https://github.com/ewave/ewave-development-suite-beta.git

# Push
git push -u origin main
```

### 3. Team Installation

Share the repository URL with your team:

```bash
claude plugins install https://github.com/ewave/ewave-development-suite-beta.git
```

### 4. Configure Marketplace (Optional)

Create `~/.claude/marketplace.json`:

```json
{
  "sources": [
    {
      "name": "Ewave Internal",
      "url": "https://github.com/ewave/claude-plugins-marketplace",
      "priority": 1
    }
  ]
}
```

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

3. Check Claude Code logs:
```bash
cat ~/.claude/debug/plugin-loader.log
```

### Hooks Not Working

1. Verify Node.js is installed:
```bash
node --version
```

2. Test hook scripts manually:
```bash
node ~/.claude/plugins/ewave-development-suite-beta/scripts/hooks/session-start.js
```

3. Check hook permissions:
```bash
chmod +x ~/.claude/plugins/ewave-development-suite-beta/scripts/hooks/*.js
```

### Agents Not Loading

1. Verify agent files exist:
```bash
ls ~/.claude/plugins/ewave-development-suite-beta/agents/
```

2. Check plugin.json agent paths are correct

3. Restart Claude Code with debug flag:
```bash
claude --debug
```

## Updating the Plugin

### From Local Source

```bash
# Pull latest changes
cd C:\elitzur\Ewave.ai\claude-plugins\ewave-development-suite-beta
git pull

# If using symlink, changes are automatic
# If using copy, recopy:
cp -r . ~/.claude/plugins/ewave-development-suite-beta/

# Reload plugins
claude plugins reload ewave-development-suite-beta
```

### From Git Repository

```bash
claude plugins update ewave-development-suite-beta
```

## Uninstalling

```bash
# Disable plugin
claude plugins disable ewave-development-suite-beta

# Remove plugin
claude plugins uninstall ewave-development-suite-beta

# Or manually delete
rm -rf ~/.claude/plugins/ewave-development-suite-beta
```

## Next Steps

1. Read [README.md](./README.md) for usage guide
2. Customize rules in [rules/](./rules/) directory
3. Explore agents in [agents/](./agents/) directory
4. Test commands: `/plan`, `/code-review`, `/tdd`

## Support

For issues or questions, contact the Ewave development team or create an issue in the plugin repository.
