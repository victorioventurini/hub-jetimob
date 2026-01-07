#!/bin/bash

# ============================================================
# IDENTITY CONVENTION LINT CHECK
# ============================================================
# Este script verifica se o módulo OKRs está usando useIdentity()
# corretamente, evitando o uso de useAuth().user.id para ownership.
#
# Uso: ./scripts/check-identity-convention.sh
# Exit code 0 = OK, Exit code 1 = Violação encontrada
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verificando convenção de identidade no módulo OKRs..."
echo ""

VIOLATIONS=0

# Padrão 1: useAuth().user.id em arquivos OKR (exceto comentários)
# Busca por .user.id ou user.id em contexto de assignment/insert
OKR_FILES=$(find src/modules/okrs -name "*.tsx" -o -name "*.ts" 2>/dev/null || echo "")

if [ -n "$OKR_FILES" ]; then
  # Verificar imports de useAuth em arquivos OKR
  AUTH_IMPORTS=$(grep -l "from '@/hooks/useAuth'" $OKR_FILES 2>/dev/null || echo "")
  
  for file in $AUTH_IMPORTS; do
    # Verificar se useAuth é usado para ownership (user.id em insert/update)
    if grep -E "(owner_user_id|cancelled_by|user_id):\s*(user\.id|authUser\.id)" "$file" >/dev/null 2>&1; then
      echo -e "${RED}❌ VIOLAÇÃO:${NC} $file"
      echo "   Uso de auth.users.id para ownership detectado."
      echo "   Use useIdentity().profileId para tabelas OKR (profiles.id)"
      echo ""
      grep -n -E "(owner_user_id|cancelled_by|user_id):\s*(user\.id|authUser\.id)" "$file" | head -5
      echo ""
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
fi

# Padrão 2: Verificar se useAuth ainda está sendo importado em novos dialogs
# (pode ser legítimo para checagem de autenticação, mas deve usar useIdentity para ownership)
DIALOG_FILES=$(find src/modules/okrs/components -name "*Dialog*.tsx" 2>/dev/null || echo "")

for file in $DIALOG_FILES; do
  # Verificar padrão problemático: { user } = useAuth() seguido de user.id em insert
  if grep -q "const { user } = useAuth()" "$file" 2>/dev/null; then
    if grep -E "owner_user_id|cancelled_by" "$file" | grep -q "user\.id" 2>/dev/null; then
      echo -e "${RED}❌ VIOLAÇÃO:${NC} $file"
      echo "   useAuth().user.id usado para ownership."
      echo "   Migrar para useIdentity().profileId"
      echo ""
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

# Resultado
echo "============================================================"
if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✅ Nenhuma violação encontrada!${NC}"
  echo "   Todos os arquivos OKR estão usando useIdentity().profileId corretamente."
  exit 0
else
  echo -e "${RED}❌ $VIOLATIONS violação(ões) encontrada(s)!${NC}"
  echo ""
  echo "📚 Documentação: docs/IDENTITY_CONVENTION.md"
  echo ""
  echo "Correção:"
  echo "  1. Substituir 'useAuth' por 'useIdentity' no import"
  echo "  2. Usar profileId em vez de user.id para ownership"
  echo ""
  echo "Exemplo:"
  echo "  // ERRADO"
  echo "  const { user } = useAuth();"
  echo "  owner_user_id: user.id"
  echo ""
  echo "  // CORRETO"
  echo "  const { profileId } = useIdentity();"
  echo "  owner_user_id: profileId"
  exit 1
fi
