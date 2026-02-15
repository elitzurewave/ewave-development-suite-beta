#!/usr/bin/env node
/**
 * Install Hooks - Merges plugin hooks into ~/.claude/settings.json
 *
 * Called by install.sh / install.ps1 after copying plugin files.
 * Reads the plugin's hooks/hooks.json and merges them into the
 * user's ~/.claude/settings.json, replacing {{PLUGIN_DIR}} with
 * the actual installed plugin path.
 *
 * All hooks from hooks.json are installed. Plugin hooks are tracked
 * by their description field - on re-install, old plugin hooks are
 * removed before new ones are added.
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

// Collect all plugin hook descriptions for identification
const pluginDescriptions = new Set();
for (const hooks of Object.values(pluginHooks)) {
  if (!Array.isArray(hooks)) continue;
  for (const hook of hooks) {
    if (hook.description) {
      pluginDescriptions.add(hook.description);
    }
  }
}

// Remove any previously installed plugin hooks (identified by description)
for (const hookType of Object.keys(settings.hooks)) {
  if (Array.isArray(settings.hooks[hookType])) {
    settings.hooks[hookType] = settings.hooks[hookType].filter(hook => {
      if (!hook.description) return true;
      // Remove if description matches any plugin hook description
      if (pluginDescriptions.has(hook.description)) return false;
      // Also remove legacy hooks with old-style descriptions
      if (hook.description.includes('SECURITY GATE') || hook.description.includes('TAMPER PROTECTION')) return false;
      return true;
    });
  }
}

// Process each hook type from the plugin
let totalAdded = 0;
for (const [hookType, hooks] of Object.entries(pluginHooks)) {
  if (!Array.isArray(hooks)) continue;

  if (!settings.hooks[hookType]) {
    settings.hooks[hookType] = [];
  }

  for (const hook of hooks) {
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

    // Security-critical hooks go at the beginning, others at the end
    const desc = newHook.description || '';
    if (desc.includes('SECURITY GATE') || desc.includes('TAMPER PROTECTION')) {
      settings.hooks[hookType].unshift(newHook);
    } else {
      settings.hooks[hookType].push(newHook);
    }

    totalAdded++;
  }
}

// Write updated settings
try {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log('Plugin hooks merged into settings.json successfully.');
  console.log(`${totalAdded} hook(s) installed across ${Object.keys(pluginHooks).length} event types.`);

  // Count security-specific hooks
  let secCount = 0;
  for (const hookType of Object.keys(settings.hooks)) {
    for (const hook of settings.hooks[hookType]) {
      const desc = hook.description || '';
      if (desc.includes('SECURITY GATE') || desc.includes('TAMPER PROTECTION')) {
        secCount++;
      }
    }
  }
  console.log(`${secCount} security gate hook(s) active.`);
} catch (err) {
  console.error('Failed to write settings.json:', err.message);
  process.exit(1);
}
