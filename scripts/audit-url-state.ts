#!/usr/bin/env node
/**
 * Script de Auditoria - URL State
 * 
 * Detecta páginas que podem estar usando useState ao invés de URL state
 * para filtros, paginação e ordenação.
 * 
 * Uso: npx tsx scripts/audit-url-state.ts
 */

import * as fs from "fs";
import * as path from "path";

interface Finding {
  file: string;
  line: number;
  pattern: string;
  suggestion: string;
}

const findings: Finding[] = [];

// Padrões que indicam possível uso incorreto de useState para filtros
const PATTERNS = [
  {
    regex: /useState\s*<?\s*string\s*>?\s*\(\s*["']?\s*["']?\s*\)/g,
    name: "useState('') para busca",
    suggestion: "Considere usar useUrlSearch() ou useUrlState({ key: 'q' })",
  },
  {
    regex: /useState\s*<?\s*number\s*>?\s*\(\s*1\s*\)/g,
    name: "useState(1) para paginação",
    suggestion: "Considere usar useUrlState({ key: 'page' })",
  },
  {
    regex: /useState\s*<?\s*\[\s*\]\s*>?\s*\(\s*\[\s*\]\s*\)/g,
    name: "useState([]) para filtros",
    suggestion: "Considere usar useUrlArrayParam()",
  },
  {
    regex: /const\s+\[\s*search\s*,\s*setSearch\s*\]\s*=\s*useState/g,
    name: "useState para search",
    suggestion: "Considere usar useUrlSearch()",
  },
  {
    regex: /const\s+\[\s*page\s*,\s*setPage\s*\]\s*=\s*useState/g,
    name: "useState para page",
    suggestion: "Considere usar useUrlState({ key: 'page' })",
  },
  {
    regex: /const\s+\[\s*filter/g,
    name: "useState para filter",
    suggestion: "Considere usar useUrlStates() com schema apropriado",
  },
  {
    regex: /const\s+\[\s*sort/g,
    name: "useState para sort",
    suggestion: "Considere usar useUrlState({ key: 'sort' })",
  },
  {
    regex: /const\s+\[\s*status\s*,\s*setStatus\s*\]\s*=\s*useState/g,
    name: "useState para status",
    suggestion: "Considere usar useUrlState({ key: 'status' })",
  },
];

// Diretórios a serem escaneados
const SCAN_DIRS = [
  "src/modules",
  "src/pages",
];

// Extensões de arquivo a escanear
const EXTENSIONS = [".tsx", ".ts"];

// Arquivos/padrões a ignorar
const IGNORE_PATTERNS = [
  "node_modules",
  ".test.",
  ".spec.",
  "__tests__",
  "useUrlState", // Não auditar o próprio hook
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function scanFile(filePath: string): void {
  if (shouldIgnore(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Verifica se o arquivo já usa useUrlState
  const usesUrlState = content.includes("useUrlState") || 
                       content.includes("useUrlSearch") ||
                       content.includes("useUrlTab") ||
                       content.includes("useUrlStates");

  // Se já usa URL state, skip
  // Mas ainda reporta se houver useState duplicados
  
  lines.forEach((line, index) => {
    PATTERNS.forEach((pattern) => {
      if (pattern.regex.test(line)) {
        // Reset regex
        pattern.regex.lastIndex = 0;
        
        findings.push({
          file: filePath,
          line: index + 1,
          pattern: pattern.name,
          suggestion: pattern.suggestion,
        });
      }
    });
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
  console.log("🔍 Auditoria de URL State - Hub da Jet\n");
  console.log("Escaneando diretórios:", SCAN_DIRS.join(", "));
  console.log("");

  for (const dir of SCAN_DIRS) {
    scanDirectory(dir);
  }

  if (findings.length === 0) {
    console.log("✅ Nenhum problema encontrado!\n");
    console.log("Todas as páginas parecem estar usando URL state corretamente.");
    return;
  }

  console.log(`⚠️  Encontrados ${findings.length} possíveis problemas:\n`);

  // Agrupa por arquivo
  const byFile = findings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  for (const [file, fileFindings] of Object.entries(byFile)) {
    console.log(`\n📄 ${file}`);
    for (const finding of fileFindings) {
      console.log(`   Linha ${finding.line}: ${finding.pattern}`);
      console.log(`   └─ ${finding.suggestion}`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`\nTotal: ${findings.length} possíveis problemas em ${Object.keys(byFile).length} arquivos`);
  console.log("\nNOTA: Nem todos os findings são necessariamente problemas.");
  console.log("Revise cada caso para determinar se a migração é necessária.");
  console.log("\nDocumentação: docs/URL_STATE_STANDARD.md");
}

main();
