#!/usr/bin/env node
/**
 * Security Gate - PreToolUse Hook
 *
 * Automatically scans content written to plugin directories
 * (agents, skills, commands, rules, hooks, scripts) for
 * dangerous patterns. Blocks CRITICAL findings, warns on HIGH.
 *
 * Also supports --scan mode for manual audits via /security-scan.
 *
 * Usage:
 *   Hook mode (stdin):  Receives JSON from Claude Code PreToolUse
 *   Scan mode (CLI):    node security-gate.js --scan [directory]
 *   Check mode (CLI):   node security-gate.js --check-path <file>
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
  scanContent,
  detectContentType,
  parseFrontmatter,
} = require("../lib/security-patterns");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLUGIN_DIR = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(
  PLUGIN_DIR,
  "scripts",
  "config",
  "security-gate-config.json",
);
const PROTECTED_DIRS = [
  "agents",
  "skills",
  "commands",
  "rules",
  "hooks",
  "scripts",
];

// Security gate's own files (relative to PLUGIN_DIR) - excluded from scanning to avoid self-flagging
const SELF_PATHS = [
  "scripts/hooks/security-gate.js",
  "scripts/lib/security-patterns.js",
  "scripts/config/security-gate-config.json",
  "commands/security-scan.md",
  "rules/plugin-security.md",
];

// ---------------------------------------------------------------------------
// Config Loading
// ---------------------------------------------------------------------------

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(
      "[SECURITY GATE] Warning: Could not load config, using defaults:",
      err.message,
    );
    return {
      blockOnSeverity: "CRITICAL",
      warnOnSeverity: "HIGH",
      auditLogPath: "logs/security-audit.jsonl",
      whitelistedUrls: [],
      allowedPatterns: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

function writeAuditLog(config, entry) {
  try {
    let logPath = path.resolve(
      PLUGIN_DIR,
      config.auditLogPath || "logs/security-audit.jsonl",
    );

    // Prevent audit log path injection outside plugin directory
    if (!logPath.startsWith(PLUGIN_DIR)) {
      logPath = path.join(PLUGIN_DIR, "logs", "security-audit.jsonl");
    }

    const logDir = path.dirname(logPath);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const line =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry,
      }) + "\n";

    fs.appendFileSync(logPath, line, "utf8");
  } catch (err) {
    console.error("[SECURITY GATE] Audit log write failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Hook Mode (stdin - PreToolUse)
// ---------------------------------------------------------------------------

function runHookMode() {
  let data = "";

  process.stdin.on("data", (chunk) => {
    data += chunk;
  });

  process.stdin.on("end", () => {
    let contentToScan = "";
    try {
      const input = JSON.parse(data);
      const toolInput = input.tool_input || {};
      const filePath = toolInput.file_path || "";

      // Determine what content to scan
      if (toolInput.content) {
        // Write tool - full content
        contentToScan = toolInput.content;
      } else if (toolInput.new_string) {
        // Edit tool - new string being inserted
        contentToScan = toolInput.new_string;
      }

      if (!contentToScan || !filePath) {
        // Nothing to scan, passthrough
        console.log(data);
        return;
      }

      // Check if file is in a protected directory
      const normalizedPath = filePath.replace(/\\/g, "/");
      const isProtected = PROTECTED_DIRS.some((dir) => {
        // Match dir at start of path or after a slash
        const pattern = new RegExp(`(?:^|[/])${dir}[/]`, "i");
        return pattern.test(normalizedPath);
      });

      if (!isProtected) {
        // Not in a protected directory, passthrough
        console.log(data);
        return;
      }

      // Skip scanning security gate's own files (avoid self-flagging)
      // Uses full relative path, not basename, to prevent bypass via same-named files
      const relativePath = path
        .relative(PLUGIN_DIR, path.resolve(filePath))
        .replace(/\\/g, "/");
      if (SELF_PATHS.includes(relativePath)) {
        console.log(data);
        return;
      }

      const config = loadConfig();
      const contentType = detectContentType(filePath);
      const result = scanContent(contentToScan, contentType, config);

      // Write audit log
      const action = getAction(result.findings, config);
      writeAuditLog(config, {
        event: action === "BLOCK" ? "block" : "scan",
        trigger: "PreToolUse",
        tool: input.tool || "unknown",
        targetFile: filePath,
        contentType,
        findings: result.findings,
        action,
      });

      // No findings - silent passthrough
      if (result.findings.length === 0) {
        console.log(data);
        return;
      }

      // Format findings for display
      const criticals = result.findings.filter(
        (f) => f.severity === "CRITICAL",
      );
      const highs = result.findings.filter((f) => f.severity === "HIGH");
      const mediums = result.findings.filter((f) => f.severity === "MEDIUM");

      // CRITICAL - Block
      if (criticals.length > 0) {
        console.error("");
        console.error(
          `[SECURITY GATE] BLOCKED - ${criticals.length} critical finding(s):`,
        );
        console.error("");
        for (const f of criticals) {
          console.error(`  ${f.id}  Line ${f.line}: "${f.match}"`);
          console.error(`          ${f.description}`);
          console.error("");
        }
        if (highs.length > 0) {
          console.error(`  + ${highs.length} HIGH warning(s)`);
        }
        if (mediums.length > 0) {
          console.error(`  + ${mediums.length} MEDIUM info(s)`);
        }
        console.error("");
        console.error(
          "  To override: add the pattern ID(s) to allowedPatterns in",
        );
        console.error(`  ${CONFIG_PATH}`);
        console.error("  Then retry the write.");
        console.error("");
        process.exit(2);
      }

      // HIGH - Warn but allow
      if (highs.length > 0) {
        console.error("");
        console.error(
          `[SECURITY GATE] WARNING - ${highs.length} finding(s) in ${path.basename(filePath)}:`,
        );
        console.error("");
        for (const f of highs) {
          console.error(`  ${f.id}  Line ${f.line}: ${f.description}`);
          console.error(`          "${f.match}"`);
        }
        console.error("");
      }

      // MEDIUM - Info
      if (mediums.length > 0 && highs.length === 0) {
        console.error("");
        console.error(
          `[SECURITY GATE] INFO - ${mediums.length} note(s) in ${path.basename(filePath)}:`,
        );
        for (const f of mediums) {
          console.error(`  ${f.id}  Line ${f.line}: ${f.description}`);
        }
        console.error("");
      }

      // Allow the write
      console.log(data);
    } catch (err) {
      console.error("[SECURITY GATE] Error during scan:", err.message);
      // Fail-closed: if scanner errors on content that exists, block it
      if (contentToScan && contentToScan.length > 0) {
        console.error(
          "[SECURITY GATE] BLOCKED: Scanner error on non-empty content. Review manually.",
        );
        process.exit(2);
      }
      // If there was no content to scan, pass through
      console.log(data);
    }
  });
}

// ---------------------------------------------------------------------------
// Scan Mode (CLI - /security-scan command)
// ---------------------------------------------------------------------------

function runScanMode(targetDir) {
  const config = loadConfig();
  const scanRoot = targetDir ? path.resolve(PLUGIN_DIR, targetDir) : PLUGIN_DIR;

  // Prevent path traversal outside plugin directory
  if (!scanRoot.startsWith(PLUGIN_DIR)) {
    console.error(
      "[SECURITY GATE] Error: Scan directory must be within the plugin directory.",
    );
    process.exit(1);
  }

  const dirsToScan = targetDir
    ? [scanRoot]
    : PROTECTED_DIRS.map((d) => path.join(PLUGIN_DIR, d));

  let totalFiles = 0;
  const allFindings = [];

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    const files = walkDir(dir);

    for (const filePath of files) {
      // Only scan .md, .js, .json files
      if (!/\.(md|js|json)$/.test(filePath)) continue;

      // Skip security gate's own files (full relative path check)
      const relPath = path.relative(PLUGIN_DIR, filePath).replace(/\\/g, "/");
      if (SELF_PATHS.includes(relPath)) continue;

      totalFiles++;
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const contentType = detectContentType(filePath);

        if (contentType === "unknown") continue;

        const result = scanContent(content, contentType, config);
        for (const finding of result.findings) {
          allFindings.push({
            ...finding,
            file: path.relative(PLUGIN_DIR, filePath).replace(/\\/g, "/"),
          });
        }
      } catch (err) {
        console.error(`[SCAN] Error reading ${filePath}: ${err.message}`);
      }
    }
  }

  // Write audit log for scan
  writeAuditLog(config, {
    event: "full-scan",
    trigger: "manual",
    totalFiles,
    totalFindings: allFindings.length,
    findings: allFindings,
  });

  // Output report
  const criticals = allFindings.filter((f) => f.severity === "CRITICAL");
  const highs = allFindings.filter((f) => f.severity === "HIGH");
  const mediums = allFindings.filter((f) => f.severity === "MEDIUM");

  console.log("");
  console.log("SECURITY SCAN REPORT");
  console.log("====================");
  console.log(`Scanned: ${totalFiles} files`);
  console.log(
    `CRITICAL: ${criticals.length} | HIGH: ${highs.length} | MEDIUM: ${mediums.length}`,
  );
  console.log("");

  if (criticals.length > 0) {
    console.log("--- CRITICAL ---");
    for (const f of criticals) {
      console.log(`  [${f.id}] ${f.file}:${f.line}`);
      console.log(`    ${f.description}`);
      console.log(`    Match: "${f.match}"`);
    }
    console.log("");
  }

  if (highs.length > 0) {
    console.log("--- HIGH ---");
    for (const f of highs) {
      console.log(`  [${f.id}] ${f.file}:${f.line}`);
      console.log(`    ${f.description}`);
      console.log(`    Match: "${f.match}"`);
    }
    console.log("");
  }

  if (mediums.length > 0) {
    console.log("--- MEDIUM ---");
    for (const f of mediums) {
      console.log(`  [${f.id}] ${f.file}:${f.line}`);
      console.log(`    ${f.description}`);
    }
    console.log("");
  }

  if (allFindings.length === 0) {
    console.log("Status: CLEAN - No issues found");
  } else if (criticals.length > 0) {
    console.log("Status: CRITICAL ISSUES FOUND - Immediate action required");
  } else if (highs.length > 0) {
    console.log("Status: REVIEW REQUIRED - High-severity findings present");
  } else {
    console.log("Status: ACCEPTABLE - Only informational findings");
  }

  console.log("");

  // Exit with non-zero if critical findings
  process.exit(criticals.length > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Check Path Mode (CLI - post-Bash verification)
// ---------------------------------------------------------------------------

function runCheckPathMode(filePath) {
  const config = loadConfig();
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`[SECURITY GATE] File not found: ${resolved}`);
    process.exit(0);
  }

  try {
    const content = fs.readFileSync(resolved, "utf8");
    const contentType = detectContentType(resolved);

    if (contentType === "unknown") {
      console.log("File type not recognized, skipping scan.");
      process.exit(0);
    }

    const result = scanContent(content, contentType, config);

    writeAuditLog(config, {
      event: "check-path",
      trigger: "PostToolUse-Bash",
      targetFile: resolved,
      contentType,
      findings: result.findings,
      action: getAction(result.findings, config),
    });

    if (result.findings.length === 0) {
      console.log(`[SECURITY GATE] ${path.basename(resolved)}: CLEAN`);
    } else {
      const criticals = result.findings.filter(
        (f) => f.severity === "CRITICAL",
      );
      if (criticals.length > 0) {
        console.error("");
        console.error(
          `[SECURITY GATE] POST-SCAN ALERT - ${criticals.length} CRITICAL finding(s) in ${path.basename(resolved)}:`,
        );
        console.error("");
        for (const f of criticals) {
          console.error(`  ${f.id}  Line ${f.line}: "${f.match}"`);
          console.error(`          ${f.description}`);
        }
        console.error("");
        console.error("  RECOMMENDED: Delete this file or review it manually.");
        console.error("");
      } else {
        for (const f of result.findings) {
          console.error(`  [${f.severity}] ${f.id}: ${f.description}`);
        }
      }
    }
  } catch (err) {
    console.error("[SECURITY GATE] Check failed:", err.message);
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAction(findings, config) {
  const severityLevel = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  const blockLevel = severityLevel[config.blockOnSeverity || "CRITICAL"] ?? 0;

  for (const f of findings) {
    if ((severityLevel[f.severity] ?? 3) <= blockLevel) {
      return "BLOCK";
    }
  }

  const warnLevel = severityLevel[config.warnOnSeverity || "HIGH"] ?? 1;
  for (const f of findings) {
    if ((severityLevel[f.severity] ?? 3) <= warnLevel) {
      return "WARN";
    }
  }

  return "PASS";
}

function walkDir(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        results.push(...walkDir(fullPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`[SCAN] Cannot read directory ${dir}: ${err.message}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args[0] === "--scan") {
  runScanMode(args[1] || null);
} else if (args[0] === "--check-path" && args[1]) {
  runCheckPathMode(args[1]);
} else {
  // Default: Hook mode (read from stdin)
  runHookMode();
}
