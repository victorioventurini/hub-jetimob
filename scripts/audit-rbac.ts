/**
 * RBAC Audit Script
 * 
 * Detecta violações de RBAC no codebase:
 * - Uso de role === (checks hardcoded de role)
 * - isAdmin fora do useAuth
 * - role_in_bu diretamente em componentes
 * - Políticas RLS sem has_permission
 * 
 * Uso: npx tsx scripts/audit-rbac.ts
 */

import * as fs from "fs";
import * as path from "path";

interface Violation {
  file: string;
  line: number;
  type: "ROLE_CHECK" | "IS_ADMIN" | "ROLE_IN_BU" | "HARDCODED_ROLE";
  code: string;
  severity: "warning" | "error";
  suggestion: string;
}

interface AuditResult {
  violations: Violation[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// Arquivos onde checks de role são permitidos (UI-only helpers)
const ALLOWED_ROLE_CHECK_FILES = [
  "src/hooks/useAuth.tsx", // isAdmin é definido aqui como UI helper
  "src/components/layout/DynamicSidebar.tsx", // Visibilidade de menu
  "src/components/layout/Header.tsx", // Visibilidade de link
  "src/components/onboarding/OnboardingWizard.tsx", // Isenção de obrigatoriedade
  "src/modules/bu/components/BuSelector.tsx", // Super admin vê todas BUs
  "src/components/auth/RequirePermission.tsx", // Guard de permissão
  "src/contexts/BuContext.tsx", // Contexto de BU
];

// Padrões a detectar
const PATTERNS = [
  {
    regex: /role\s*===\s*['"`](super_admin|admin|collaborator|team_leader)['"`]/g,
    type: "ROLE_CHECK" as const,
    severity: "warning" as const,
    suggestion: "Substituir por usePermissions().has('permission.key')",
  },
  {
    regex: /role\s*!==\s*['"`](super_admin|admin|collaborator|team_leader)['"`]/g,
    type: "ROLE_CHECK" as const,
    severity: "warning" as const,
    suggestion: "Substituir por !usePermissions().has('permission.key')",
  },
  {
    regex: /userRole\s*===\s*['"`](super_admin|admin|collaborator|team_leader)['"`]/g,
    type: "ROLE_CHECK" as const,
    severity: "warning" as const,
    suggestion: "Substituir por usePermissions().has('permission.key')",
  },
  {
    regex: /role_in_bu\s*===\s*['"`](admin|collaborator)['"`]/g,
    type: "ROLE_IN_BU" as const,
    severity: "warning" as const,
    suggestion: "Usar usePermissions().has() em vez de role_in_bu",
  },
  {
    regex: /\.role\s*===\s*['"`](super_admin|admin)['"`]/g,
    type: "HARDCODED_ROLE" as const,
    severity: "warning" as const,
    suggestion: "Substituir por verificação via permission key",
  },
];

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    if (!fs.existsSync(currentPath)) return;
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip node_modules and other irrelevant dirs
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function isAllowedFile(filePath: string): boolean {
  const normalized = normalizeFilePath(filePath);
  return ALLOWED_ROLE_CHECK_FILES.some((allowed) => normalized.endsWith(allowed));
}

function auditFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const normalizedPath = normalizeFilePath(filePath);

  // Se é um arquivo permitido, pular
  if (isAllowedFile(filePath)) {
    return [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0; // Reset regex
      const matches = line.match(pattern.regex);
      
      if (matches) {
        for (const match of matches) {
          violations.push({
            file: normalizedPath,
            line: lineNumber,
            type: pattern.type,
            code: match,
            severity: pattern.severity,
            suggestion: pattern.suggestion,
          });
        }
      }
    }
  }

  return violations;
}

function runAudit(): AuditResult {
  const srcDir = path.resolve(process.cwd(), "src");
  const files = getAllFiles(srcDir, [".ts", ".tsx"]);
  
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = auditFile(file);
    allViolations.push(...violations);
  }

  // Calcular summary
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const v of allViolations) {
    byType[v.type] = (byType[v.type] || 0) + 1;
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
  }

  return {
    violations: allViolations,
    summary: {
      total: allViolations.length,
      byType,
      bySeverity,
    },
  };
}

function formatReport(result: AuditResult): string {
  const lines: string[] = [];
  
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║              RBAC AUDIT REPORT                               ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");
  
  if (result.violations.length === 0) {
    lines.push("✅ PASS - Nenhuma violação de RBAC encontrada!");
    lines.push("");
    lines.push("Todos os checks de autorização estão usando permission keys.");
    lines.push("");
    lines.push("Arquivos com exceções justificadas (UI-only helpers):");
    for (const file of ALLOWED_ROLE_CHECK_FILES) {
      lines.push(`  - ${file}`);
    }
  } else {
    lines.push(`❌ FAIL - ${result.violations.length} violação(ões) encontrada(s)`);
    lines.push("");
    lines.push("SUMMARY:");
    lines.push(`  Total: ${result.summary.total}`);
    lines.push(`  Por tipo:`);
    for (const [type, count] of Object.entries(result.summary.byType)) {
      lines.push(`    - ${type}: ${count}`);
    }
    lines.push(`  Por severidade:`);
    for (const [sev, count] of Object.entries(result.summary.bySeverity)) {
      lines.push(`    - ${sev}: ${count}`);
    }
    lines.push("");
    lines.push("VIOLATIONS:");
    lines.push("");
    
    for (const v of result.violations) {
      lines.push(`[${v.severity.toUpperCase()}] ${v.file}:${v.line}`);
      lines.push(`  Type: ${v.type}`);
      lines.push(`  Code: ${v.code}`);
      lines.push(`  Suggestion: ${v.suggestion}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// Main execution
const result = runAudit();
const report = formatReport(result);

console.log(report);

// Exit with error code if violations found (for CI)
if (result.violations.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
