#!/usr/bin/env npx tsx
/**
 * audit-identity-convention.ts
 * 
 * Detecta violações da convenção de identidade no código:
 * 1. Uso de auth.uid() comparado com colunas de domínio
 * 2. JOIN errado entre tabelas (usando coluna errada)
 * 3. Colunas legacy mal interpretadas
 * 
 * Uso: npx tsx scripts/audit-identity-convention.ts
 */

import * as fs from "fs";
import * as path from "path";

// =====================================================
// CONFIGURAÇÃO: Colunas legadas que armazenam profiles.id
// =====================================================

const LEGACY_COLUMNS_STORING_PROFILE_ID = [
  // Tickets
  "tickets.owner_user_id",
  "tickets.created_by_user_id",
  "ticket_messages.author_user_id",
  "ticket_messages.pinned_by_user_id",
  "ticket_participants.user_id",
  "ticket_attachments.uploaded_by_user_id",
  // OKRs
  "okr_org_objectives.owner_user_id",
  "okr_org_key_results.owner_user_id",
  "okr_team_objectives.owner_user_id",
  "okr_team_key_results.owner_user_id",
  "okr_checkins.user_id",
  "okr_initiatives.owner_user_id",
  // Assets
  "asset_inventory.current_user_id",
  "asset_movements.from_user_id",
  "asset_movements.to_user_id",
  "asset_movements.performed_by_user_id",
  "asset_movements.authorized_by_user_id",
  // Teams
  "teams.leader_user_id",
  "user_team_memberships.user_id",
  "squad_memberships.user_id",
  // KPIs
  "kpi_metrics.owner_user_id",
  // Mentions
  "mentions.mentioned_user_id",
  "mentions.created_by",
  // User preferences
  "user_saved_links.user_id",
];

// Colunas que REALMENTE armazenam auth.users.id
const COLUMNS_STORING_AUTH_USER_ID = [
  "bu_user_memberships.user_id",
  "profiles.user_id",
  "user_roles.user_id",
  "notifications.user_id",
  "notification_outbox.user_id",
  "partner_contacts.user_id",
];

// =====================================================
// PATTERNS DE VIOLAÇÃO
// =====================================================

interface ViolationPattern {
  name: string;
  pattern: RegExp;
  severity: "error" | "warning";
  message: string;
}

const VIOLATION_PATTERNS: ViolationPattern[] = [
  // Uso direto de auth.uid() em comparação com coluna de domínio
  {
    name: "auth_uid_domain_comparison",
    pattern: /(?:owner_user_id|created_by_user_id|author_user_id|leader_user_id)\s*[=!]=\s*auth\.uid\(\)/gi,
    severity: "error",
    message: "Comparação direta de coluna de domínio com auth.uid(). Use my_profile_id() ou useIdentity().profileId",
  },
  // JOIN errado: profiles.user_id com coluna que armazena profiles.id
  {
    name: "wrong_join_profiles_user_id",
    pattern: /JOIN\s+profiles\s+\w+\s+ON\s+\w+\.(?:owner_user_id|author_user_id|leader_user_id)\s*=\s*\w+\.user_id/gi,
    severity: "error",
    message: "JOIN incorreto: coluna armazena profiles.id, mas está comparando com profiles.user_id",
  },
  // Coluna profile_id que não existe
  {
    name: "nonexistent_profile_id_column",
    pattern: /(?:tp|ticket_participants)\.profile_id/gi,
    severity: "error",
    message: "Coluna profile_id não existe em ticket_participants. Use user_id (que armazena profiles.id)",
  },
  // Uso de useAuth().user.id para operações de domínio
  {
    name: "use_auth_for_domain",
    pattern: /useAuth\(\)\.user\.id.*(?:owner|created_by|author)/gi,
    severity: "warning",
    message: "Possível uso de useAuth().user.id para ownership. Use useIdentity().profileId",
  },
  // Comparação com auth.uid() onde deveria ser my_profile_id()
  {
    name: "auth_uid_in_rls",
    pattern: /(?:owner_user_id|created_by_user_id|author_user_id|leader_user_id|current_user_id|from_user_id|to_user_id|performed_by_user_id)\s*=\s*auth\.uid\(\)/gi,
    severity: "error",
    message: "RLS usando auth.uid() para coluna que armazena profiles.id. Use my_profile_id()",
  },
];

// =====================================================
// FUNÇÕES DE AUDITORIA
// =====================================================

interface Finding {
  file: string;
  line: number;
  pattern: string;
  severity: "error" | "warning";
  message: string;
  context: string;
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    
    for (const violationPattern of VIOLATION_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (violationPattern.pattern.test(line)) {
          findings.push({
            file: filePath,
            line: i + 1,
            pattern: violationPattern.name,
            severity: violationPattern.severity,
            message: violationPattern.message,
            context: line.trim().substring(0, 100),
          });
        }
        // Reset regex lastIndex
        violationPattern.pattern.lastIndex = 0;
      }
    }
  } catch (error) {
    // Ignore unreadable files
  }
  
  return findings;
}

function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, .git, etc.
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore unreadable directories
  }
  
  return files;
}

// =====================================================
// MAIN
// =====================================================

function main() {
  console.log("🔍 Audit: Identity Convention\n");
  console.log("Scanning for violations of IDENTITY_CONVENTION.md...\n");
  
  const srcFiles = walkDir("src", [".ts", ".tsx"]);
  const supabaseFiles = walkDir("supabase", [".ts", ".sql"]);
  const allFiles = [...srcFiles, ...supabaseFiles];
  
  console.log(`Found ${allFiles.length} files to scan\n`);
  
  const allFindings: Finding[] = [];
  
  for (const file of allFiles) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }
  
  // Group by severity
  const errors = allFindings.filter(f => f.severity === "error");
  const warnings = allFindings.filter(f => f.severity === "warning");
  
  // Print results
  if (errors.length > 0) {
    console.log("❌ ERRORS:\n");
    for (const finding of errors) {
      console.log(`  ${finding.file}:${finding.line}`);
      console.log(`    Pattern: ${finding.pattern}`);
      console.log(`    Message: ${finding.message}`);
      console.log(`    Context: ${finding.context}`);
      console.log();
    }
  }
  
  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS:\n");
    for (const finding of warnings) {
      console.log(`  ${finding.file}:${finding.line}`);
      console.log(`    Pattern: ${finding.pattern}`);
      console.log(`    Message: ${finding.message}`);
      console.log(`    Context: ${finding.context}`);
      console.log();
    }
  }
  
  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`SUMMARY: ${errors.length} errors, ${warnings.length} warnings`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Print cheat sheet
  console.log("📋 LEGACY COLUMNS CHEAT SHEET:");
  console.log("   These columns have 'user_id' in name but store profiles.id:\n");
  for (const col of LEGACY_COLUMNS_STORING_PROFILE_ID.slice(0, 10)) {
    console.log(`   • ${col}`);
  }
  console.log(`   ... and ${LEGACY_COLUMNS_STORING_PROFILE_ID.length - 10} more\n`);
  
  console.log("   These columns actually store auth.users.id:\n");
  for (const col of COLUMNS_STORING_AUTH_USER_ID) {
    console.log(`   • ${col}`);
  }
  console.log();
  
  // Exit with error if violations found
  if (errors.length > 0) {
    process.exit(1);
  }
  
  console.log("✅ No identity convention violations found!\n");
}

main();
