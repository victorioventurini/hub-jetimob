/**
 * Audit useBuScopedSupabase Migration
 * 
 * Este script verifica se o código está usando corretamente o useBuScopedSupabase()
 * em vez do cliente global supabase para operações em tabelas operacionais.
 * 
 * Uso: npx tsx scripts/audit-useBuScopedSupabase.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// =====================================================
// OPERATIONAL TABLES (require BU scope)
// =====================================================
const OPERATIONAL_TABLES = [
  // OKRs
  'okr_org_objectives',
  'okr_org_key_results',
  'okr_team_objectives',
  'okr_team_key_results',
  'okr_checkins',
  'okr_insights',
  'okr_comments',
  'okr_links',
  'okr_initiatives',
  'okr_health_snapshots',
  
  // KPIs
  'kpis',
  'kpi_values',
  'kpi_targets',
  
  // Teams & Structure
  'teams',
  'squads',
  'squad_members',
  
  // Assets
  'asset_inventory',
  'asset_categories',
  'asset_movements',
  'asset_keyrings',
  'asset_keys',
  'asset_key_movements',
  'asset_clavicularies',
  'asset_hooks',
  'asset_groups',
  'asset_group_items',
  'asset_gift_items',
  'asset_gift_batches',
  'asset_gift_movements',
  'asset_permissions',
  
  // Tickets
  'tickets',
  'ticket_messages',
  'ticket_attachments',
  'ticket_mentions',
  'ticket_participants',
  'ticket_categories',
  'ticket_subcategories',
  
  // Partners
  'partner_companies',
  'partner_contacts',
  
  // Notifications
  'notifications',
  'user_notification_preferences',
  'bu_notification_channels',
  
  // Cycles
  'cycles',
  
  // BU Config
  'bu_locations',
  'bu_module_configs',
  'bu_integrations_config',
  'bu_ia_config',
  'bu_agent_activations',
  'bu_permission_group_configs',
  'bu_user_permission_groups',
  'bu_user_permission_overrides',
  
  // AI Agents
  'ai_agents',
  'ai_agent_documents',
  'ai_agent_logs',
  
  // Automations
  'automation_connections',
  'automation_connection_events',
  'automation_incoming_tokens',
  'automation_logs',
];

// =====================================================
// ALLOWED EXCEPTIONS (justified global client usage)
// =====================================================
const ALLOWED_EXCEPTIONS = [
  {
    file: 'src/hooks/useAuth.tsx',
    reason: 'Autenticação ocorre ANTES de BU existir',
    allowedTables: ['profiles', 'user_roles'],
    allowedOperations: ['auth.*', 'functions.invoke'],
  },
  {
    file: 'src/components/notifications/NotificationCenter.tsx',
    reason: 'Realtime não suporta headers customizados',
    allowedOperations: ['.channel(', 'removeChannel'],
  },
  {
    file: 'src/modules/bu/hooks/useBuData.ts',
    reason: 'checkEmailDomainAllowed valida domínio antes de BU existir',
    allowedOperations: ['rpc("get_bu_by_email_domain"'],
  },
  {
    file: 'src/integrations/supabase/client.ts',
    reason: 'Definição do singleton base',
    allowAll: true,
  },
  {
    file: 'src/integrations/supabase/useBuScopedSupabase.ts',
    reason: 'Wrapper do cliente',
    allowAll: true,
  },
  {
    file: 'src/integrations/supabase/operationalTables.ts',
    reason: 'Registry de tabelas (não faz queries)',
    allowAll: true,
  },
];

interface Finding {
  file: string;
  line: number;
  type: 'import' | 'from' | 'rpc' | 'functions' | 'storage' | 'auth' | 'channel';
  code: string;
  table?: string;
  severity: 'error' | 'warning' | 'info';
  isException: boolean;
  exceptionReason?: string;
}

interface AuditResult {
  totalFiles: number;
  totalOccurrences: number;
  buScopedCount: number;
  globalClientCount: number;
  operationalViolations: number;
  justifiedExceptions: number;
  findings: Finding[];
  status: 'PASS' | 'FAIL';
}

// Patterns to detect
const GLOBAL_IMPORT_PATTERN = /import\s*{\s*supabase\s*(?:as\s+\w+\s*)?}\s*from\s*['"]@\/integrations\/supabase\/client['"]/;
const BU_SCOPED_PATTERN = /useBuScopedSupabase\s*\(\s*\)/;
const FROM_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*from\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const RPC_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*rpc\s*\(\s*['"]([^'"]+)['"]/g;
const FUNCTIONS_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*functions\s*\.\s*invoke/g;
const STORAGE_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*storage/g;
const AUTH_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*auth/g;
const CHANNEL_PATTERN = /supabase(?:Global|Bu)?\s*\.\s*channel\s*\(/g;

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'supabase'].includes(entry.name)) {
        getAllTsFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function isException(filePath: string): { isException: boolean; exception?: typeof ALLOWED_EXCEPTIONS[0] } {
  const relativePath = path.relative(process.cwd(), filePath);
  const exception = ALLOWED_EXCEPTIONS.find(e => relativePath.includes(e.file));
  return { isException: !!exception, exception };
}

function analyzeFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const { isException: fileIsException, exception } = isException(filePath);
  
  // Check if file uses bu-scoped client
  const usesBuScoped = BU_SCOPED_PATTERN.test(content);
  const usesGlobalImport = GLOBAL_IMPORT_PATTERN.test(content);
  
  // Skip files that only use bu-scoped and don't import global
  if (usesBuScoped && !usesGlobalImport) {
    return findings;
  }
  
  // If exception with allowAll, skip entirely
  if (fileIsException && exception?.allowAll) {
    return findings;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Check for global import
    if (GLOBAL_IMPORT_PATTERN.test(line)) {
      findings.push({
        file: relativePath,
        line: lineNumber,
        type: 'import',
        code: line.trim().substring(0, 100),
        severity: fileIsException ? 'info' : 'warning',
        isException: fileIsException,
        exceptionReason: exception?.reason,
      });
    }
    
    // Check for .from() calls - extract table name
    let match;
    const fromRegex = /\.from\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = fromRegex.exec(line)) !== null) {
      const tableName = match[1];
      const isOperational = OPERATIONAL_TABLES.includes(tableName);
      const isAllowedTable = exception?.allowedTables?.includes(tableName);
      
      // If using global client on operational table (not in allowlist)
      const isViolation = usesGlobalImport && isOperational && !isAllowedTable;
      
      if (usesGlobalImport) {
        findings.push({
          file: relativePath,
          line: lineNumber,
          type: 'from',
          code: line.trim().substring(0, 100),
          table: tableName,
          severity: isViolation ? 'error' : (fileIsException ? 'info' : 'warning'),
          isException: fileIsException && !isViolation,
          exceptionReason: exception?.reason,
        });
      }
    }
    
    // Check for .rpc() calls
    const rpcRegex = /\.rpc\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = rpcRegex.exec(line)) !== null) {
      if (usesGlobalImport) {
        findings.push({
          file: relativePath,
          line: lineNumber,
          type: 'rpc',
          code: line.trim().substring(0, 100),
          severity: fileIsException ? 'info' : 'warning',
          isException: fileIsException,
          exceptionReason: exception?.reason,
        });
      }
    }
    
    // Check for .channel() calls (realtime)
    if (/\.channel\s*\(/.test(line) && usesGlobalImport) {
      findings.push({
        file: relativePath,
        line: lineNumber,
        type: 'channel',
        code: line.trim().substring(0, 100),
        severity: 'info', // Realtime is always an exception
        isException: true,
        exceptionReason: 'Realtime não suporta headers customizados',
      });
    }
    
    // Check for .functions.invoke calls
    if (/\.functions\s*\.\s*invoke/.test(line) && usesGlobalImport) {
      findings.push({
        file: relativePath,
        line: lineNumber,
        type: 'functions',
        code: line.trim().substring(0, 100),
        severity: fileIsException ? 'info' : 'warning',
        isException: fileIsException,
        exceptionReason: exception?.reason,
      });
    }
    
    // Check for .storage calls
    if (/\.storage/.test(line) && usesGlobalImport && !line.includes('localStorage')) {
      findings.push({
        file: relativePath,
        line: lineNumber,
        type: 'storage',
        code: line.trim().substring(0, 100),
        severity: fileIsException ? 'info' : 'warning',
        isException: fileIsException,
        exceptionReason: exception?.reason,
      });
    }
    
    // Check for .auth calls
    if (/\.auth\./.test(line) && usesGlobalImport) {
      findings.push({
        file: relativePath,
        line: lineNumber,
        type: 'auth',
        code: line.trim().substring(0, 100),
        severity: 'info', // Auth is always an exception (pre-BU)
        isException: true,
        exceptionReason: 'Autenticação ocorre antes de BU existir',
      });
    }
  }
  
  return findings;
}

function runAudit(): AuditResult {
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllTsFiles(srcDir);
  
  let allFindings: Finding[] = [];
  let buScopedCount = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (BU_SCOPED_PATTERN.test(content)) {
      buScopedCount++;
    }
    
    const findings = analyzeFile(file);
    allFindings = allFindings.concat(findings);
  }
  
  const operationalViolations = allFindings.filter(f => 
    f.severity === 'error' && 
    f.type === 'from' && 
    f.table && 
    OPERATIONAL_TABLES.includes(f.table)
  ).length;
  
  const justifiedExceptions = allFindings.filter(f => f.isException).length;
  const globalClientFindings = allFindings.filter(f => !f.isException);
  
  return {
    totalFiles: files.length,
    totalOccurrences: allFindings.length,
    buScopedCount,
    globalClientCount: allFindings.filter(f => f.type === 'import').length,
    operationalViolations,
    justifiedExceptions,
    findings: allFindings,
    status: operationalViolations === 0 ? 'PASS' : 'FAIL',
  };
}

function printReport(result: AuditResult) {
  console.log('');
  console.log('═'.repeat(80));
  console.log('  AUDIT: useBuScopedSupabase Migration');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`📁 Arquivos analisados: ${result.totalFiles}`);
  console.log(`✅ Arquivos usando useBuScopedSupabase(): ${result.buScopedCount}`);
  console.log(`⚠️  Arquivos com import global: ${result.globalClientCount}`);
  console.log(`📊 Total de ocorrências: ${result.totalOccurrences}`);
  console.log(`🛡️  Exceções justificadas: ${result.justifiedExceptions}`);
  console.log(`❌ Violações em tabelas operacionais: ${result.operationalViolations}`);
  console.log('');
  
  // Group findings by file
  const byFile = result.findings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);
  
  // Print errors first
  const errorFiles = Object.entries(byFile).filter(([_, findings]) => 
    findings.some(f => f.severity === 'error')
  );
  
  if (errorFiles.length > 0) {
    console.log('❌ ERROS (Violações de tabelas operacionais):');
    console.log('─'.repeat(80));
    for (const [file, findings] of errorFiles) {
      console.log(`\n📁 ${file}`);
      for (const f of findings.filter(f => f.severity === 'error')) {
        console.log(`   L${f.line} [${f.type}] ${f.table ? `Tabela: ${f.table}` : ''}`);
        console.log(`   ${f.code.substring(0, 70)}...`);
      }
    }
    console.log('');
  }
  
  // Print justified exceptions
  const exceptionFiles = Object.entries(byFile).filter(([_, findings]) =>
    findings.every(f => f.isException)
  );
  
  if (exceptionFiles.length > 0) {
    console.log('ℹ️  EXCEÇÕES JUSTIFICADAS:');
    console.log('─'.repeat(80));
    for (const [file, findings] of exceptionFiles) {
      const reason = findings[0]?.exceptionReason || 'Exceção documentada';
      console.log(`   ✓ ${file}`);
      console.log(`     Razão: ${reason}`);
    }
    console.log('');
  }
  
  // Final status
  console.log('═'.repeat(80));
  if (result.status === 'PASS') {
    console.log('');
    console.log('  ✅ RESULTADO: PASS');
    console.log('');
    console.log('  Nenhuma tabela operacional é acessada via cliente global.');
    console.log('  Todas as exceções estão documentadas e justificadas.');
  } else {
    console.log('');
    console.log('  ❌ RESULTADO: FAIL');
    console.log('');
    console.log(`  ${result.operationalViolations} violação(ões) encontrada(s).`);
    console.log('  Corrija os erros acima usando useBuScopedSupabase().');
  }
  console.log('');
  console.log('═'.repeat(80));
  console.log('');
}

// Run the audit
const result = runAudit();
printReport(result);
process.exit(result.status === 'PASS' ? 0 : 1);
