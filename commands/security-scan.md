---
name: security-scan
description: Scan all plugin content (skills, agents, commands, rules, hooks) for security issues
usage: /security-scan [directory] [--strict] [--verbose]
---

# Security Scan

Run a comprehensive security audit of all installed plugin content.

## Steps

1. Execute the security gate scanner in scan mode:

```bash
node "{{PLUGIN_DIR}}/scripts/hooks/security-gate.js" --scan
```

2. Review the output report. It shows findings by severity:
   - **CRITICAL**: Must be fixed immediately (hardcoded secrets, prompt injection, data exfiltration)
   - **HIGH**: Should be reviewed (excessive tool requests, security bypass suggestions)
   - **MEDIUM**: Informational (minor code quality issues in examples)

3. For each CRITICAL or HIGH finding:
   - Read the flagged file at the reported line number
   - Explain to the user what was found and why it is dangerous
   - Recommend whether to fix or remove the content

4. If the user wants to scan only a specific directory:

```bash
node "{{PLUGIN_DIR}}/scripts/hooks/security-gate.js" --scan agents
```

5. To check a single file that was recently added:

```bash
node "{{PLUGIN_DIR}}/scripts/hooks/security-gate.js" --check-path "path/to/file.md"
```

## Report Format

The scanner outputs a structured report:
- Total files scanned
- Findings by severity with file paths and line numbers
- Overall status (CLEAN, ACCEPTABLE, REVIEW REQUIRED, CRITICAL ISSUES FOUND)

## When to Use

- After cloning or pulling updates to the plugin repository
- When reviewing plugin content before deploying to team
- Periodically as a security audit
- When suspicious behavior is observed in Claude sessions
