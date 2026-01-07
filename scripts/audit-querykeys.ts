#!/usr/bin/env npx tsx
/**
 * Query Keys Audit Script
 * 
 * Detects hooks that don't use centralized queryKeys from src/lib/queryKeys.ts
 * 
 * Run: npx tsx scripts/audit-querykeys.ts
 */

import * as fs from "fs";
import * as path from "path";

interface Finding {
  file: string;
  line: number;
  code: string;
  issue: string;
}

const QUERY_KEYS_PATTERNS = {
  // Patterns that indicate queryKey usage without centralized keys
  INLINE_ARRAY: /queryKey:\s*\[(?!queryKeys\.)/,
  INLINE_STRING_ARRAY: /queryKey:\s*\[['"`]/,
};

const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
];

const EXCLUDED_FILES = [
  "queryKeys.ts", // The source file itself
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
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !EXCLUDED_FILES.includes(entry.name)
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function analyzeFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Check if file uses useQuery or useMutation
  const usesReactQuery =
    content.includes("useQuery") ||
    content.includes("useMutation") ||
    content.includes("useInfiniteQuery");

  if (!usesReactQuery) {
    return findings;
  }

  // Check if file imports queryKeys
  const importsQueryKeys = content.includes("from") && content.includes("queryKeys");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Check for inline queryKey arrays
    if (QUERY_KEYS_PATTERNS.INLINE_ARRAY.test(line)) {
      // Skip if it's a type definition or comment
      if (trimmedLine.startsWith("//") || trimmedLine.startsWith("*") || trimmedLine.startsWith("type")) {
        return;
      }

      // Check if it uses queryKeys.* pattern
      if (!line.includes("queryKeys.")) {
        findings.push({
          file: filePath,
          line: lineNumber,
          code: trimmedLine.substring(0, 100),
          issue: importsQueryKeys
            ? "Uses inline queryKey array instead of queryKeys.*"
            : "Uses inline queryKey array and does not import queryKeys",
        });
      }
    }

    // Check for string-based queryKey patterns like ['my-tickets', ...]
    if (QUERY_KEYS_PATTERNS.INLINE_STRING_ARRAY.test(line)) {
      if (trimmedLine.startsWith("//") || trimmedLine.startsWith("*")) {
        return;
      }

      findings.push({
        file: filePath,
        line: lineNumber,
        code: trimmedLine.substring(0, 100),
        issue: "Uses string-based queryKey - should use queryKeys.* from src/lib/queryKeys.ts",
      });
    }
  });

  return findings;
}

function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║              QUERY KEYS AUDIT REPORT                          ║");
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
    console.log("✅ PASS - All queryKey usages use centralized queryKeys!\n");
    console.log("No violations found.\n");
    return;
  }

  console.log(`⚠️ FINDINGS: ${allFindings.length} violations found\n`);

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
      console.log(`  Line ${finding.line}: ${finding.issue}`);
      console.log(`    Code: ${finding.code}`);
    }
  }

  console.log("\n" + "═".repeat(64));
  console.log("\n📊 SUMMARY:");
  console.log(`   Total files with issues: ${Object.keys(byFile).length}`);
  console.log(`   Total violations: ${allFindings.length}`);
  console.log("\n💡 RECOMMENDATION:");
  console.log("   Import and use queryKeys from 'src/lib/queryKeys.ts'");
  console.log("   Example: queryKey: queryKeys.tickets.list(buId, filters)");
  console.log("");

  // Write report to file
  const reportPath = path.join(process.cwd(), "docs", "perf", "querykeys-audit.md");
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = `# Query Keys Audit Report

Generated: ${new Date().toISOString()}

## Summary

- **Total files scanned**: ${files.length}
- **Files with violations**: ${Object.keys(byFile).length}
- **Total violations**: ${allFindings.length}

## Findings

${Object.entries(byFile)
  .map(
    ([file, findings]) => `
### ${path.relative(process.cwd(), file)}

${findings.map((f) => `- **Line ${f.line}**: ${f.issue}\n  \`${f.code}\``).join("\n")}
`
  )
  .join("\n")}

## Recommendation

All queryKey usages should use the centralized \`queryKeys\` object from \`src/lib/queryKeys.ts\`.

Example:
\`\`\`typescript
import { queryKeys } from "@/lib/queryKeys";

useQuery({
  queryKey: queryKeys.tickets.list(buId, filters),
  // ...
});
\`\`\`
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📝 Report saved to: ${reportPath}\n`);
}

main();
