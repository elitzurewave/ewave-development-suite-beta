#!/bin/bash
# Ewave Development Suite Beta - Linux/Mac Installation Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
info() { echo -e "${CYAN}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }
warning() { echo -e "${YELLOW}$1${NC}"; }
error() { echo -e "${RED}$1${NC}"; }

# Default values
METHOD="local"
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--method)
      METHOD="$2"
      shift 2
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -m, --method METHOD   Installation method: local, marketplace, symlink (default: local)"
      echo "  -f, --force           Force overwrite if plugin exists"
      echo "  -h, --help            Show this help message"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate method
if [[ ! "$METHOD" =~ ^(local|marketplace|symlink)$ ]]; then
  error "Invalid method: $METHOD. Must be one of: local, marketplace, symlink"
  exit 1
fi

info "=========================================="
info "Ewave Development Suite Beta - Installer"
info "=========================================="
echo ""

# Get directories
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME="ewave-development-suite-beta"
CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
MARKETPLACE_DIR="$CLAUDE_DIR/marketplace/local"

# Check if Claude Code is installed
if [ ! -d "$CLAUDE_DIR" ]; then
  error "Claude Code directory not found at: $CLAUDE_DIR"
  error "Please install Claude Code first."
  exit 1
fi

info "Installing plugin using method: $METHOD"
echo ""

# Create plugins directory if it doesn't exist
if [ ! -d "$PLUGINS_DIR" ]; then
  info "Creating plugins directory..."
  mkdir -p "$PLUGINS_DIR"
fi

TARGET_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

# Check if plugin already exists
if [ -d "$TARGET_DIR" ] || [ -L "$TARGET_DIR" ]; then
  if [ "$FORCE" = true ]; then
    warning "Plugin already exists. Removing old version..."
    rm -rf "$TARGET_DIR"
  else
    warning "Plugin already exists at: $TARGET_DIR"
    read -p "Overwrite? (y/n): " response
    if [ "$response" != "y" ]; then
      info "Installation cancelled."
      exit 0
    fi
    rm -rf "$TARGET_DIR"
  fi
fi

# Install based on method
case $METHOD in
  local)
    info "Copying plugin to: $TARGET_DIR"
    cp -r "$PLUGIN_DIR" "$TARGET_DIR"
    success "✓ Plugin copied successfully"
    ;;

  marketplace)
    if [ ! -d "$MARKETPLACE_DIR" ]; then
      info "Creating marketplace directory..."
      mkdir -p "$MARKETPLACE_DIR"
    fi

    MARKETPLACE_TARGET="$MARKETPLACE_DIR/$PLUGIN_NAME"
    info "Copying plugin to marketplace: $MARKETPLACE_TARGET"
    cp -r "$PLUGIN_DIR" "$MARKETPLACE_TARGET"
    success "✓ Plugin added to local marketplace"
    ;;

  symlink)
    info "Creating symlink: $TARGET_DIR -> $PLUGIN_DIR"
    ln -s "$PLUGIN_DIR" "$TARGET_DIR"
    success "✓ Symlink created successfully"
    info "Changes to the source will be reflected immediately."
    ;;
esac

# Merge security gate hooks into settings.json
echo ""
info "Installing security gate hooks..."
INSTALL_HOOKS_SCRIPT="$TARGET_DIR/scripts/install-hooks.js"
if [ -f "$INSTALL_HOOKS_SCRIPT" ]; then
  if node "$INSTALL_HOOKS_SCRIPT" "$TARGET_DIR"; then
    success "✓ Security gate hooks installed"
  else
    warning "Failed to install hooks automatically. You may need to merge hooks manually."
  fi
else
  warning "Hook installer not found, skipping hook merge"
fi

echo ""
info "=========================================="
success "Installation Complete!"
info "=========================================="
echo ""
info "Next steps:"
info "1. Restart Claude Code to activate security gate hooks"
info "2. Verify: Start a new Claude session and try creating an agent"
echo ""
info "Usage:"
info "- Agents: 'Use planner agent for authentication system'"
info "- Commands: /plan, /code-review, /tdd, /build-fix"
echo ""
info "Documentation: $TARGET_DIR/README.md"
echo ""
