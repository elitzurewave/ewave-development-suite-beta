'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Returns path to the sessions directory (~/.claude/sessions).
 * @returns {string}
 */
function getSessionsDir() {
  return path.join(os.homedir(), '.claude', 'sessions');
}

/**
 * Returns path to the learned skills directory (~/.claude/learned-skills).
 * @returns {string}
 */
function getLearnedSkillsDir() {
  return path.join(os.homedir(), '.claude', 'learned-skills');
}

/**
 * Returns the OS temp directory.
 * @returns {string}
 */
function getTempDir() {
  return os.tmpdir();
}

/**
 * Returns current date as YYYY-MM-DD.
 * @returns {string}
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time as HH:MM:SS.
 * @returns {string}
 */
function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Returns current date and time as YYYY-MM-DD HH:MM:SS.
 * @returns {string}
 */
function getDateTimeString() {
  return `${getDateString()} ${getTimeString()}`;
}

/**
 * Returns a short unique ID for the session.
 * Uses first 8 chars of CLAUDE_SESSION_ID env var if available,
 * otherwise generates a random 8-char hex string.
 * @returns {string}
 */
function getSessionIdShort() {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId) {
    return sessionId.substring(0, 8);
  }
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Converts a simple glob pattern (supporting only * wildcard) to a RegExp.
 * @param {string} pattern
 * @returns {RegExp}
 */
function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexStr}$`);
}

/**
 * Finds files matching a glob pattern in a directory.
 * @param {string} dir - Directory to search in
 * @param {string} pattern - Glob pattern (supports * wildcard only)
 * @param {Object} [options] - Options
 * @param {number} [options.maxAge] - Maximum age in days
 * @returns {Array<{path: string, mtime: Date}>} Matched files sorted newest first
 */
function findFiles(dir, pattern, options) {
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const regex = globToRegex(pattern);
    const entries = fs.readdirSync(dir);
    const now = Date.now();
    const maxAgeMs = options && options.maxAge != null
      ? options.maxAge * 24 * 60 * 60 * 1000
      : null;

    const results = [];

    for (const entry of entries) {
      if (!regex.test(entry)) {
        continue;
      }

      const fullPath = path.join(dir, entry);

      try {
        const stat = fs.statSync(fullPath);

        if (!stat.isFile()) {
          continue;
        }

        if (maxAgeMs != null && (now - stat.mtimeMs) > maxAgeMs) {
          continue;
        }

        results.push({ path: fullPath, mtime: stat.mtime });
      } catch (_err) {
        // Skip files we can't stat
      }
    }

    // Sort newest first
    results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return results;
  } catch (_err) {
    return [];
  }
}

/**
 * Creates directory recursively if it doesn't exist.
 * @param {string} dir - Directory path to create
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_err) {
    // Ignore errors (e.g. permission denied)
  }
}

/**
 * Reads a file and returns its string content, or null if it doesn't exist.
 * @param {string} filePath
 * @returns {string|null}
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_err) {
    return null;
  }
}

/**
 * Writes content to a file. Creates parent directories if needed.
 * @param {string} filePath
 * @param {string} content
 */
function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error(`[utils] writeFile error: ${err.message}`);
  }
}

/**
 * Appends content to a file. Creates parent directories if needed.
 * @param {string} filePath
 * @param {string} content
 */
function appendFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error(`[utils] appendFile error: ${err.message}`);
  }
}

/**
 * Reads a file, replaces the first regex match, and writes it back.
 * @param {string} filePath
 * @param {RegExp} regex - Regular expression to match
 * @param {string} replacement - Replacement string
 * @returns {boolean} True if replacement was made, false otherwise
 */
function replaceInFile(filePath, regex, replacement) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updated = content.replace(regex, replacement);

    if (updated === content) {
      return false;
    }

    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  } catch (err) {
    console.error(`[utils] replaceInFile error: ${err.message}`);
    return false;
  }
}

/**
 * Counts regex matches in a file's content.
 * @param {string} filePath
 * @param {RegExp} regex - Regular expression to count matches of
 * @returns {number} Number of matches, 0 if file doesn't exist
 */
function countInFile(filePath, regex) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  } catch (_err) {
    return 0;
  }
}

/**
 * Writes a message to stderr for user-visible hook output.
 * @param {string} message
 */
function log(message) {
  console.error(message);
}

module.exports = {
  getSessionsDir,
  getLearnedSkillsDir,
  getTempDir,
  getDateString,
  getTimeString,
  getDateTimeString,
  getSessionIdShort,
  findFiles,
  ensureDir,
  readFile,
  writeFile,
  appendFile,
  replaceInFile,
  countInFile,
  log
};
