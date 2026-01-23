#!/usr/bin/env npx tsx
/**
 * Audit script to find legacy useUrlState imports
 * 
 * Run: npx tsx scripts/audit-useUrlState-legacy.ts
 * 
 * This script scans the codebase for imports from the legacy
 * src/hooks/useUrlState.ts file, which should be replaced with
 * imports from @/shared/url.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  content: string;
}

const findings: Finding[] = [];

const SCAN_DIRS = ['src/pages', 'src/modules', 'src/components', 'src/hooks'];
const IGNORE_PATTERNS = [
  'node_modules',
  '.test.',
  '.spec.',
  '__tests__',
  'src/hooks/useUrlState.ts', // The legacy file itself
];

const LEGACY_IMPORT_PATTERNS = [
  /from\s+["']@\/hooks\/useUrlState["']/,
  /from\s+["']\.\.\/\.\.\/hooks\/useUrlState["']/,
  /from\s+["']\.\.\/hooks\/useUrlState["']/,
  /from\s+["']src\/hooks\/useUrlState["']/,
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function scanFile(filePath: string): void {
  if (shouldIgnore(filePath)) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const pattern of LEGACY_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
        });
        break;
      }
    }
  });
}

function scanDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

function main(): void {
  console.log('🔍 Scanning for legacy useUrlState imports...\n');

  for (const dir of SCAN_DIRS) {
    scanDirectory(dir);
  }

  if (findings.length === 0) {
    console.log('✅ No legacy useUrlState imports found!');
    console.log('   All imports are using the new @/shared/url module.\n');
    process.exit(0);
  }

  console.log(`❌ Found ${findings.length} legacy import(s):\n`);

  // Group by file
  const byFile = findings.reduce(
    (acc, f) => {
      if (!acc[f.file]) acc[f.file] = [];
      acc[f.file].push(f);
      return acc;
    },
    {} as Record<string, Finding[]>
  );

  for (const [file, fileFindings] of Object.entries(byFile)) {
    console.log(`📄 ${file}`);
    for (const finding of fileFindings) {
      console.log(`   Line ${finding.line}: ${finding.content}`);
    }
    console.log();
  }

  console.log('💡 To fix: Replace imports from "@/hooks/useUrlState" with "@/shared/url"');
  console.log('   See docs/canonical/DEVELOPMENT_STANDARDS.md for the correct API usage.\n');

  process.exit(1);
}

main();
