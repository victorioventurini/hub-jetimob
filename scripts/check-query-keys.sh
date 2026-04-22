#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Query Keys Lint Gate
# ═══════════════════════════════════════════════════════════════════════════════
# Fails CI if hardcoded query keys are found outside src/lib/queryKeys.ts
# 
# ❗ REGRA: Nunca usar queryKey inline. Sempre importar de queryKeys.ts.
#
# ✅ Correto:   queryKey: queryKeys.assets.categories(buId)
# ❌ Incorreto: queryKey: ["assets", "categories", buId]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              QUERY KEYS LINT GATE                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 Scanning for hardcoded query keys..."
echo ""

# Files/dirs to exclude
# - queryKeys.ts and src/lib/queryKeys/ are the canonical home for keys
# - __tests__ and *.test.ts contain expectation fixtures (literal arrays are intentional)
# - JSDoc/comment lines (starting with `*` or `//`) are documentation, not real keys
EXCLUDES="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.vite --exclude-dir=coverage --exclude-dir=__tests__ --exclude-dir=queryKeys --exclude=queryKeys.ts --exclude=check-query-keys.sh --exclude=audit-querykeys.ts --exclude=*.test.ts --exclude=*.test.tsx"

FOUND=0
TEMP_FILE=$(mktemp)
RAW_FILE=$(mktemp)

# Function to search and collect violations (filters out comment lines)
search_pattern() {
  local pattern="$1"
  local description="$2"
  
  # Capture matches, then drop lines that are clearly comments (JSDoc `*` or `//`)
  if grep -rn $EXCLUDES -E "$pattern" src/ 2>/dev/null \
      | grep -vE ':[[:space:]]*\*' \
      | grep -vE ':[[:space:]]*//' >> "$TEMP_FILE"; then
    FOUND=1
  fi
}

# Search for all hardcoded query key patterns
search_pattern 'queryKey:\s*\[["'"'"']' "queryKey: ['...']"
search_pattern 'invalidateQueries\s*\(\s*\{?\s*queryKey:\s*\[["'"'"']' "invalidateQueries({ queryKey: ['...'] })"
search_pattern 'invalidateQueries\s*\(\s*\[["'"'"']' "invalidateQueries(['...'])"
search_pattern 'setQueryData\s*\(\s*\[["'"'"']' "setQueryData(['...'])"
search_pattern 'getQueryData\s*\(\s*\[["'"'"']' "getQueryData(['...'])"
search_pattern 'removeQueries\s*\(\s*\[["'"'"']' "removeQueries(['...'])"
search_pattern 'prefetchQuery\s*\([^)]*queryKey:\s*\[["'"'"']' "prefetchQuery({ queryKey: ['...'] })"

if [ $FOUND -eq 1 ]; then
  echo "❌ VIOLATIONS FOUND:"
  echo "─────────────────────────────────────────────────────────────────"
  echo ""
  # Remove duplicates and display
  sort -u "$TEMP_FILE"
  echo ""
  echo "═════════════════════════════════════════════════════════════════"
  echo ""
  echo "🚫 FAIL: Hardcoded query keys detected!"
  echo ""
  echo "╭─────────────────────────────────────────────────────────────────╮"
  echo "│  💡 COMO CORRIGIR:                                              │"
  echo "│                                                                 │"
  echo "│  1. Importe queryKeys:                                          │"
  echo "│     import { queryKeys } from '@/lib/queryKeys';                │"
  echo "│                                                                 │"
  echo "│  2. Use queryKeys.*() em vez de arrays literais:                │"
  echo "│                                                                 │"
  echo "│     ❌ queryKey: ['assets', 'categories', buId]                 │"
  echo "│     ✅ queryKey: queryKeys.assets.categories(buId)              │"
  echo "│                                                                 │"
  echo "│     ❌ invalidateQueries({ queryKey: ['tickets'] })             │"
  echo "│     ✅ invalidateQueries({ queryKey: queryKeys.tickets.all() }) │"
  echo "│                                                                 │"
  echo "│  📖 Veja src/lib/queryKeys.ts para todas as keys disponíveis.   │"
  echo "╰─────────────────────────────────────────────────────────────────╯"
  echo ""
  rm -f "$TEMP_FILE"
  exit 1
fi

rm -f "$TEMP_FILE"
echo "✅ PASS: No hardcoded query keys found!"
echo ""
exit 0
