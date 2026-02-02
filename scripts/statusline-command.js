#!/usr/bin/env node
/**
 * Cross-platform statusline command for Claude Code
 * Works on Windows, macOS, and Linux
 *
 * Reads JSON input from stdin and outputs a formatted status line
 * with username@hostname:cwd (git:branch) format
 */

const os = require('os');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  green: '\x1b[01;32m',
  blue: '\x1b[01;34m',
  cyan: '\x1b[01;36m',
  reset: '\x1b[00m'
};

/**
 * Get git branch for a directory
 */
function getGitBranch(cwd) {
  try {
    const result = execSync('git branch --show-current', {
      cwd: cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Get short hostname
 */
function getHostname() {
  const hostname = os.hostname();
  // Return only the first part (before any dots)
  return hostname.split('.')[0];
}

/**
 * Main function
 */
async function main() {
  let inputData = '';

  // Read JSON from stdin
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  // Parse JSON to get current directory
  let cwd = process.cwd();

  if (inputData.trim()) {
    try {
      const input = JSON.parse(inputData);
      cwd = input.current_dir || input.cwd || cwd;
    } catch (e) {
      // If JSON parsing fails, use current directory
    }
  }

  // Get user info
  const username = os.userInfo().username;
  const hostname = getHostname();

  // Get git branch
  const gitBranch = getGitBranch(cwd);

  // Build status line with colors
  let statusLine = '';

  statusLine += `${colors.green}${username}@${hostname}${colors.reset}`;
  statusLine += ':';
  statusLine += `${colors.blue}${cwd}${colors.reset}`;

  if (gitBranch) {
    statusLine += ` ${colors.cyan}(git:${gitBranch})${colors.reset}`;
  }

  // Output without newline
  process.stdout.write(statusLine);
}

main().catch(err => {
  console.error('Statusline error:', err.message);
  process.exit(1);
});
