/**
 * Audit script: Permission Keys Scanner
 * 
 * Scans the codebase for permission key usage and compares with catalog.
 * Run: npx tsx scripts/audit-permission-keys.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');

// Patterns to match permission key usage
const PATTERNS = [
  /has\(["']([^"']+)["']\)/g,
  /hasAny\(\[([^\]]+)\]\)/g,
  /hasAll\(\[([^\]]+)\]\)/g,
  /permission=["']([^"']+)["']/g,
  /anyOf=\{?\[([^\]]+)\]\}?/g,
  /allOf=\{?\[([^\]]+)\]\}?/g,
];

function extractKeys(content: string): string[] {
  const keys: string[] = [];
  
  for (const pattern of PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      const captured = match[1];
      // Handle array syntax
      const extracted = captured
        .split(',')
        .map(s => s.trim().replace(/["']/g, ''))
        .filter(s => s.length > 0 && s.includes('.'));
      keys.push(...extracted);
    }
  }
  
  return keys;
}

function scanDirectory(dir: string): Map<string, string[]> {
  const results = new Map<string, string[]>();
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.')) {
      const subResults = scanDirectory(fullPath);
      subResults.forEach((keys, filePath) => results.set(filePath, keys));
    } else if (file.isFile() && /\.(tsx?|jsx?)$/.test(file.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const keys = extractKeys(content);
      if (keys.length > 0) {
        results.set(fullPath.replace(SRC_DIR, 'src'), keys);
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('🔍 Scanning codebase for permission keys...\n');
  
  const results = scanDirectory(SRC_DIR);
  const allKeys = new Set<string>();
  
  results.forEach((keys) => keys.forEach(k => allKeys.add(k)));
  
  console.log(`📁 Files scanned: ${results.size}`);
  console.log(`🔑 Unique keys found: ${allKeys.size}\n`);
  
  console.log('Keys found in code:');
  console.log('─'.repeat(60));
  [...allKeys].sort().forEach(key => console.log(`  • ${key}`));
  
  console.log('\n📊 Files with permission checks:');
  console.log('─'.repeat(60));
  results.forEach((keys, file) => {
    console.log(`\n${file}:`);
    keys.forEach(k => console.log(`  - ${k}`));
  });
  
  console.log('\n✅ Scan complete. Compare with permission_catalog in database.');
}

main().catch(console.error);
