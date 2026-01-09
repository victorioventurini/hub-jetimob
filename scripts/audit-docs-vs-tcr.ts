#!/usr/bin/env npx tsx
/**
 * Audit: Documentation vs TCR Consistency
 * 
 * Verifica se documentação em docs/** contradiz o TECHNICAL_CONTEXT_REGISTRY.md
 * 
 * Uso:
 *   npx tsx scripts/audit-docs-vs-tcr.ts
 *   npx tsx scripts/audit-docs-vs-tcr.ts --changed-only  # Apenas arquivos alterados (para CI)
 * 
 * Exit codes:
 *   0 - Nenhum problema encontrado
 *   1 - Problemas críticos encontrados
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ProhibitedTerm {
  pattern: RegExp;
  reason: string;
  correct: string;
  /** If true, only error if NOT in historical context */
  allowInHistorical?: boolean;
}

interface IncompatibleAssertion {
  pattern: RegExp;
  reason: string;
}

interface Finding {
  file: string;
  line: number;
  content: string;
  type: "prohibited_term" | "incompatible_assertion";
  reason: string;
  correct?: string;
}

// Termos proibidos (sempre erro, exceto se allowInHistorical e em contexto histórico)
const PROHIBITED_TERMS: ProhibitedTerm[] = [
  {
    pattern: /\bpermission_groups\b(?!\s*v2)/gi,
    reason: "Tabela V1 removida na Wave 9",
    correct: "permission_templates_v2",
    allowInHistorical: true,
  },
  {
    pattern: /\buser_permission_groups\b/gi,
    reason: "Tabela V1 removida na Wave 9",
    correct: "bu_user_permission_templates_v2",
    allowInHistorical: true,
  },
  {
    pattern: /\bV1\s+templates?\b/gi,
    reason: "Sistema V1 removido na Wave 9",
    correct: "V2 templates",
    allowInHistorical: true,
  },
  {
    pattern: /\bV1\s+permissions?\b/gi,
    reason: "Sistema V1 removido na Wave 9",
    correct: "V2 permissions",
    allowInHistorical: true,
  },
  {
    pattern: /\bprofiles\.email\b/gi,
    reason: "Campo inexistente - use profiles.work_email",
    correct: "profiles.work_email",
  },
  {
    pattern: /\/bu\/:buId\//gi,
    reason: "URL pattern removido - BU vem do contexto",
    correct: "/module/entity/:id ou /go/:entity/:id",
  },
  {
    pattern: /\bbuId\s+(na|in|on)\s+URL\b/gi,
    reason: "BU não deve estar na URL",
    correct: "BU obtida via contexto (BuProvider)",
  },
  {
    pattern: /\bsend_test_notification\b(?!_v2)/gi,
    reason: "RPC deprecated",
    correct: "send_test_notification_v2",
  },
  {
    pattern: /\bnet\.http_post\b.*\bcron\b|\bcron\b.*\bnet\.http_post\b/gi,
    reason: "Pattern removido - usar Edge Function cron",
    correct: "Edge Function com Deno.cron ou external cron trigger",
  },
  {
    pattern: /\bpg_cron\b.*\bnet\.http_post\b|\bnet\.http_post\b.*\bpg_cron\b/gi,
    reason: "Pattern removido - usar Edge Function cron",
    correct: "Edge Function com trigger externo",
  },
  {
    pattern: /\bwhatsapp\s+channel\b/gi,
    reason: "Canal não implementado",
    correct: "Canais ativos: in_app, email, slack, webhook",
  },
  {
    pattern: /\bsms\s+channel\b/gi,
    reason: "Canal não implementado",
    correct: "Canais ativos: in_app, email, slack, webhook",
  },
  {
    pattern: /\btelegram\s+channel\b/gi,
    reason: "Canal não implementado",
    correct: "Canais ativos: in_app, email, slack, webhook",
  },
];

