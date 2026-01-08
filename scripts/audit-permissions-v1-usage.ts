/**
 * Audit Script: Detect V1 Permission System Usage
 * 
 * This script scans the frontend codebase to find any usage of
 * deprecated V1 permission tables and hooks.
 * 
 * Run with: npx tsx scripts/audit-permissions-v1-usage.ts
 */

import * as fs from "fs";
import * as path from "path";

interface V1Usage {
  file: string;
  line: number;
  pattern: string;
  code: string;
  type: "read" | "write" | "hook";
  severity: "error" | "warn";
}

interface AuditResult {
  usages: V1Usage[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// V1 patterns to detect
const V1_PATTERNS = [
  // Direct table access (write operations - ERROR)
  { pattern: /\.from\(["']permission_groups["']\)[\s\S]*?\.(insert|update|delete|upsert)/g, type: "write" as const, severity: "error" as const },
  { pattern: /\.from\(["']permission_group_permissions["']\)[\s\S]*?\.(insert|update|delete|upsert)/g, type: "write" as const, severity: "error" as const },
  { pattern: /\.from\(["']bu_permission_group_configs["']\)[\s\S]*?\.(insert|update|delete|upsert)/g, type: "write" as const, severity: "error" as const },
  { pattern: /\.from\(["']bu_user_permission_groups["']\)[\s\S]*?\.(insert|update|delete|upsert)/g, type: "write" as const, severity: "error" as const },
  
  // Direct table access (read operations - WARN for now)
  { pattern: /\.from\(["']permission_groups["']\)/g, type: "read" as const, severity: "warn" as const },
  { pattern: /\.from\(["']permission_group_permissions["']\)/g, type: "read" as const, severity: "warn" as const },
  { pattern: /\.from\(["']bu_permission_group_configs["']\)/g, type: "read" as const, severity: "warn" as const },
  { pattern: /\.from\(["']bu_user_permission_groups["']\)/g, type: "read" as const, severity: "warn" as const },
  
  // V1 hooks with write operations - ERROR
  { pattern: /createGroup\.mutate/g, type: "hook" as const, severity: "error" as const },
  { pattern: /updateGroup\.mutate/g, type: "hook" as const, severity: "error" as const },
  { pattern: /setGroupPermissions\.mutate/g, type: "hook" as const, severity: "error" as const },
  { pattern: /toggleGroupEnabled\.mutate/g, type: "hook" as const, severity: "error" as const },
  { pattern: /setUserGroups\.mutate/g, type: "hook" as const, severity: "error" as const },
];

// Allowed files (can use V1 for compatibility/read-only)
const ALLOWED_FILES = [
  "usePermissionGroups.ts", // Hook definition itself
  "useBuPermissions.ts",    // Hook definition itself
  "UserPermissionsV2Sheet.tsx", // Shows V1 read-only for comparison
  "GlobalPermissionsPage.tsx",  // May show V1 read-only
  "BuPermissionsPage.tsx",      // May show V1 read-only
];

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!["node_modules", ".git", "dist", "build"].includes(item)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function auditFile(filePath: string): V1Usage[] {
  const usages: V1Usage[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileName = path.basename(filePath);
  
  // Skip allowed files for read operations
  const isAllowed = ALLOWED_FILES.includes(fileName);
  
  for (const { pattern, type, severity } of V1_PATTERNS) {
    // Reset regex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Skip read operations in allowed files
      if (isAllowed && type === "read") continue;
      
      // Find line number
      const beforeMatch = content.slice(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      
      usages.push({
        file: filePath,
        line: lineNumber,
        pattern: pattern.source.slice(0, 50) + "...",
        code: lines[lineNumber - 1]?.trim().slice(0, 100) || "",
        type,
        severity,
      });
    }
  }
  
  return usages;
}

function runAudit(): AuditResult {
  const srcDir = path.join(process.cwd(), "src");
  const files = getAllFiles(srcDir, [".ts", ".tsx"]);
  
  const allUsages: V1Usage[] = [];
  
  for (const file of files) {
    allUsages.push(...auditFile(file));
  }
  
  // Deduplicate by file + line
  const uniqueUsages = allUsages.filter((usage, index, self) =>
    index === self.findIndex(u => u.file === usage.file && u.line === usage.line)
  );
  
  const summary = {
    total: uniqueUsages.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };
  
  for (const usage of uniqueUsages) {
    summary.byType[usage.type] = (summary.byType[usage.type] || 0) + 1;
    summary.bySeverity[usage.severity] = (summary.bySeverity[usage.severity] || 0) + 1;
  }
  
  return { usages: uniqueUsages, summary };
}

function formatReport(result: AuditResult): string {
  const lines: string[] = [
    "# Audit: V1 Permission System Usage",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Summary",
    `- Total usages found: ${result.summary.total}`,
    `- By type: ${JSON.stringify(result.summary.byType)}`,
    `- By severity: ${JSON.stringify(result.summary.bySeverity)}`,
    "",
  ];
  
  if (result.usages.length === 0) {
    lines.push("✅ No V1 write operations found in frontend code.");
  } else {
    lines.push("## Findings");
    lines.push("");
    
    const errors = result.usages.filter(u => u.severity === "error");
    const warns = result.usages.filter(u => u.severity === "warn");
    
    if (errors.length > 0) {
      lines.push("### ❌ Errors (Write Operations)");
      for (const usage of errors) {
        lines.push(`- **${usage.file}:${usage.line}** [${usage.type}]`);
        lines.push(`  \`${usage.code}\``);
      }
      lines.push("");
    }
    
    if (warns.length > 0) {
      lines.push("### ⚠️ Warnings (Read Operations)");
      for (const usage of warns) {
        lines.push(`- **${usage.file}:${usage.line}** [${usage.type}]`);
        lines.push(`  \`${usage.code}\``);
      }
    }
  }
  
  return lines.join("\n");
}

// Main execution
const result = runAudit();
console.log(formatReport(result));

// Exit with error if write operations found
if (result.summary.bySeverity["error"] > 0) {
  console.error("\n❌ AUDIT FAILED: V1 write operations detected. These must be removed.");
  process.exit(1);
} else {
  console.log("\n✅ AUDIT PASSED: No V1 write operations in frontend.");
  process.exit(0);
}
