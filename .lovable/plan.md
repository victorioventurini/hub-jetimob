
# Plano: Correção de Permissões de Edição de KRs e Iniciativas

## Resumo Executivo

Foi identificada uma **falha crítica de segurança** nas políticas RLS de `okr_initiatives`: qualquer usuário com a permission key `okrs.initiative.update:self_or_owner` pode editar **todas** as iniciativas da BU, não apenas as suas.

Este plano corrige as políticas de backend e melhora os controles de UI no frontend.

---

## 1. Situação Atual

| Entidade | Backend (RLS) | Frontend (UI) | Diagnóstico |
|----------|---------------|---------------|-------------|
| **KRs de Time** | ✅ Correto | ⚠️ Botões sempre visíveis | Funciona, mas UI não otimizada |
| **Iniciativas** | ❌ Falha crítica | ⚠️ Lógica simplificada | **VULNERABILIDADE** |

### Detalhamento do Problema

**RLS de Iniciativas (atual):**
```sql
CREATE POLICY "okr_initiatives_update_v2" ON public.okr_initiatives
FOR UPDATE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.update:self_or_owner')
)
```

**Problema:** A política verifica apenas a permission key, sem validar ownership ou liderança.

---

## 2. Correções Planejadas

### Fase 1: Migration SQL — Corrigir RLS de Iniciativas

**Arquivo:** `supabase/migrations/YYYYMMDD_fix_initiatives_rls.sql`

**Alterações:**
1. Recriar política `okr_initiatives_update_v2` com validação de ownership
2. Recriar política `okr_initiatives_delete_v2` com validação de ownership
3. Usar função existente `can_manage_team_okr_by_profile()` para liderança

**SQL proposto:**
```sql
-- DROP existing policies
DROP POLICY IF EXISTS okr_initiatives_update_v2 ON okr_initiatives;
DROP POLICY IF EXISTS okr_initiatives_delete_v2 ON okr_initiatives;

-- UPDATE: Requires permission + (owner OR contributor OR team leader)
CREATE POLICY okr_initiatives_update_v2 ON okr_initiatives
FOR UPDATE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.update:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR my_profile_id() = ANY(contributors)
    OR can_manage_team_okr_by_profile(
      my_profile_id(), 
      (SELECT team_id FROM okr_team_key_results WHERE id = kr_id)
    )
  )
);

-- DELETE: Requires permission + (owner OR team leader)
CREATE POLICY okr_initiatives_delete_v2 ON okr_initiatives
FOR DELETE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.delete:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR can_manage_team_okr_by_profile(
      my_profile_id(), 
      (SELECT team_id FROM okr_team_key_results WHERE id = kr_id)
    )
  )
);
```

---

### Fase 2: Hook de Permissão para KRs

**Arquivo:** `src/modules/okrs/hooks/useCanEditKr.ts`

**Propósito:** Verificar se usuário pode editar um KR específico (para controle de UI)

```typescript
import { useMemo } from "react";
import { useProfileId } from "@/hooks/useIdentity";
import { useCanManageTeamOkr } from "./useCanManageTeamOkr";

interface KrForPermission {
  team_id: string;
  owner_user_id: string | null;
  co_responsibles?: string[] | null;
}

export function useCanEditKr(kr: KrForPermission | null | undefined) {
  const profileId = useProfileId();
  const { canManage, isLoading } = useCanManageTeamOkr(kr?.team_id);
  
  const canEdit = useMemo(() => {
    if (!kr || !profileId) return false;
    
    // Owner pode editar
    if (kr.owner_user_id === profileId) return true;
    // Co-responsável pode editar
    if (kr.co_responsibles?.includes(profileId)) return true;
    // Líder do time pode editar
    if (canManage) return true;
    
    return false;
  }, [kr, profileId, canManage]);
  
  return { canEdit, isLoading };
}
```

---

### Fase 3: Hook de Permissão para Iniciativas

**Arquivo:** `src/modules/okrs/hooks/useCanEditInitiative.ts`

```typescript
import { useMemo } from "react";
import { useProfileId } from "@/hooks/useIdentity";
import { useCanManageTeamOkr } from "./useCanManageTeamOkr";

interface InitiativeForPermission {
  owner_user_id: string;
  contributors?: string[] | null;
}

export function useCanEditInitiative(
  initiative: InitiativeForPermission | null | undefined,
  krTeamId: string | null | undefined
) {
  const profileId = useProfileId();
  const { canManage, isLoading } = useCanManageTeamOkr(krTeamId);
  
  const canEdit = useMemo(() => {
    if (!initiative || !profileId) return false;
    
    // Owner pode editar
    if (initiative.owner_user_id === profileId) return true;
    // Contributor pode editar
    if (initiative.contributors?.includes(profileId)) return true;
    // Líder do time do KR pode editar
    if (canManage) return true;
    
    return false;
  }, [initiative, profileId, canManage]);
  
  return { canEdit, isLoading };
}
```

---

### Fase 4: Atualizar UI — TeamObjectiveCard

**Arquivo:** `src/modules/okrs/components/TeamObjectiveCard.tsx`