// Afirmações incompatíveis com regras canônicas
const INCOMPATIBLE_ASSERTIONS: IncompatibleAssertion[] = [
  {
    pattern: /user\s+directory\s+(filtra|filters?)\s+(por|by)\s+membership/gi,
    reason: "User Directory v2 usa v_bu_active_profiles (profiles.bu_id), não depende de membership",
  },
  {
    pattern: /\bUI\s+(envia|sends?|passa|passes?)\s+auth[_\s]?user[_\s]?id\b/gi,
    reason: "UI passa profile.id; backend resolve auth_user_id via RPC",
  },
  {
    pattern: /\bcomparar?\s+auth\.uid\(\)\s+(com|with)\s+owner[_\s]?user[_\s]?id\b/gi,
    reason: "Usar my_profile_id() para comparações de ownership",
  },
  {
    pattern: /\bauth\.uid\(\)\s*=\s*owner[_\s]?user[_\s]?id\b/gi,
    reason: "Usar my_profile_id() = owner_user_id em RLS",
  },
  {
    pattern: /\busar?\s+supabase\s+global\s+(para|for)\s+(dados\s+)?operaciona(l|is)\b/gi,
    reason: "Usar useBuScopedSupabase() para dados POST-BU",
  },
  {
    pattern: /\blíder\s+(pode|can)\s+gerenciar\s+time\s+pai\b/gi,
    reason: "Líder gerencia apenas próprio time + filhos diretos",
  },
  {
    pattern: /\bselect\s*\(\s*['"`]\*['"`]\s*\).*recomend/gi,
    reason: "Sempre listar campos explícitos, nunca select('*')",
  },
];

// Patterns de arquivos isentos (podem conter termos históricos)
const EXEMPT_FILE_PATTERNS = [
  /docs\/qa\/.*/i,
  /.*REPORT.*\.md$/i,
  /.*SUNSET.*\.md$/i,
  /docs\/deprecated\/.*/i,
  // O próprio arquivo de regras
  /DOCS_CONSISTENCY_RULES\.md$/i,
  // TCR pode mencionar V1 em contexto de remoção
  /TECHNICAL_CONTEXT_REGISTRY\.md$/i,
];

// Marcadores de contexto histórico
const HISTORICAL_MARKERS = [
  /^>\s*Historical\s+Note:/im,
  /^>\s*Legacy:/im,
  /^##\s*Histórico/im,
  /^###\s*Contexto\s+Histórico/im,
  /^##\s*History/im,
  /^###\s*Historical\s+Context/im,
  /\(removido|removed|deprecated|sunset\)/im,
];

// ============================================================================
// HELPERS
// ============================================================================

function isExemptFile(filePath: string): boolean {
  return EXEMPT_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

function isInHistoricalContext(lines: string[], lineIndex: number): boolean {
  // Check previous 5 lines for historical markers
  const startLine = Math.max(0, lineIndex - 5);
  const contextLines = lines.slice(startLine, lineIndex + 1).join("\n");
  
  return HISTORICAL_MARKERS.some(marker => marker.test(contextLines));
}

function getAllDocsFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      getAllDocsFiles(fullPath, files);
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function getChangedDocsFiles(): string[] {
  try {
    // Get files changed in current PR/branch compared to main
    const result = execSync("git diff --name-only origin/main...HEAD -- docs/", {
      encoding: "utf-8",
    }).trim();
    
    if (!result) return [];
    
    return result
      .split("\n")
      .filter(f => f.endsWith(".md") && fs.existsSync(f));
  } catch {
    // Fallback: get all docs files
    console.warn("⚠️  Could not get changed files, scanning all docs/**");
    return getAllDocsFiles("docs");
  }
}

function auditFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  
  if (isExemptFile(filePath)) {
    return findings;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check prohibited terms
    for (const term of PROHIBITED_TERMS) {
      const match = line.match(term.pattern);
      if (match) {
        // If allowed in historical context, check context
        if (term.allowInHistorical && isInHistoricalContext(lines, index)) {
          continue;
        }
        
        findings.push({
          file: filePath,
          line: lineNumber,
          content: line.trim().substring(0, 100),
          type: "prohibited_term",
          reason: term.reason,
          correct: term.correct,
        });
      }
    }
    
    // Check incompatible assertions
    for (const assertion of INCOMPATIBLE_ASSERTIONS) {
      if (assertion.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: lineNumber,
          content: line.trim().substring(0, 100),
          type: "incompatible_assertion",
          reason: assertion.reason,
        });
      }
    }
  });
  
  return findings;
}

function printFindings(findings: Finding[]): void {
  const groupedByFile = findings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);
  
  for (const [file, fileFindings] of Object.entries(groupedByFile)) {
    console.log(`\n📄 ${file}`);
    
    for (const finding of fileFindings) {
      console.log(`  ❌ Line ${finding.line}:`);
      console.log(`     "${finding.content}..."`);
      console.log(`     Tipo: ${finding.type === "prohibited_term" ? "Termo proibido" : "Afirmação incompatível"}`);
      console.log(`     Regra: ${finding.reason}`);
      if (finding.correct) {
        console.log(`     Correto: ${finding.correct}`);
      }
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const changedOnly = args.includes("--changed-only");
  
  console.log("🔍 Audit: Documentation vs TCR Consistency\n");
  console.log(`   Mode: ${changedOnly ? "Changed files only" : "All docs/**"}`);
  
  // Get files to audit
  const files = changedOnly ? getChangedDocsFiles() : getAllDocsFiles("docs");
  
  if (files.length === 0) {
    console.log("\n✅ PASS: Nenhum arquivo de documentação para auditar.");
    process.exit(0);
  }
  
  console.log(`   Files: ${files.length} arquivo(s)\n`);
  
  // Audit each file
  const allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = auditFile(file);
    allFindings.push(...findings);
  }
  
  // Report results
  if (allFindings.length === 0) {
    console.log("✅ PASS: Nenhuma contradição encontrada em docs/**");
    process.exit(0);
  } else {
    console.log(`❌ FAIL: ${allFindings.length} contradição(ões) encontrada(s)`);
    printFindings(allFindings);
    console.log("\n📚 Ver: docs/engineering/DOCS_CONSISTENCY_RULES.md para regras e correções.");
    process.exit(1);
  }
}

main();
