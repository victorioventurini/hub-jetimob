#!/usr/bin/env npx tsx
/**
 * Shared Components Audit
 * 
 * Detects duplicated patterns when canonical components exist.
 * 
 * FAIL: Clear violations (reimplementing canonical components)
 * WARN: Suspicious patterns that might be duplications
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

// Canonical components and their anti-patterns
const COMPONENT_PATTERNS: Array<{
  canonical: string;
  canonicalPath: string;
  antiPatterns: RegExp[];
  severity: "error" | "warning";
  message: string;
}> = [
  {
    canonical: "PageHeader",
    canonicalPath: "src/components/ui/page-header.tsx",
    antiPatterns: [
      // Inline page headers: flex with h1 and buttons
      /<div[^>]*className="[^"]*flex[^"]*justify-between[^"]*"[^>]*>[\s\S]*?<h1[^>]*className="[^"]*text-2xl[^"]*font-(?:semibold|bold)[^"]*"[^>]*>/,
      // h1 with description pattern outside PageHeader
      /<h1[^>]*>[^<]+<\/h1>\s*(?:<p[^>]*className="[^"]*text-muted-foreground[^"]*"[^>]*>)/,
    ],
    severity: "warning",
    message: "Possível header de página inline. Use <PageHeader> de @/components/ui/page-header",
  },
  {
    canonical: "LoadingState",
    canonicalPath: "src/components/ui/loading-state.tsx",
    antiPatterns: [
      // Inline loading spinners (not in loading-state.tsx itself)
      /<div[^>]*className="[^"]*flex[^"]*items-center[^"]*justify-center[^"]*"[^>]*>\s*<Loader2[^>]*className="[^"]*animate-spin[^"]*"[^>]*\/>/,
      // Custom loading text patterns
      /<Loader2[^>]*\/>\s*(?:<span[^>]*>|{?["']?)(?:Carregando|Loading)/,
    ],
    severity: "warning",
    message: "Possível loading inline. Use <LoadingState> ou <LoadingSpinner> de @/components/ui/loading-state",
  },
  {
    canonical: "EmptyState",
    canonicalPath: "src/components/ui/empty-state.tsx",
    antiPatterns: [
      // Inline empty state patterns
      /<div[^>]*className="[^"]*flex[^"]*flex-col[^"]*items-center[^"]*justify-center[^"]*text-center[^"]*"[^>]*>[\s\S]*?(?:Nenhum|Não há|Vazio|Empty)/i,
    ],
    severity: "warning",
    message: "Possível empty state inline. Use <EmptyState> de @/components/ui/empty-state",
  },
  {
    canonical: "ErrorState",
    canonicalPath: "src/components/ui/error-state.tsx",
    antiPatterns: [
      // Inline error displays with retry
      /<div[^>]*>[\s\S]*?(?:Erro|Error|Algo deu errado)[\s\S]*?(?:onRetry|refetch|tentar novamente)/i,
    ],
    severity: "warning",
    message: "Possível error state inline. Use <ErrorState> de @/components/ui/error-state",
  },
  {
    canonical: "BuUserSelect",
    canonicalPath: "src/components/selects/BuUserSelect.tsx",
    antiPatterns: [
      // Custom user selects that query profiles directly
      /\.from\(["'](?:profiles|v_bu_active_profiles)["']\)[\s\S]*?<Select/,
      // Manual user avatar + name in select items
      /<SelectItem[^>]*>[\s\S]*?<Avatar[\s\S]*?user/i,
    ],
    severity: "error",
    message: "Select de usuário customizado detectado. Use <BuUserSelect> de @/components/selects/BuUserSelect",
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
  canonical: string;
  message: string;
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

function getSnippet(content: string, index: number, length: number = 60): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(content.length, index + length);
  let snippet = content.substring(start, end).replace(/\n/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return snippet;
}

function isCanonicalFile(filePath: string, pattern: typeof COMPONENT_PATTERNS[0]): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.includes(pattern.canonicalPath.replace("src/", ""));
}

function hasCanonicalImport(content: string, canonicalName: string): boolean {
  // Check if file imports the canonical component
  const importPattern = new RegExp(
    `import\\s*{[^}]*\\b${canonicalName}\\b[^}]*}\\s*from`,
    "i"
  );
  return importPattern.test(content);
}

// ==========================
// MAIN AUDIT
// ==========================

function auditFile(filePath: string, content: string): Finding[] {
  const findings: Finding[] = [];

  for (const pattern of COMPONENT_PATTERNS) {
    // Skip the canonical file itself
    if (isCanonicalFile(filePath, pattern)) continue;

    // Skip if file already imports the canonical component (likely using it correctly)
    if (hasCanonicalImport(content, pattern.canonical)) continue;

    for (const antiPattern of pattern.antiPatterns) {
      const matches = content.matchAll(new RegExp(antiPattern, "g"));
      
      for (const match of matches) {
        if (match.index === undefined) continue;

        findings.push({
          file: filePath,
          line: getLineNumber(content, match.index),
          severity: pattern.severity,
          canonical: pattern.canonical,
          message: pattern.message,
          snippet: getSnippet(content, match.index),
        });
      }
    }
  }

  return findings;
}

function runAudit(): void {
  console.log("🔍 Shared Components Audit\n");
  console.log("Scanning for duplicated patterns...\n");

  const files = getAllFiles(SRC_DIR, [".tsx"]);
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

  // Print findings
  if (allFindings.length === 0) {
    console.log("✅ No duplicated component patterns found!\n");
  } else {
    console.log(`Found ${allFindings.length} potential duplications:\n`);

    if (errors.length > 0) {
      console.log("❌ ERRORS (must fix):\n");
      for (const finding of errors) {
        console.log(`  ${finding.file}:${finding.line}`);
        console.log(`    ├─ Canonical: ${finding.canonical}`);
        console.log(`    ├─ ${finding.message}`);
        console.log(`    └─ "${finding.snippet}"\n`);
      }
    }

    if (warnings.length > 0) {
      console.log("⚠️  WARNINGS (review recommended):\n");
      for (const finding of warnings) {
        console.log(`  ${finding.file}:${finding.line}`);
        console.log(`    ├─ Canonical: ${finding.canonical}`);
        console.log(`    ├─ ${finding.message}`);
        console.log(`    └─ "${finding.snippet}"\n`);
      }
    }
  }

  // Summary
  console.log("─".repeat(60));
  console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);
  console.log(`Reference: docs/engineering/SHARED_COMPONENTS_REGISTRY.md\n`);

  // Exit code
  if (errors.length > 0) {
    console.log("❌ FAIL: Clear violations found\n");
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
