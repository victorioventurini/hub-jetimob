#!/usr/bin/env npx tsx
/**
 * Shared Utilities Audit
 * 
 * Detects usage of utilities outside the canonical patterns:
 * - Supabase global client in operational modules
 * - Hardcoded query keys
 * - Legacy URL state patterns
 * - Missing idTypes usage
 * 
 * @version 1.0.0
 * @see docs/engineering/SHARED_COMPONENTS_REGISTRY.md
 */

import * as fs from "fs";
import * as path from "path";

// ==========================
// CONFIGURATION
// ==========================

const SRC_DIR = "src";

// Directories that should use BU-scoped client (operational modules)
const OPERATIONAL_MODULES = [
  "src/modules/",
  "src/features/",
];

// Directories that are PRE-BU (can use global client)
const PRE_BU_PATHS = [
  "src/pages/Auth",
  "src/pages/Onboarding",
  "src/pages/SelectBu",
  "src/components/auth/",
  "src/components/onboarding/",
  "src/hooks/useAuth",
  "src/hooks/useUserBus",
  "src/hooks/useIdentity",
  "src/hooks/useExternalUser",
  "src/contexts/BuContext",
  "src/integrations/supabase/",
];

// Utility patterns to check
const UTILITY_PATTERNS: Array<{
  id: string;
  name: string;
  antiPatterns: RegExp[];
  canonicalUsage: string;
  severity: "error" | "warning";
  skipPaths?: RegExp[];
}> = [
  {
    id: "supabase-global-in-module",
    name: "Global Supabase in Operational Module",
    antiPatterns: [
      /import\s*{\s*supabase\s*}\s*from\s*["']@\/integrations\/supabase\/client["']/,
    ],
    canonicalUsage: "import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase'",
    severity: "error",
    skipPaths: PRE_BU_PATHS.map((p) => new RegExp(p.replace(/\//g, "\\/"))),
  },
  {
    id: "hardcoded-querykey",
    name: "Hardcoded Query Key",
    antiPatterns: [
      // queryKey: ["something", ...
      /queryKey:\s*\[\s*["'][a-z-]+["']\s*(?:,|\])/i,
      // useQuery({ queryKey: ["...
      /useQuery\(\s*{\s*queryKey:\s*\[\s*["'][a-z]/i,
      // useMutation with manual invalidation
      /invalidateQueries\(\s*{\s*queryKey:\s*\[\s*["'][a-z]/i,
    ],
    canonicalUsage: "import { queryKeys } from '@/lib/queryKeys'",
    severity: "error",
    skipPaths: [/queryKeys\.ts$/, /\.test\./, /\.spec\./],
  },
  {
    id: "legacy-url-state",
    name: "Legacy URL State (useSearchParams direct)",
    antiPatterns: [
      // Direct useSearchParams without our wrapper
      /const\s*\[\s*searchParams\s*,\s*setSearchParams\s*\]\s*=\s*useSearchParams\(\)/,
    ],
    canonicalUsage: "import { useUrlState } from '@/shared/url'",
    severity: "warning",
    skipPaths: [/useUrlState\.ts$/, /shared\/url/],
  },
  {
    id: "filter-in-usestate",
    name: "Filter State in useState",
    antiPatterns: [
      // useState for filter-like values
      /const\s*\[\s*(?:filter|status|tab|search|category|type)(?:Filter)?\s*,\s*set\w+\s*\]\s*=\s*useState/i,
    ],
    canonicalUsage: "import { useUrlState, useUrlTab, useUrlSearch } from '@/shared/url'",
    severity: "warning",
    skipPaths: [/shared\/url/, /useUrlState/],
  },
  {
    id: "select-star",
    name: "Select * (Overfetch)",
    antiPatterns: [
      /\.select\(\s*["']\*["']\s*\)/,
      /\.select\(\s*\)/,
    ],
    canonicalUsage: ".select('id, field1, field2') - explicit columns only",
    severity: "warning",
  },
  {
    id: "manual-phone-format",
    name: "Manual Phone Formatting",
    antiPatterns: [
      // Manual phone regex/formatting
      /phone\.replace\(\s*\/\\D\/g/,
      /\.replace\(\s*\/\[\^0-9\]\/g.*phone/i,
      // wa.me link construction
      /https:\/\/wa\.me\/\$\{/,
    ],
    canonicalUsage: "import { formatPhoneDisplay, getWhatsAppUrl } from '@/lib/phone'",
    severity: "warning",
    skipPaths: [/lib\/phone\.ts$/],
  },
];

// Files/patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /\.d\.ts$/,
];

// ==========================
// TYPES
// ==========================

interface Finding {
  file: string;
  line: number;
  severity: "error" | "warning";
  patternId: string;
  patternName: string;
  message: string;
  canonicalUsage: string;
  snippet: string;
}

// ==========================
// UTILITIES
// ==========================

function getAllFiles(dir: string, extensions: string[] = [".tsx", ".ts"]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (EXCLUDE_PATTERNS.some((p) => p.test(fullPath))) continue;

    if (item.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.some((ext) => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split("\n").length;
}

function getSnippet(content: string, index: number, length: number = 80): string {
  const lineStart = content.lastIndexOf("\n", index) + 1;
  const lineEnd = content.indexOf("\n", index);
  let line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd).trim();
  if (line.length > length) {
    line = line.substring(0, length) + "...";
  }
  return line;
}

function isOperationalModule(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return OPERATIONAL_MODULES.some((m) => normalized.includes(m));
}

function shouldSkipPath(filePath: string, skipPaths?: RegExp[]): boolean {
  if (!skipPaths) return false;
  const normalized = filePath.replace(/\\/g, "/");
  return skipPaths.some((p) => p.test(normalized));
}

function isPreBuPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return PRE_BU_PATHS.some((p) => normalized.includes(p));
}

// ==========================
// MAIN AUDIT
// ==========================

function auditFile(filePath: string, content: string): Finding[] {
  const findings: Finding[] = [];

  for (const pattern of UTILITY_PATTERNS) {
    // Skip if file matches skip paths
    if (shouldSkipPath(filePath, pattern.skipPaths)) continue;

    // Special handling for supabase-global pattern
    if (pattern.id === "supabase-global-in-module") {
      // Only check operational modules
      if (!isOperationalModule(filePath)) continue;
      // Skip PRE-BU paths
      if (isPreBuPath(filePath)) continue;
    }

    for (const antiPattern of pattern.antiPatterns) {
      const matches = content.matchAll(new RegExp(antiPattern, "g"));
      
      for (const match of matches) {
        if (match.index === undefined) continue;

        findings.push({
          file: filePath,
          line: getLineNumber(content, match.index),
          severity: pattern.severity,
          patternId: pattern.id,
          patternName: pattern.name,
          message: `Detected: ${pattern.name}`,
          canonicalUsage: pattern.canonicalUsage,
          snippet: getSnippet(content, match.index),
        });
      }
    }
  }

  return findings;
}

function runAudit(): void {
  console.log("🔍 Shared Utilities Audit\n");
  console.log("Scanning for non-canonical utility usage...\n");

  const files = getAllFiles(SRC_DIR, [".tsx", ".ts"]);
  const allFindings: Finding[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const findings = auditFile(file, content);
      allFindings.push(...findings);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Group by severity
  const errors = allFindings.filter((f) => f.severity === "error");
  const warnings = allFindings.filter((f) => f.severity === "warning");

  // Group by pattern for summary
  const byPattern: Record<string, Finding[]> = {};
  for (const finding of allFindings) {
    if (!byPattern[finding.patternId]) {
      byPattern[finding.patternId] = [];
    }
    byPattern[finding.patternId].push(finding);
  }

  // Print findings
  if (allFindings.length === 0) {
    console.log("✅ No non-canonical utility usage found!\n");
  } else {
    console.log(`Found ${allFindings.length} findings:\n`);

    if (errors.length > 0) {
      console.log("❌ ERRORS (must fix):\n");
      for (const finding of errors) {
        console.log(`  ${finding.file}:${finding.line}`);
        console.log(`    ├─ ${finding.message}`);
        console.log(`    ├─ Snippet: "${finding.snippet}"`);
        console.log(`    └─ Use: ${finding.canonicalUsage}\n`);
      }
    }

    if (warnings.length > 0) {
      console.log("⚠️  WARNINGS (review recommended):\n");
      for (const finding of warnings) {
        console.log(`  ${finding.file}:${finding.line}`);
        console.log(`    ├─ ${finding.message}`);
        console.log(`    ├─ Snippet: "${finding.snippet}"`);
        console.log(`    └─ Use: ${finding.canonicalUsage}\n`);
      }
    }

    // Pattern summary
    console.log("\n📊 Summary by Pattern:\n");
    for (const [patternId, findings] of Object.entries(byPattern)) {
      const patternName = findings[0].patternName;
      const errorCount = findings.filter((f) => f.severity === "error").length;
      const warnCount = findings.filter((f) => f.severity === "warning").length;
      console.log(`  ${patternName}: ${errorCount} errors, ${warnCount} warnings`);
    }
  }

  // Summary
  console.log("\n" + "─".repeat(60));
  console.log(`\nTotal: ${errors.length} errors, ${warnings.length} warnings`);
  console.log(`Reference: docs/engineering/SHARED_COMPONENTS_REGISTRY.md\n`);

  // Exit code
  if (errors.length > 0) {
    console.log("❌ FAIL: Blocking violations found\n");
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log("⚠️  WARN: Review recommended, but not blocking\n");
    process.exit(0);
  } else {
    console.log("✅ PASS: No violations found\n");
    process.exit(0);
  }
}

// ==========================
// RUN
// ==========================

runAudit();
