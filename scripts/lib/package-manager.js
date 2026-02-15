'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Lock file to package manager mapping.
 * Order matters: checked first match wins.
 */
const LOCK_FILES = [
  { file: 'pnpm-lock.yaml', name: 'pnpm' },
  { file: 'yarn.lock', name: 'yarn' },
  { file: 'bun.lockb', name: 'bun' },
  { file: 'package-lock.json', name: 'npm' }
];

/**
 * Detects the project's package manager by checking for lock files in cwd.
 * @returns {{ name: 'npm'|'pnpm'|'yarn'|'bun', source: 'lockfile'|'fallback'|'default' }}
 */
function getPackageManager() {
  try {
    const cwd = process.cwd();

    for (const entry of LOCK_FILES) {
      const lockPath = path.join(cwd, entry.file);

      try {
        if (fs.existsSync(lockPath)) {
          return { name: entry.name, source: 'lockfile' };
        }
      } catch (_err) {
        // Skip inaccessible files
      }
    }
  } catch (err) {
    console.error(`[package-manager] Detection error: ${err.message}`);
  }

  return { name: 'npm', source: 'fallback' };
}

/**
 * Returns a prompt message suggesting the user configure their preferred package manager.
 * @returns {string}
 */
function getSelectionPrompt() {
  return '[SessionStart] Run /setup-pm to set your preferred package manager';
}

module.exports = {
  getPackageManager,
  getSelectionPrompt
};
