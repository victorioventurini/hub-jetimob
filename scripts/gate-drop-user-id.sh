#!/bin/bash
# ============================================================
# IDENTITY CUTOVER v3.0 — Gate Script
# ============================================================
# Verifica zero dependências de bu_user_memberships.user_id
# antes de permitir o DROP COLUMN.
# 
# Critérios de BLOQUEIO:
# - Qualquer referência no frontend (src/)
# - Qualquer referência em edge functions (supabase/functions/)
# - Queries no banco detectando policies/functions/views
#
# Uso: ./scripts/gate-drop-user-id.sh
# ============================================================

set -e

echo "=============================================="
echo "IDENTITY CUTOVER v3.0 — Gate Drop user_id"
echo "=============================================="
echo ""

ERRORS=0

# 1. Verificar código frontend
echo "1. Verificando referências no frontend..."
FRONTEND_HITS=$(grep -rn "bu_user_memberships" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "profile_id" | grep "user_id" | wc -l || echo "0")

if [ "$FRONTEND_HITS" -gt 0 ]; then
  echo "   ❌ ENCONTRADAS $FRONTEND_HITS referências no frontend:"
  grep -rn "bu_user_memberships" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "profile_id" | grep "user_id" || true
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ Nenhuma referência no frontend"
fi

echo ""

# 2. Verificar edge functions
echo "2. Verificando referências em edge functions..."
EDGE_HITS=$(grep -rn "bu_user_memberships" supabase/functions/ --include="*.ts" 2>/dev/null | grep -v "profile_id" | grep "user_id" | wc -l || echo "0")

if [ "$EDGE_HITS" -gt 0 ]; then
  echo "   ❌ ENCONTRADAS $EDGE_HITS referências em edge functions:"
  grep -rn "bu_user_memberships" supabase/functions/ --include="*.ts" 2>/dev/null | grep -v "profile_id" | grep "user_id" || true
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ Nenhuma referência em edge functions"
fi

echo ""

# 3. Verificar migrations SQL
echo "3. Verificando migrations SQL..."
SQL_HITS=$(grep -rn "bu_user_memberships" supabase/migrations/ --include="*.sql" 2>/dev/null | grep -E "\.user_id|user_id\s*=" | grep -v "profile_id" | grep -v "-- LEGACY" | wc -l || echo "0")

if [ "$SQL_HITS" -gt 0 ]; then
  echo "   ⚠️  ENCONTRADAS $SQL_HITS referências em migrations (verificar se são legadas):"
  grep -rn "bu_user_memberships" supabase/migrations/ --include="*.sql" 2>/dev/null | grep -E "\.user_id|user_id\s*=" | grep -v "profile_id" | grep -v "-- LEGACY" | head -10 || true
else
  echo "   ✅ Nenhuma referência ativa em migrations"
fi

echo ""
echo "=============================================="

if [ "$ERRORS" -gt 0 ]; then
  echo "❌ GATE BLOQUEADO: $ERRORS categorias com referências a user_id"
  echo ""
  echo "Ações necessárias:"
  echo "  1. Migrar código frontend para usar profile_id"
  echo "  2. Migrar edge functions para usar profile_id"
  echo "  3. Re-executar este script"
  echo ""
  exit 1
else
  echo "✅ GATE PASSED: Zero referências a bu_user_memberships.user_id"
  echo ""
  echo "Próximo passo: Executar queries no banco para verificar"
  echo "policies, functions e views antes do DROP COLUMN."
  echo ""
  echo "Queries recomendadas:"
  echo "  -- Policies"
  echo "  SELECT COUNT(*) FROM pg_policies"
  echo "    WHERE (qual LIKE '%bu_user_memberships%' AND qual LIKE '%user_id%');"
  echo ""
  echo "  -- Functions"
  echo "  SELECT proname FROM pg_proc"
  echo "    WHERE prosrc LIKE '%bu_user_memberships%' AND prosrc LIKE '%user_id%';"
  echo ""
  echo "  -- Views"
  echo "  SELECT viewname FROM pg_views"
  echo "    WHERE definition LIKE '%bu_user_memberships%' AND definition LIKE '%user_id%';"
  echo ""
  exit 0
fi
