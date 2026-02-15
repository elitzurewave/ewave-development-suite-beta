#!/usr/bin/env node
/**
 * Security Patterns Database
 *
 * Shared pattern library used by security-gate.js (PreToolUse hook)
 * and /security-scan command. Pure Node.js, no external dependencies.
 *
 * Exports:
 *   PATTERNS        - Array of all security patterns
 *   scanContent()   - Scan content string against patterns
 *   detectContentType() - Determine content type from file path
 *   parseFrontmatter()  - Extract YAML frontmatter from markdown
 */

'use strict';

// ---------------------------------------------------------------------------
// Pattern Definitions
// ---------------------------------------------------------------------------

const PATTERNS = [
  // =========================================================================
  // CRITICAL - Always block (unless overridden in config.allowedPatterns)
  // =========================================================================
  {
    id: 'CRIT-001',
    severity: 'CRITICAL',
    description: 'Hardcoded secret or API key in content',
    regex: null,
    contentTypes: ['agent', 'skill', 'command', 'rule', 'hook-script'],
    check: (content) => {
      // Match secret-like assignments but skip obvious fake/example values
      const secretRegex = /(?:api[_-]?key|password|secret|token|credential)\s*[:=]\s*["']([a-zA-Z0-9+/=_\-]{16,})["']/gi;
      const fakePatterns = /^(sk-)?[0-9a-f]{16,}$|^(test|example|fake|dummy|placeholder|your[_-])/i;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip lines that are clearly documenting bad practices (WRONG/BAD/NEVER/DON'T)
        if (/(?:WRONG|BAD|NEVER|DON'T|don't|wrong|bad|never|anti.?pattern)/i.test(line) ||
            /(?:WRONG|BAD|NEVER|DON'T|don't|wrong|bad|never|anti.?pattern)/i.test(lines[Math.max(0, i - 1)] || '') ||
            /(?:WRONG|BAD|NEVER|DON'T|don't|wrong|bad|never|anti.?pattern)/i.test(lines[Math.max(0, i - 2)] || '')) {
          continue;
        }
        secretRegex.lastIndex = 0;
        const match = secretRegex.exec(line);
        if (match && !fakePatterns.test(match[1])) {
          return { line: i + 1, match: match[0] };
        }
      }
      return null;
    },
  },
  {
    id: 'CRIT-002',
    severity: 'CRITICAL',
    description: 'Data exfiltration - fetch/curl/wget to external URL',
    regex: /(?:fetch|axios|got|node-fetch|request)\s*\(\s*["'`]https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
    contentTypes: ['hook-script'],
  },
  {
    id: 'CRIT-003',
    severity: 'CRITICAL',
    description: 'Instructions to skip or disable security checks',
    regex: /(?:skip|disable|bypass|ignore|remove|turn\s*off)\s+(?:security|validation|auth(?:entication|orization)?|csrf|xss|sanitiz|rate.?limit|hook)/i,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
  },
  {
    id: 'CRIT-004',
    severity: 'CRITICAL',
    description: 'Prompt injection phrase detected',
    regex: /(?:ignore\s+(?:previous|all|above|prior)\s+instructions|you\s+are\s+now\s+|system\s*:\s*you\s+|forget\s+(?:all|your)\s+(?:previous|prior)\s+|override\s+(?:all|your)\s+(?:rules|instructions|safety))/i,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
  },
  {
    id: 'CRIT-005',
    severity: 'CRITICAL',
    description: 'Obfuscated code - base64 payload or eval with decode',
    regex: /(?:eval\s*\(|new\s+Function\s*\()[\s\S]*?(?:atob|Buffer\.from|decodeURI)/i,
    contentTypes: ['agent', 'skill', 'command', 'rule', 'hook-script'],
    multiline: true,
  },
  {
    id: 'CRIT-005b',
    severity: 'CRITICAL',
    description: 'Obfuscated code - large base64 string (>60 chars)',
    regex: /(?:atob|Buffer\.from)\s*\(\s*["'][A-Za-z0-9+/=]{60,}["']/,
    contentTypes: ['agent', 'skill', 'command', 'rule', 'hook-script'],
  },
  {
    id: 'CRIT-006',
    severity: 'CRITICAL',
    description: 'Network request in hook script',
    regex: /(?:https?\.request|https?\.get|net\.connect|dgram\.|fetch\s*\(|axios|got\s*\(|node-fetch|request\s*\()/,
    contentTypes: ['hook-script'],
  },
  {
    id: 'CRIT-007',
    severity: 'CRITICAL',
    description: 'File system write/delete outside plugin directory',
    regex: /(?:writeFileSync|appendFileSync|unlinkSync|rmdirSync|rmSync|createWriteStream)\s*\(\s*(?!.*(?:PLUGIN_DIR|__dirname|\.\/|\.\.\/logs))/,
    contentTypes: ['hook-script'],
  },
  {
    id: 'CRIT-008',
    severity: 'CRITICAL',
    description: 'Process.env write or dangerous process manipulation',
    regex: /process\.env\s*\[[\s\S]*?\]\s*=/,
    contentTypes: ['hook-script'],
  },

  // =========================================================================
  // HIGH - Warn prominently, allow by default
  // =========================================================================
  {
    id: 'HIGH-001',
    severity: 'HIGH',
    description: 'Agent requests ALL 6 tools (Read, Write, Edit, Bash, Grep, Glob)',
    // This is checked via frontmatter analysis, not regex alone
    regex: null,
    contentTypes: ['agent'],
    check: (content, frontmatter) => {
      if (!frontmatter || !frontmatter.tools) return null;
      const tools = frontmatter.tools;
      if (Array.isArray(tools) && tools.length >= 6) {
        const hasAll = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']
          .every(t => tools.includes(t));
        if (hasAll) {
          return { line: 1, match: `tools: ${JSON.stringify(tools)}` };
        }
      }
      return null;
    },
  },
  {
    id: 'HIGH-002',
    severity: 'HIGH',
    description: 'Instructions to modify security gate files',
    regex: /(?:edit|modify|delete|remove|replace|overwrite)\s+(?:.*?)(?:security-gate|security-patterns|security-gate-config|plugin-security)/i,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
  },
  {
    id: 'HIGH-003',
    severity: 'HIGH',
    description: 'Suggesting --no-verify, --force, or --skip-hooks flags',
    regex: /--(?:no-verify|force-with-lease|force|skip-hooks|dangerously|no-gpg-sign)\b/,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
  },
  {
    id: 'HIGH-004',
    severity: 'HIGH',
    description: 'Instructions to modify hooks.json or security rules',
    regex: /(?:edit|modify|delete|remove|rewrite)\s+(?:.*?)(?:hooks\.json|hooks[/\\]hooks|rules[/\\]security)/i,
    contentTypes: ['agent', 'skill', 'command'],
  },
  {
    id: 'HIGH-005',
    severity: 'HIGH',
    description: 'child_process or exec usage in skill/command code examples',
    regex: /(?:require\s*\(\s*['"]child_process['"]\)|execSync|spawnSync|exec\s*\()\s*/,
    contentTypes: ['skill', 'command'],
  },
  {
    id: 'HIGH-006',
    severity: 'HIGH',
    description: 'Instructions to modify .claude/settings.json',
    regex: /(?:edit|modify|write|update|change|overwrite|delete)\s+(?:.*?)\.claude[/\\]settings\.json/i,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
  },

  // =========================================================================
  // MEDIUM - Informational warning
  // =========================================================================
  {
    id: 'MED-001',
    severity: 'MEDIUM',
    description: 'innerHTML assignment in code example',
    regex: /\.innerHTML\s*=/,
    contentTypes: ['skill', 'command'],
  },
  {
    id: 'MED-002',
    severity: 'MEDIUM',
    description: 'TypeScript "any" type usage in code example',
    regex: /:\s*any\b/,
    contentTypes: ['skill', 'command'],
  },
  {
    id: 'MED-003',
    severity: 'MEDIUM',
    description: 'Unrecognized external URL (not in whitelist)',
    // This is checked via custom logic, not regex alone
    regex: null,
    contentTypes: ['agent', 'skill', 'command', 'rule'],
    check: (content, _frontmatter, config) => {
      const urlRegex = /https?:\/\/([^/\s"'`)]+)/g;
      const whitelist = (config && config.whitelistedUrls) || [];
      const defaultWhitelist = [
        'github.com', 'owasp.org', 'nodejs.org', 'developer.mozilla.org',
        'nextjs.org', 'supabase.com', 'learn.microsoft.com', 'npmjs.com',
        'localhost', '127.0.0.1', 'example.com',
      ];
      const allowed = [...defaultWhitelist, ...whitelist];
      const findings = [];
      let match;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        urlRegex.lastIndex = 0;
        while ((match = urlRegex.exec(lines[i])) !== null) {
          const domain = match[1].toLowerCase();
          const isAllowed = allowed.some(w => domain === w || domain.endsWith('.' + w));
          if (!isAllowed) {
            findings.push({ line: i + 1, match: match[0] });
          }
        }
      }
      return findings.length > 0 ? findings[0] : null;
    },
  },
  {
    id: 'MED-004',
    severity: 'MEDIUM',
    description: 'Agent uses model:haiku for security-sensitive role',
    regex: null,
    contentTypes: ['agent'],
    check: (content, frontmatter) => {
      if (!frontmatter) return null;
      const name = (frontmatter.name || '').toLowerCase();
      const model = (frontmatter.model || '').toLowerCase();
      const securityKeywords = ['security', 'auth', 'admin', 'permission', 'access'];
      if (model === 'haiku' && securityKeywords.some(k => name.includes(k))) {
        return { line: 1, match: `model: ${model}, name: ${name}` };
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Content Type Detection
// ---------------------------------------------------------------------------

/**
 * Detect content type from file path.
 * @param {string} filePath
 * @returns {string} One of: agent, skill, command, rule, hook-config, hook-script, unknown
 */
function detectContentType(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  if (/(?:^|\/)agents\/[^/]+\.md$/.test(normalized)) return 'agent';
  if (/(?:^|\/)skills\//.test(normalized) && normalized.endsWith('.md')) return 'skill';
  if (/(?:^|\/)commands\/[^/]+\.md$/.test(normalized)) return 'command';
  if (/(?:^|\/)rules\/[^/]+\.md$/.test(normalized)) return 'rule';
  if (/(?:^|\/)hooks\/hooks\.json$/.test(normalized)) return 'hook-config';
  if (/(?:^|\/)scripts\/hooks\/[^/]+\.js$/.test(normalized)) return 'hook-script';

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Frontmatter Parser
// ---------------------------------------------------------------------------

/**
 * Extract YAML frontmatter from markdown content.
 * Returns null if no frontmatter found.
 * @param {string} content
 * @returns {object|null}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  let currentKey = null;

  for (const line of yaml.split('\n')) {
    // Check for block-style array items (  - value)
    const arrayItemMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayItemMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      result[currentKey].push(arrayItemMatch[1].replace(/^["']|["']$/g, ''));
      continue;
    }

    // Check for key: value pairs
    const kvMatch = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value = kvMatch[2].trim();

      currentKey = key;

      // Empty value means block-style array or multi-line follows
      if (!value) {
        result[key] = [];
        continue;
      }

      // Parse inline array values: ["Read", "Write", "Edit"]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          // Try parsing as YAML-style array
          value = value.slice(1, -1).split(',').map(s =>
            s.trim().replace(/^["']|["']$/g, '')
          );
        }
      }
      // Strip surrounding quotes
      else if (/^["'].*["']$/.test(value)) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scan content against all applicable patterns.
 * @param {string} content - The file content to scan
 * @param {string} contentType - From detectContentType()
 * @param {object} [config] - Optional config with whitelistedUrls, allowedPatterns, etc.
 * @returns {{ findings: Array<{severity: string, id: string, description: string, line: number, match: string}> }}
 */
function scanContent(content, contentType, config) {
  const findings = [];
  const allowedPatterns = (config && config.allowedPatterns) || [];

  // Parse frontmatter for agent/skill/command/rule types
  const frontmatter = ['agent', 'skill', 'command', 'rule'].includes(contentType)
    ? parseFrontmatter(content)
    : null;

  const lines = content.split('\n');

  for (const pattern of PATTERNS) {
    // Skip patterns not applicable to this content type
    if (!pattern.contentTypes.includes(contentType)) continue;

    // Skip explicitly allowed patterns
    if (allowedPatterns.includes(pattern.id)) continue;

    // Custom check function
    if (pattern.check) {
      const result = pattern.check(content, frontmatter, config);
      if (result) {
        findings.push({
          severity: pattern.severity,
          id: pattern.id,
          description: pattern.description,
          line: result.line || 1,
          match: truncate(result.match || '', 120),
        });
      }
      continue;
    }

    // Regex-based check
    if (pattern.regex) {
      if (pattern.multiline) {
        // Scan full content as single string for cross-line patterns
        const fullMatch = content.match(pattern.regex);
        if (fullMatch) {
          const lineNum = content.substring(0, fullMatch.index).split('\n').length;
          findings.push({
            severity: pattern.severity,
            id: pattern.id,
            description: pattern.description,
            line: lineNum,
            match: truncate(fullMatch[0].replace(/\n/g, ' '), 120),
          });
        }
      } else {
        // Scan line by line
        for (let i = 0; i < lines.length; i++) {
          const lineMatch = lines[i].match(pattern.regex);
          if (lineMatch) {
            findings.push({
              severity: pattern.severity,
              id: pattern.id,
              description: pattern.description,
              line: i + 1,
              match: truncate(lineMatch[0], 120),
            });
            break; // One finding per pattern per file
          }
        }
      }
    }
  }

  // Sort by severity: CRITICAL first, then HIGH, then MEDIUM
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  findings.sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3));

  return { findings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PATTERNS,
  scanContent,
  detectContentType,
  parseFrontmatter,
};
