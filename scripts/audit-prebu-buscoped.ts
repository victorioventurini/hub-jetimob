/**
 * Audit Script: Pre-BU useBuScopedSupabase Usage
 * 
 * Detects useBuScopedSupabase() calls in components/hooks that are
 * mounted before BU selection (providers, guards, auth, onboarding, etc.)
 * 
 * Run: npx tsx scripts/audit-prebu-buscoped.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

// Patterns that indicate pre-BU contexts (files that may run before BU selection)
const PRE_BU_FILE_PATTERNS = [
  /Provider\.tsx$/,
  /Guard\.tsx$/,
  /Context\.tsx$/,
  /useAuth\.tsx$/,
  /Auth\.tsx$/,
  /Onboarding/i,
  /Bootstrap/i,
  /AppLayout/i,
  /RootLayout/i,
  /Layout\.tsx$/,
  /NotificationCenter\.tsx$/,
  /SelectBu/i,
  /PublicAsset/i,
];

// Files explicitly allowed to use global client (whitelisted)
const ALLOWED_FILES = [
  'src/modules/bu/hooks/useBuData.ts',
  'src/modules/external/hooks/useExternalUser.ts',
  'src/contexts/BuContext.tsx',
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/useBuScopedSupabase.ts',
  'src/integrations/supabase/getOptionalBuClient.ts',
  'src/hooks/useAuth.tsx',
];

interface Finding {
  file: string;
  line: number;
  context: string;
  pattern: string;
}

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function isPreBuFile(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check if file matches pre-BU patterns
  return PRE_BU_FILE_PATTERNS.some(pattern => pattern.test(relativePath));
}

function isAllowedFile(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return ALLOWED_FILES.includes(relativePath);
}

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  // Skip allowed files
  if (isAllowedFile(filePath)) {
    return [];
  }
  
  // Only check pre-BU files
  if (!isPreBuFile(filePath)) {
    return [];
  }
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for useBuScopedSupabase() calls
    if (line.includes('useBuScopedSupabase(')) {
      findings.push({
        file: relativePath,
        line: lineNum,
        context: line.trim().substring(0, 80),
        pattern: 'useBuScopedSupabase() in pre-BU file',
      });
    }
  });
  
  return findings;
}

function main() {
  console.log('🔍 Auditing pre-BU useBuScopedSupabase usage...\n');
  
  const files = getAllTsFiles(SRC_DIR);
  let allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = scanFile(file);
    allFindings = allFindings.concat(findings);
  }
  
  if (allFindings.length === 0) {
    console.log('✅ PASS: No useBuScopedSupabase() calls found in pre-BU contexts.\n');
    process.exit(0);
  } else {
    console.log(`❌ FAIL: Found ${allFindings.length} issue(s):\n`);
    
    allFindings.forEach((finding, i) => {
      console.log(`${i + 1}. ${finding.file}:${finding.line}`);
      console.log(`   Pattern: ${finding.pattern}`);
      console.log(`   Context: ${finding.context}`);
      console.log('');
    });
    
    console.log('Fix these by:');
    console.log('  1. Using global supabase client for pre-BU data');
    console.log('  2. Using useOptionalBuClient() for conditional access');
    console.log('  3. Adding file to ALLOWED_FILES if justified\n');
    
    process.exit(1);
  }
}

main();
