#!/usr/bin/env node
/**
 * Install Hooks - Merges plugin hooks into ~/.claude/settings.json
 *
 * Called by install.sh / install.ps1 after copying plugin files.
 * Reads the plugin's hooks/hooks.json and merges them into the
 * user's ~/.claude/settings.json, replacing {{PLUGIN_DIR}} with
 * the actual installed plugin path.
 *
 * Usage: node install-hooks.js <plugin-install-path>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const pluginDir = process.argv[2];
if (!pluginDir) {
  console.error('Usage: node install-hooks.js <plugin-install-path>');
  process.exit(1);
}

const resolvedPluginDir = path.resolve(pluginDir);
const claudeDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const pluginHooksPath = path.join(resolvedPluginDir, 'hooks', 'hooks.json');

// Load plugin hooks
if (!fs.existsSync(pluginHooksPath)) {
  console.error('Plugin hooks.json not found at:', pluginHooksPath);
  process.exit(1);
}

let pluginHooks;
try {
  pluginHooks = JSON.parse(fs.readFileSync(pluginHooksPath, 'utf8'));
} catch (err) {
  console.error('Failed to parse plugin hooks.json:', err.message);
  process.exit(1);
}

// Load or create settings
let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse settings.json:', err.message);
    console.error('Creating backup and starting fresh hooks section.');
    fs.copyFileSync(settingsPath, settingsPath + '.backup');
    settings = {};
  }
}

if (!settings.hooks) {
  settings.hooks = {};
}

// Convert plugin path to platform-specific format for use in commands
const pluginPathForCmd = resolvedPluginDir.replace(/\//g, path.sep);

// Marker to identify hooks added by this plugin
const PLUGIN_MARKER = 'ewave-security-gate';

// Remove any previously installed security gate hooks
for (const hookType of Object.keys(settings.hooks)) {
  if (Array.isArray(settings.hooks[hookType])) {
    settings.hooks[hookType] = settings.hooks[hookType].filter(hook =>
      !(hook.description && hook.description.includes('SECURITY GATE')) &&
      !(hook.description && hook.description.includes('TAMPER PROTECTION'))
    );
  }
}

// Process each hook type from the plugin
for (const [hookType, hooks] of Object.entries(pluginHooks)) {
  if (!Array.isArray(hooks)) continue;

  if (!settings.hooks[hookType]) {
    settings.hooks[hookType] = [];
  }

  for (const hook of hooks) {
    // Only merge security gate hooks (not all plugin hooks, to avoid duplicates)
    const desc = hook.description || '';
    if (!desc.includes('SECURITY GATE') && !desc.includes('TAMPER PROTECTION')) {
      continue;
    }

    // Deep clone the hook
    const newHook = JSON.parse(JSON.stringify(hook));

    // Replace {{PLUGIN_DIR}} with actual path in all hook commands
    if (newHook.hooks) {
      for (const h of newHook.hooks) {
        if (h.command) {
          h.command = h.command.replace(/\{\{PLUGIN_DIR\}\}/g, pluginPathForCmd);
        }
      }
    }

    // Add at the BEGINNING of the array (security hooks should run first)
    settings.hooks[hookType].unshift(newHook);
  }
}

// Also update the doc blocker to exclude plugin directories
const preToolUse = settings.hooks.PreToolUse || [];
for (const hook of preToolUse) {
  if (hook.matcher && hook.matcher.includes('.md|txt') && hook.matcher.includes('CONTRIBUTING')) {
    // This is the doc blocker - update matcher to exclude plugin dirs
    if (!hook.matcher.includes('agents|skills|commands|rules')) {
      hook.matcher = hook.matcher.replace(
        'CONTRIBUTING\\\\.md',
        'CONTRIBUTING\\\\.md|(agents|skills|commands|rules)[/\\\\\\\\]'
      );
      console.log('Updated doc blocker to exclude plugin directories.');
    }
  }
}

// Write updated settings
try {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log('Security gate hooks merged into settings.json successfully.');

  // Count hooks added
  let count = 0;
  for (const hookType of Object.keys(settings.hooks)) {
    for (const hook of settings.hooks[hookType]) {
      const desc = hook.description || '';
      if (desc.includes('SECURITY GATE') || desc.includes('TAMPER PROTECTION')) {
        count++;
      }
    }
  }
  console.log(`${count} security gate hook(s) installed.`);
} catch (err) {
  console.error('Failed to write settings.json:', err.message);
  process.exit(1);
}
