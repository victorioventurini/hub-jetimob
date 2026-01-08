#!/bin/bash
# Query Keys Lint Gate
# Fails if hardcoded query keys are found outside src/lib/queryKeys.ts

set -e

echo "🔍 Checking for hardcoded query keys..."

# Patterns to detect hardcoded query keys
PATTERNS=(
  'queryKey:\s*\['
  'invalidateQueries\s*\(\s*\{'
  'setQueryData\s*\(\s*\['
  'getQueryData\s*\(\s*\['
  'removeQueries\s*\(\s*\['
)

# Files/dirs to exclude
EXCLUDES="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.vite --exclude-dir=coverage --exclude=queryKeys.ts --exclude=check-query-keys.sh --exclude=audit-querykeys.ts"

FOUND=0
VIOLATIONS=""

# Search for inline array patterns like queryKey: ["...
if grep -rn $EXCLUDES -E 'queryKey:\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for invalidateQueries with inline arrays
if grep -rn $EXCLUDES -E 'invalidateQueries\s*\(\s*\{?\s*queryKey:\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for invalidateQueries({ queryKey: [...] }) pattern - the inline array form
if grep -rn $EXCLUDES -E 'invalidateQueries\s*\(\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for setQueryData with inline arrays  
if grep -rn $EXCLUDES -E 'setQueryData\s*\(\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for getQueryData with inline arrays
if grep -rn $EXCLUDES -E 'getQueryData\s*\(\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for removeQueries with inline arrays
if grep -rn $EXCLUDES -E 'removeQueries\s*\(\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

# Search for prefetchQuery with inline arrays
if grep -rn $EXCLUDES -E 'prefetchQuery\s*\(\s*\{[^}]*queryKey:\s*\[["'"'"']' src/ 2>/dev/null; then
  FOUND=1
fi

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "❌ FAIL: Hardcoded query keys detected!"
  echo ""
  echo "💡 Fix: Use queryKeys from src/lib/queryKeys.ts instead of inline arrays."
  echo "   Example: queryKey: queryKeys.assets.categories(buId)"
  echo ""
  exit 1
fi

echo "✅ PASS: No hardcoded query keys found!"
exit 0
