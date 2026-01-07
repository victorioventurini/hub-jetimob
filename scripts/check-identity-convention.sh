#!/bin/bash

# ============================================================
# IDENTITY CONVENTION LINT CHECK - v2.0
# ============================================================
# Este script verifica se o módulo OKRs está usando useIdentity()
# corretamente, BLOQUEANDO o uso de useAuth no módulo.
#
# DECISÃO DE DESIGN (2026-01-07):
# Optamos por BLOQUEAR imports de useAuth no módulo OKRs inteiro.
# Motivo: É a abordagem mais segura e com menos falsos positivos.
# Se um dev precisar de auth.uid() para algo específico, deve
# criar um hook dedicado ou usar useIdentity().userId.
#
# Uso: ./scripts/check-identity-convention.sh
# Exit code 0 = OK, Exit code 1 = Violação encontrada
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo -e "${CYAN}🔍 IDENTITY CONVENTION LINT CHECK${NC}"
echo "============================================================"
echo ""

VIOLATIONS=0
WARNINGS=0

# ============================================================
# CHECK 1: Bloquear import de useAuth no módulo OKRs
# ============================================================
echo "📋 Check 1: Imports de useAuth no módulo OKRs..."

OKR_FILES=$(find src/modules/okrs -name "*.tsx" -o -name "*.ts" 2>/dev/null || echo "")

if [ -n "$OKR_FILES" ]; then
  AUTH_IMPORTS=$(grep -l "from '@/hooks/useAuth'" $OKR_FILES 2>/dev/null || echo "")
  
  if [ -n "$AUTH_IMPORTS" ]; then
    for file in $AUTH_IMPORTS; do
      echo -e "${RED}❌ VIOLAÇÃO:${NC} $file"
      echo "   Import de useAuth detectado no módulo OKRs."
      echo ""
      grep -n "from '@/hooks/useAuth'" "$file" | head -3
      echo ""
      VIOLATIONS=$((VIOLATIONS + 1))
    done
  else
    echo -e "${GREEN}   ✓ Nenhum import de useAuth encontrado${NC}"
  fi
else
  echo -e "${YELLOW}   ⚠ Nenhum arquivo OKR encontrado${NC}"
fi

echo ""

# ============================================================
# CHECK 2: Verificar uso de .user.id em mutations (backup check)
# ============================================================
echo "📋 Check 2: Uso de .user.id em mutations OKR..."

MUTATION_VIOLATIONS=0
for file in $OKR_FILES; do
  if grep -E "(owner_user_id|cancelled_by|user_id):\s*(user\.id|authUser\.id)" "$file" >/dev/null 2>&1; then
    echo -e "${RED}❌ VIOLAÇÃO:${NC} $file"
    echo "   Uso de auth.users.id para ownership detectado."
    echo ""
    grep -n -E "(owner_user_id|cancelled_by|user_id):\s*(user\.id|authUser\.id)" "$file" | head -3
    echo ""
    MUTATION_VIOLATIONS=$((MUTATION_VIOLATIONS + 1))
  fi
done

if [ $MUTATION_VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}   ✓ Nenhum uso de .user.id para ownership${NC}"
else
  VIOLATIONS=$((VIOLATIONS + MUTATION_VIOLATIONS))
fi

echo ""

# ============================================================
# CHECK 3: Verificar se useIdentity está sendo usado corretamente
# ============================================================
echo "📋 Check 3: Dialogs OKR usando useIdentity..."

DIALOG_FILES=$(find src/modules/okrs/components -name "*Dialog*.tsx" 2>/dev/null || echo "")
IDENTITY_COUNT=0

for file in $DIALOG_FILES; do
  if grep -q "useIdentity" "$file" 2>/dev/null; then
    IDENTITY_COUNT=$((IDENTITY_COUNT + 1))
  fi
done

echo -e "${GREEN}   ✓ $IDENTITY_COUNT dialogs usando useIdentity${NC}"

echo ""

# ============================================================
# RESULTADO FINAL
# ============================================================
echo "============================================================"
echo -e "${CYAN}RESULTADO${NC}"
echo "============================================================"
echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✅ APROVADO - Nenhuma violação encontrada!${NC}"
  echo ""
  echo "   O módulo OKRs está seguindo a convenção de identidade:"
  echo "   • Sem imports de useAuth"
  echo "   • Usando useIdentity().profileId para ownership"
  echo ""
  exit 0
else
  echo -e "${RED}❌ REPROVADO - $VIOLATIONS violação(ões) encontrada(s)!${NC}"
  echo ""
  echo "📚 Documentação: docs/IDENTITY_CONVENTION.md"
  echo ""
  echo "Correção obrigatória:"
  echo ""
  echo "  1. Remover import de useAuth:"
  echo -e "     ${RED}- import { useAuth } from '@/hooks/useAuth';${NC}"
  echo -e "     ${GREEN}+ import { useIdentity } from '@/hooks/useIdentity';${NC}"
  echo ""
  echo "  2. Substituir uso:"
  echo -e "     ${RED}- const { user } = useAuth();${NC}"
  echo -e "     ${GREEN}+ const { profileId, userId } = useIdentity();${NC}"
  echo ""
  echo "  3. Usar profileId para ownership:"
  echo -e "     ${RED}- owner_user_id: user.id${NC}"
  echo -e "     ${GREEN}+ owner_user_id: profileId${NC}"
  echo ""
  exit 1
fi
