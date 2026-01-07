#!/usr/bin/env npx tsx
/**
 * Overfetch Audit Script
 * 
 * Detects queries that may be overfetching data:
 * - select('*') usage
 * - Missing pagination/limit
 * - Unnecessary joins
 * 
 * Run: npx tsx scripts/audit-overfetch.ts
 */

import * as fs from "fs";
import * as path from "path";

interface Finding {
  file: string;
  line: number;
  code: string;
  issue: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

const PATTERNS = {
  // select('*') - always overfetching
  SELECT_STAR: /\.select\s*\(\s*(['"`]\*['"`]|['"`]\s*\*\s*,)/,
  
  // select with no limit (potential overfetch)
  FROM_WITHOUT_LIMIT: /\.from\s*\([^)]+\)(?![\s\S]*\.limit\s*\()/,
  
  // Query without limit (in useQuery context)
  QUERY_NO_LIMIT: /queryFn:[\s\S]*?\.from\s*\([^)]+\)[\s\S]*?(?=\})/,
};

// Tables that typically need pagination
const HIGH_VOLUME_TABLES = [
  "tickets",
  "ticket_messages",
  "asset_inventory",
  "asset_movements",
  "asset_key_movements",
  "asset_gift_movements",
  "okr_checkins",
  "okr_team_key_results",
  "notifications",
  "profiles",
  "kpi_values",
  "audit_logs",
];

const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
];

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function findSelectStarUsage(content: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for select('*')
    if (/\.select\s*\(\s*['"`]\*['"`]\s*\)/.test(line) || 
        /\.select\s*\(\s*['"`]\s*\*\s*,/.test(line)) {
      findings.push({
        file: "",
        line: lineNumber,
        code: line.trim().substring(0, 120),
        issue: "Uses select('*') - fetch only required fields",
        severity: "HIGH",
      });
    }
  });
  
  return findings;
}

function findMissingPagination(content: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  
  // Find all .from() calls
  const fromRegex = /\.from\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;
  
  while ((match = fromRegex.exec(content)) !== null) {
    const tableName = match[1];
    const matchIndex = match.index;
    
    // Find the line number
    let charCount = 0;
    let lineNumber = 1;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline
      if (charCount > matchIndex) {
        lineNumber = i + 1;
        break;
      }
    }
    
    // Check if this is a high-volume table
    if (HIGH_VOLUME_TABLES.includes(tableName)) {
      // Look for .limit() in the next 500 characters
      const contextAfter = content.substring(matchIndex, matchIndex + 500);
      const hasLimit = /\.limit\s*\(/.test(contextAfter);
      const hasRange = /\.range\s*\(/.test(contextAfter);
      const hasSingle = /\.(single|maybeSingle)\s*\(/.test(contextAfter);
      const hasHead = /head:\s*true/.test(contextAfter);
      
      if (!hasLimit && !hasRange && !hasSingle && !hasHead) {
        findings.push({
          file: "",
          line: lineNumber,
          code: lines[lineNumber - 1]?.trim().substring(0, 120) || "",
          issue: `Query on '${tableName}' without limit/range - may fetch too many rows`,
          severity: "MEDIUM",
        });
      }
    }
  }
  
  return findings;
}

function findUnnecessaryJoins(content: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  
  // Look for select with multiple nested joins that might not be needed
  const selectRegex = /\.select\s*\(\s*`([^`]+)`\s*\)/gs;
  let match;
  
  while ((match = selectRegex.exec(content)) !== null) {
    const selectContent = match[1];
    const joinCount = (selectContent.match(/\w+:\w+\(/g) || []).length;
    
    if (joinCount > 3) {
      // Find line number
      let charCount = 0;
      let lineNumber = 1;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1;
        if (charCount > match.index) {
          lineNumber = i + 1;
          break;
        }
      }
      
      findings.push({
        file: "",
        line: lineNumber,
        code: `select with ${joinCount} joins`,
        issue: `Query has ${joinCount} joins - consider if all are needed or use RPC`,
        severity: "LOW",
      });
    }
  }
  
  return findings;
}

function analyzeFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  // Skip files that don't use Supabase
  if (!content.includes(".from(") && !content.includes("supabase")) {
    return [];
  }
  
  const findings: Finding[] = [];
  
  // Run all checks
  findings.push(...findSelectStarUsage(content, lines).map(f => ({ ...f, file: filePath })));
  findings.push(...findMissingPagination(content, lines).map(f => ({ ...f, file: filePath })));
  findings.push(...findUnnecessaryJoins(content, lines).map(f => ({ ...f, file: filePath })));
  
  return findings;
}

function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║              OVERFETCH AUDIT REPORT                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const srcDir = path.join(process.cwd(), "src");

  if (!fs.existsSync(srcDir)) {
    console.error("❌ src directory not found");
    process.exit(1);
  }

  const files = getAllTsFiles(srcDir);
  console.log(`📁 Scanning ${files.length} TypeScript files...\n`);

  const allFindings: Finding[] = [];

  for (const file of files) {
    const findings = analyzeFile(file);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log("✅ PASS - No overfetching issues detected!\n");
    return;
  }

  // Group by severity
  const high = allFindings.filter(f => f.severity === "HIGH");
  const medium = allFindings.filter(f => f.severity === "MEDIUM");
  const low = allFindings.filter(f => f.severity === "LOW");

  console.log(`⚠️ FINDINGS: ${allFindings.length} potential issues\n`);
  console.log(`   🔴 HIGH: ${high.length}`);
  console.log(`   🟡 MEDIUM: ${medium.length}`);
  console.log(`   🟢 LOW: ${low.length}\n`);

  // Group by file
  const byFile = allFindings.reduce((acc, finding) => {
    if (!acc[finding.file]) {
      acc[finding.file] = [];
    }
    acc[finding.file].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  for (const [file, findings] of Object.entries(byFile)) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n📄 ${relativePath}`);
    console.log("─".repeat(60));

    for (const finding of findings) {
      const icon = finding.severity === "HIGH" ? "🔴" : finding.severity === "MEDIUM" ? "🟡" : "🟢";
      console.log(`  ${icon} Line ${finding.line}: ${finding.issue}`);
      console.log(`     ${finding.code}`);
    }
  }

  console.log("\n" + "═".repeat(64));
  console.log("\n📊 SUMMARY:");
  console.log(`   Total files with issues: ${Object.keys(byFile).length}`);
  console.log(`   Total findings: ${allFindings.length}`);
  console.log("\n💡 RECOMMENDATIONS:");
  console.log("   1. Replace select('*') with explicit field lists");
  console.log("   2. Add .limit() or .range() to queries on large tables");
  console.log("   3. Consider RPCs for complex multi-join queries");
  console.log("");

  // Write report to file
  const reportPath = path.join(process.cwd(), "docs", "perf", "overfetch-audit.md");
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = `# Overfetch Audit Report

Generated: ${new Date().toISOString()}

## Summary

- **Total files scanned**: ${files.length}
- **Files with issues**: ${Object.keys(byFile).length}
- **Total findings**: ${allFindings.length}
  - 🔴 HIGH: ${high.length}
  - 🟡 MEDIUM: ${medium.length}
  - 🟢 LOW: ${low.length}

## HIGH Priority (select('*'))

${high.map(f => `- **${path.relative(process.cwd(), f.file)}:${f.line}** - ${f.issue}`).join("\n") || "None"}

## MEDIUM Priority (Missing pagination)

${medium.map(f => `- **${path.relative(process.cwd(), f.file)}:${f.line}** - ${f.issue}`).join("\n") || "None"}

## LOW Priority (Complex joins)

${low.map(f => `- **${path.relative(process.cwd(), f.file)}:${f.line}** - ${f.issue}`).join("\n") || "None"}

## Recommendations

1. **select('*')**: Replace with explicit field lists to reduce payload size
2. **Missing pagination**: Add \`.limit()\` or \`.range()\` to queries on high-volume tables
3. **Complex joins**: Consider creating database RPCs for complex multi-join queries
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📝 Report saved to: ${reportPath}\n`);
}

main();