**Alteração:** Condicionar renderização de botões de edição/check-in de KRs

```typescript
// Adicionar import do hook
import { useCanEditKr } from "../hooks/useCanEditKr";

// Dentro do map de KRs, usar o hook para cada KR
// Nota: Como hooks não podem ser usados em loops, 
// extrair para componente filho KrActionButtons
```

**Abordagem:** Criar componente `KrActionButtons` que encapsula a lógica de permissão:

```typescript
function KrActionButtons({ kr, onEdit, onCheckin }) {
  const { canEdit } = useCanEditKr(kr);
  
  if (!canEdit) return <OkrStatusBadge status={kr.status} type="kr" />;
  
  return (
    <>
      <Button onClick={onEdit}>Editar</Button>
      <Button onClick={onCheckin}>Check-in</Button>
      <OkrStatusBadge status={kr.status} type="kr" />
    </>
  );
}
```

---

### Fase 5: Atualizar UI — InitiativesList

**Arquivo:** `src/modules/okrs/components/initiatives/InitiativesList.tsx`

**Alteração atual (linha 40-42):**
```typescript
const canEditInitiative = (initiative: Initiative) => {
  return canEdit || initiative.owner_user_id === profileId;
};
```

**Correção:** Adicionar verificação de liderança do time do KR

```typescript
// Usar hook useCanManageTeamOkr para verificar liderança
const { canManage: canManageTeam } = useCanManageTeamOkr(krTeamId);

const canEditInitiative = (initiative: Initiative) => {
  // Prop canEdit indica permissão geral
  if (canEdit) return true;
  // Owner pode editar
  if (initiative.owner_user_id === profileId) return true;
  // Contributor pode editar
  if (initiative.contributors?.includes(profileId)) return true;
  // Líder do time pode editar
  if (canManageTeam) return true;
  
  return false;
};
```

---

### Fase 6: Atualizar Exports

**Arquivo:** `src/modules/okrs/hooks/index.ts`

Adicionar exports dos novos hooks:
```typescript
export { useCanEditKr } from "./useCanEditKr";
export { useCanEditInitiative } from "./useCanEditInitiative";
```

---

### Fase 7: Atualizar Documentação de QA

**Arquivo:** `docs/qa/QA_OKR_TEAM_SCOPE.md`

Adicionar seção para iniciativas com cenários:
- Owner de iniciativa pode editar
- Contributor de iniciativa pode editar
- Líder do time do KR pode editar
- Colaborador comum NÃO pode editar

---

## 3. Regras de Negócio Garantidas

| Regra | KRs | Iniciativas | Enforcement |
|-------|-----|-------------|-------------|
| Owner pode editar | ✅ | ✅ | Backend RLS + Frontend UI |
| Co-responsável/Contributor pode editar | ✅ | ✅ | Backend RLS + Frontend UI |
| Líder do time pode editar | ✅ | ✅ | Backend RLS + Frontend UI |
| Líder de sub-time pode editar itens do sub-time | ✅ | ✅ | Backend RLS |
| Líder de sub-time NÃO pode editar itens do time pai | ✅ | ✅ | Backend RLS |
| Colaborador comum NÃO pode editar | ✅ | ✅ | Backend RLS + Frontend UI |

---

## 4. Arquivos Modificados/Criados

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| `supabase/migrations/YYYYMMDD_fix_initiatives_rls.sql` | Criar | Corrigir RLS |
| `src/modules/okrs/hooks/useCanEditKr.ts` | Criar | Hook de permissão KR |
| `src/modules/okrs/hooks/useCanEditInitiative.ts` | Criar | Hook de permissão Iniciativa |
| `src/modules/okrs/hooks/index.ts` | Modificar | Adicionar exports |
| `src/modules/okrs/components/TeamObjectiveCard.tsx` | Modificar | Condicionar botões |
| `src/modules/okrs/components/initiatives/InitiativesList.tsx` | Modificar | Melhorar lógica |
| `docs/qa/QA_OKR_TEAM_SCOPE.md` | Modificar | Adicionar cenários |

---

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Subquery em RLS impacta performance | Baixa | Médio | Índice já existe em `okr_team_key_results(id)` |
| Usuários perdem acesso atual | Esperado | Baixo | Correção de segurança (comportamento correto) |
| Hook causa re-renders | Baixa | Baixo | Memoização com `useMemo` |

---

## 6. Compatibilidade

| Padrão | Status |
|--------|--------|
| TCR v2.74.0 | ✅ Compatível |
| IDENTITY_CONVENTION v2.1.1 | ✅ Usa `my_profile_id()` |
| PERMISSIONS_AND_RBAC_MODEL v1.2.0 | ✅ Usa `has_permission()` |
| DEVELOPMENT_STANDARDS v1.17.0 | ✅ Seguido |

---

## 7. Ordem de Execução

1. **Migration SQL** — Corrigir RLS no backend (proteção imediata)
2. **Hooks de permissão** — Criar lógica de verificação no frontend
3. **Componentes UI** — Ocultar botões para quem não pode editar
4. **Documentação** — Atualizar QA checklists
