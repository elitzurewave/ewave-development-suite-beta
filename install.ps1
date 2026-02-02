# Ewave Development Suite Beta - Windows Installation Script
# PowerShell script to install the plugin

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('local', 'marketplace', 'symlink')]
    [string]$Method = 'local',

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "=========================================="
Write-Info "Ewave Development Suite Beta - Installer"
Write-Info "=========================================="
Write-Info ""

# Get plugin directory
$PLUGIN_DIR = $PSScriptRoot
$PLUGIN_NAME = "ewave-development-suite-beta"
$CLAUDE_DIR = "$env:USERPROFILE\.claude"
$PLUGINS_DIR = "$CLAUDE_DIR\plugins"
$MARKETPLACE_DIR = "$CLAUDE_DIR\marketplace\local"

# Check if Claude Code is installed
if (-not (Test-Path $CLAUDE_DIR)) {
    Write-Error "Claude Code directory not found at: $CLAUDE_DIR"
    Write-Error "Please install Claude Code first."
    exit 1
}

Write-Info "Installing plugin using method: $Method"
Write-Info ""

# Create plugins directory if it doesn't exist
if (-not (Test-Path $PLUGINS_DIR)) {
    Write-Info "Creating plugins directory..."
    New-Item -ItemType Directory -Path $PLUGINS_DIR -Force | Out-Null
}

$TARGET_DIR = "$PLUGINS_DIR\$PLUGIN_NAME"

# Check if plugin already exists
if (Test-Path $TARGET_DIR) {
    if ($Force) {
        Write-Warning "Plugin already exists. Removing old version..."
        Remove-Item -Path $TARGET_DIR -Recurse -Force
    } else {
        Write-Warning "Plugin already exists at: $TARGET_DIR"
        $response = Read-Host "Overwrite? (y/n)"
        if ($response -ne 'y') {
            Write-Info "Installation cancelled."
            exit 0
        }
        Remove-Item -Path $TARGET_DIR -Recurse -Force
    }
}

# Install based on method
switch ($Method) {
    'local' {
        Write-Info "Copying plugin to: $TARGET_DIR"
        Copy-Item -Path $PLUGIN_DIR -Destination $TARGET_DIR -Recurse -Force
        Write-Success "✓ Plugin copied successfully"
    }

    'marketplace' {
        if (-not (Test-Path $MARKETPLACE_DIR)) {
            Write-Info "Creating marketplace directory..."
            New-Item -ItemType Directory -Path $MARKETPLACE_DIR -Force | Out-Null
        }

        $MARKETPLACE_TARGET = "$MARKETPLACE_DIR\$PLUGIN_NAME"
        Write-Info "Copying plugin to marketplace: $MARKETPLACE_TARGET"
        Copy-Item -Path $PLUGIN_DIR -Destination $MARKETPLACE_TARGET -Recurse -Force
        Write-Success "✓ Plugin added to local marketplace"
    }

    'symlink' {
        # Check if running as administrator
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

        if (-not $isAdmin) {
            Write-Error "Creating symlinks requires Administrator privileges."
            Write-Info "Please run this script as Administrator or use '-Method local' instead."
            exit 1
        }

        Write-Info "Creating symlink: $TARGET_DIR -> $PLUGIN_DIR"
        New-Item -ItemType SymbolicLink -Path $TARGET_DIR -Target $PLUGIN_DIR -Force | Out-Null
        Write-Success "✓ Symlink created successfully"
        Write-Info "Changes to the source will be reflected immediately."
    }
}

Write-Info ""
Write-Info "=========================================="
Write-Success "Installation Complete!"
Write-Info "=========================================="
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Restart Claude Code or run: claude plugins refresh"
Write-Info "2. Enable the plugin: claude plugins enable $PLUGIN_NAME"
Write-Info "3. Verify: claude plugins list"
Write-Info ""
Write-Info "Usage:"
Write-Info "- Agents: 'Use planner agent for authentication system'"
Write-Info "- Commands: /plan, /code-review, /tdd, /build-fix"
Write-Info ""
Write-Info "Documentation: $TARGET_DIR\README.md"
Write-Info ""
