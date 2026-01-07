/**
 * Audit Supabase Client Usage
 * 
 * Este script verifica se o código está usando corretamente o useBuScopedSupabase()
 * em vez do cliente global supabase para operações que requerem escopo de BU.
 * 
 * Uso: npx tsx scripts/audit-supabase-client.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  type: 'import' | 'from' | 'rpc' | 'functions' | 'storage' | 'auth';
  code: string;
  severity: 'error' | 'warning' | 'info';
}

// Arquivos que são exceções justificadas (podem usar cliente global)
const ALLOWED_GLOBAL_CLIENT_FILES = [
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/useBuScopedSupabase.ts',
  'src/hooks/useAuth.tsx', // Auth precisa do cliente global
  'src/modules/bu/hooks/useBuData.ts', // Carrega BUs antes de ter contexto
];

// Padrões que indicam uso do cliente global (problemático)
const GLOBAL_CLIENT_PATTERNS = [
  { pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/, type: 'import' as const },
  { pattern: /supabase\.from\s*\(/, type: 'from' as const },
  { pattern: /supabase\.rpc\s*\(/, type: 'rpc' as const },
  { pattern: /supabase\.functions\.invoke\s*\(/, type: 'functions' as const },
  { pattern: /supabase\.storage/, type: 'storage' as const },
];

// Padrões permitidos (uso do bu-scoped)
const BU_SCOPED_PATTERNS = [
  /const\s+supabase\s*=\s*useBuScopedSupabase\s*\(\s*\)/,
  /useBuScopedSupabase/,
];

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!['node_modules', 'dist', '.git', 'supabase'].includes(entry.name)) {
        getAllTsFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Skip allowed files
  if (ALLOWED_GLOBAL_CLIENT_FILES.some(allowed => relativePath.includes(allowed))) {
    return findings;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check if file uses bu-scoped client
  const usesBuScoped = BU_SCOPED_PATTERNS.some(p => p.test(content));
  
  // Check for global client patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    for (const { pattern, type } of GLOBAL_CLIENT_PATTERNS) {
      if (pattern.test(line)) {
        // If file also uses bu-scoped, it might be a transition state
        const severity = usesBuScoped ? 'warning' : 'error';
        
        // Skip if it's just an import but the file uses bu-scoped
        if (type === 'import' && usesBuScoped) {
          // Check if import is actually used elsewhere
          const hasGlobalUsage = GLOBAL_CLIENT_PATTERNS.slice(1).some(p => p.pattern.test(content));
          if (!hasGlobalUsage) {
            continue; // Import might be for realtime channels (allowed)
          }
        }
        
        findings.push({
          file: relativePath,
          line: lineNumber,
          type,
          code: line.trim().substring(0, 100),
          severity,
        });
      }
    }
  }
  
  return findings;
}

function main() {
  console.log('🔍 Auditando uso do cliente Supabase...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllTsFiles(srcDir);
  
  let allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = analyzeFile(file);
    allFindings = allFindings.concat(findings);
  }
  
  // Group by file
  const byFile = allFindings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);
  
  // Print results
  const errorCount = allFindings.filter(f => f.severity === 'error').length;
  const warningCount = allFindings.filter(f => f.severity === 'warning').length;
  
  console.log('=' .repeat(80));
  console.log('RELATÓRIO DE AUDITORIA - USO DO CLIENTE SUPABASE');
  console.log('=' .repeat(80));
  console.log(`\nArquivos analisados: ${files.length}`);
  console.log(`Total de findings: ${allFindings.length}`);
  console.log(`  ❌ Erros (uso direto do global): ${errorCount}`);
  console.log(`  ⚠️  Warnings (transição): ${warningCount}`);
  console.log();
  
  if (allFindings.length === 0) {
    console.log('✅ Nenhum uso problemático encontrado!');
    console.log('   Todos os arquivos estão usando useBuScopedSupabase() corretamente.');
    process.exit(0);
  }
  
  // Sort files by number of findings
  const sortedFiles = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
  
  console.log('TOP 10 ARQUIVOS COM MAIS FINDINGS:');
  console.log('-'.repeat(80));
  
  for (const [file, findings] of sortedFiles.slice(0, 10)) {
    const errors = findings.filter(f => f.severity === 'error').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;
    console.log(`  ${file}`);
    console.log(`    Erros: ${errors}, Warnings: ${warnings}`);
  }
  
  console.log();
  console.log('DETALHES DOS FINDINGS:');
  console.log('-'.repeat(80));
  
  for (const [file, findings] of sortedFiles) {
    console.log(`\n📁 ${file}`);
    for (const finding of findings) {
      const icon = finding.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} L${finding.line} [${finding.type}]: ${finding.code}`);
    }
  }
  
  console.log();
  console.log('=' .repeat(80));
  console.log('RECOMENDAÇÕES:');
  console.log('-'.repeat(80));
  console.log(`
1. Substitua imports do cliente global:
   - DE: import { supabase } from "@/integrations/supabase/client";
   - PARA: import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

2. Em componentes/hooks React, adicione no início:
   const supabase = useBuScopedSupabase();

3. Exceções permitidas (mantém cliente global):
   - useAuth.tsx (autenticação)
   - useBuData.ts (carregamento inicial de BUs)
   - Canais realtime (supabase.channel)
`);
  
  // Exit with error if there are errors
  process.exit(errorCount > 0 ? 1 : 0);
}

main();
