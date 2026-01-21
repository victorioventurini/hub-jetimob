#!/bin/bash
# =====================================================
# IDENTITY GATE - CI/Pre-commit Enforcement Script
# =====================================================
# Version: 2.1.0
# Purpose: Block identity convention violations before merge
#
# Exit codes:
#   0 = PASS (no violations)
#   1 = FAIL (violations found)
# =====================================================

set -e

echo "🔐 Identity Gate v2.1.0"
echo "========================================"

VIOLATIONS=0

# =====================================================
# CHECK 1: Block auth.uid() comparisons with domain columns
# =====================================================
echo ""
echo "📋 Check 1: auth.uid() vs domain columns..."

DOMAIN_COLS="owner_user_id|created_by_user_id|author_user_id|current_user_id|leader_user_id|co_leader_user_id|cancelled_by|performed_by_user_id|authorized_by_user_id|profile_id"

# Check SQL files
SQL_VIOLATIONS=$(grep -rn --include="*.sql" -E "auth\.uid\(\)\s*=\s*(${DOMAIN_COLS})|(\b${DOMAIN_COLS})\s*=\s*auth\.uid\(\)" supabase/migrations/ 2>/dev/null || true)

if [ -n "$SQL_VIOLATIONS" ]; then
  echo "❌ FAIL: Direct auth.uid() comparison with domain columns found in SQL:"
  echo "$SQL_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ PASS: No auth.uid() vs domain column violations in SQL"
fi

# =====================================================
# CHECK 2: Block user.id usage in OKR/Ticket modules
# =====================================================
echo ""
echo "📋 Check 2: user.id in OKR/Ticket modules..."

FRONTEND_VIOLATIONS=""

# Check OKR modules
if [ -d "src/modules/okrs" ]; then
  OKR_VIOLATIONS=$(grep -rn --include="*.ts" --include="*.tsx" -E "user\.id|authUser\.id" src/modules/okrs/ 2>/dev/null | grep -v "// ALLOWED:" || true)
  if [ -n "$OKR_VIOLATIONS" ]; then
    FRONTEND_VIOLATIONS="${FRONTEND_VIOLATIONS}${OKR_VIOLATIONS}\n"
  fi
fi

# Check Ticket hooks
if [ -d "src/modules/tickets/hooks" ]; then
  TICKET_VIOLATIONS=$(grep -rn --include="*.ts" --include="*.tsx" -E "user\.id|authUser\.id" src/modules/tickets/hooks/ 2>/dev/null | grep -v "// ALLOWED:" || true)
  if [ -n "$TICKET_VIOLATIONS" ]; then
    FRONTEND_VIOLATIONS="${FRONTEND_VIOLATIONS}${TICKET_VIOLATIONS}\n"
  fi
fi

if [ -n "$FRONTEND_VIOLATIONS" ]; then
  echo "❌ FAIL: user.id/authUser.id found in OKR/Ticket modules:"
  echo -e "$FRONTEND_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ PASS: No user.id violations in OKR/Ticket modules"
fi

# =====================================================
# CHECK 3: Block generic select('*') usage
# =====================================================
echo ""
echo "📋 Check 3: Generic select('*') usage..."

SELECT_STAR_VIOLATIONS=$(grep -rn --include="*.ts" --include="*.tsx" "\.select\s*(\s*['\"\`]\s*\*\s*['\"\`]\s*)" src/ 2>/dev/null | grep -v node_modules | grep -v "// ALLOWED:" || true)

if [ -n "$SELECT_STAR_VIOLATIONS" ]; then
  echo "⚠️  WARNING: select('*') found (prefer explicit columns):"
  echo "$SELECT_STAR_VIOLATIONS"
  # Warning only, not blocking
else
  echo "✅ PASS: No select('*') usage found"
fi

# =====================================================
# CHECK 4: Block useAuth in protected modules
# =====================================================
echo ""
echo "📋 Check 4: useAuth imports in protected modules..."

USEAUTH_VIOLATIONS=""

# Check OKR modules for useAuth
if [ -d "src/modules/okrs" ]; then
  OKR_AUTH=$(grep -rn --include="*.ts" --include="*.tsx" "from ['\"]@/hooks/useAuth['\"]" src/modules/okrs/ 2>/dev/null || true)
  if [ -n "$OKR_AUTH" ]; then
    USEAUTH_VIOLATIONS="${USEAUTH_VIOLATIONS}${OKR_AUTH}\n"
  fi
fi

# Check Ticket hooks for useAuth
if [ -d "src/modules/tickets/hooks" ]; then
  TICKET_AUTH=$(grep -rn --include="*.ts" --include="*.tsx" "from ['\"]@/hooks/useAuth['\"]" src/modules/tickets/hooks/ 2>/dev/null || true)
  if [ -n "$TICKET_AUTH" ]; then
    USEAUTH_VIOLATIONS="${USEAUTH_VIOLATIONS}${TICKET_AUTH}\n"
  fi
fi

if [ -n "$USEAUTH_VIOLATIONS" ]; then
  echo "❌ FAIL: useAuth imports found in protected modules (use useIdentity):"
  echo -e "$USEAUTH_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ PASS: No useAuth imports in protected modules"
fi

# =====================================================
# FINAL RESULT
# =====================================================
echo ""
echo "========================================"
echo "📊 SUMMARY"
echo "========================================"

if [ $VIOLATIONS -gt 0 ]; then
  echo "❌ FAILED: $VIOLATIONS blocking violation(s) found"
  echo ""
  echo "📖 How to fix:"
  echo "  - Use my_profile_id() instead of auth.uid() for domain comparisons"
  echo "  - Use useIdentity().profileId instead of user.id"
  echo "  - Use explicit column selection instead of select('*')"
  echo "  - Import useIdentity, not useAuth, in OKR/Ticket modules"
  echo ""
  echo "📚 Reference: docs/IDENTITY_CHEAT_SHEET.md"
  exit 1
else
  echo "✅ PASSED: No identity convention violations"
  exit 0
fi
