
# Plano: Supervisores de Empresas Parceiras

## Resumo Executivo

Implementar funcionalidade de **Supervisores de Empresas Parceiras** — usuários internos que acompanham automaticamente todos os tickets de uma empresa parceira específica como watchers.

---

## 1. Documentação Validada

| Documento | Versão | Status |
|-----------|--------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | v2.74.0 | ✅ Analisado |
| DATA_MODEL_REGISTRY.md | v2.51.0 | ✅ Analisado |
| DEVELOPMENT_STANDARDS.md | v1.17.0 | ✅ Analisado |
| SCHEMA_QUICK_REFERENCE.md | 2026-01-22 | ✅ Analisado |
| IDENTITY_CONVENTION.md | Canônico | ✅ Referenciado |

---

## 2. Decisão Arquitetural

### Abordagem Híbrida (Recomendada)

A solução combina duas camadas:

1. **Fonte de verdade**: Coluna `supervisor_profile_ids UUID[]` em `partner_company_bu_associations`
2. **Mecanismo de acesso**: Trigger que adiciona supervisores como `watcher` em `ticket_participants`

**Vantagens:**
- Centraliza gestão de supervisores em um único lugar
- Aproveita infraestrutura existente de `ticket_participants`
- `can_view_ticket()` já verifica participantes — sem mudanças na função de RLS
- Automático e consistente via trigger

---

## 3. Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  partner_company_bu_associations                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ + supervisor_profile_ids UUID[] (NOVA COLUNA)                │   │
│  │   → Armazena profiles.id dos supervisores desta empresa/BU   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Trigger: AFTER INSERT on tickets)
┌─────────────────────────────────────────────────────────────────────┐
│                        ticket_participants                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ INSERT supervisores como watchers                             │   │
│  │ participant_type: 'internal_user'                             │   │
│  │ role: 'watcher'                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Plano de Implementação

### Fase 1: Migration — Adicionar Coluna e Trigger

**SQL Migration:**

```sql
-- 1. Adicionar coluna de supervisores
ALTER TABLE partner_company_bu_associations 
ADD COLUMN IF NOT EXISTS supervisor_profile_ids UUID[] DEFAULT '{}';

-- 2. Comentário documentando a coluna
COMMENT ON COLUMN partner_company_bu_associations.supervisor_profile_ids IS 
  'Array de profiles.id que supervisionam esta empresa parceira na BU. 
   Supervisores são automaticamente adicionados como watchers em novos tickets.';

-- 3. Índice GIN para busca eficiente
CREATE INDEX IF NOT EXISTS idx_partner_bu_assoc_supervisors 
ON partner_company_bu_associations USING GIN (supervisor_profile_ids);

-- 4. Função: Adicionar supervisores como watchers ao criar ticket externo
CREATE OR REPLACE FUNCTION trg_add_supervisors_to_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supervisor_ids UUID[];
  v_supervisor_id UUID;
BEGIN
  -- Apenas tickets externos com partner_company_id
  IF NEW.type != 'external' OR NEW.partner_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar supervisores da empresa na BU
  SELECT COALESCE(supervisor_profile_ids, '{}') INTO v_supervisor_ids
  FROM partner_company_bu_associations
  WHERE partner_company_id = NEW.partner_company_id
    AND bu_id = NEW.bu_id
    AND is_active = true
    AND deleted_at IS NULL;

  -- Adicionar cada supervisor como watcher
  FOREACH v_supervisor_id IN ARRAY v_supervisor_ids
  LOOP
    -- Evitar duplicação (supervisor pode já ser creator/owner)
    IF NOT EXISTS (
      SELECT 1 FROM ticket_participants
      WHERE ticket_id = NEW.id
        AND profile_id = v_supervisor_id
    ) THEN
      INSERT INTO ticket_participants (
        bu_id, ticket_id, participant_type, profile_id, role, is_active
      ) VALUES (
        NEW.bu_id, NEW.id, 'internal_user', v_supervisor_id, 'watcher', true
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 5. Trigger após insert de ticket
DROP TRIGGER IF EXISTS trg_auto_add_supervisors ON tickets;
CREATE TRIGGER trg_auto_add_supervisors
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_add_supervisors_to_new_ticket();
```

---

### Fase 2: Query Key

**Arquivo:** `src/lib/queryKeys/tickets.ts`

Adicionar:

```typescript
partnerSupervisors: (companyId: string | null, buId: string | null) => 
  ['tickets', 'partner-supervisors', companyId, buId] as const,
```

---

### Fase 3: Hook — Gerenciar Supervisores

**Arquivo:** `src/modules/tickets/hooks/usePartnerSupervisors.ts`

```typescript
/**
 * Hook para gerenciar supervisores de uma empresa parceira.
 * Supervisores são usuários internos que acompanham todos os tickets da empresa.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

interface SupervisorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  job_title_name?: string | null;
}

export function usePartnerSupervisors(companyId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: queryKeys.tickets.partnerSupervisors(companyId, buId),
    queryFn: async () => {
      if (!companyId || !buId) return { supervisorIds: [], profiles: [] };

      // Buscar associação com supervisor_profile_ids
      const { data: assoc, error } = await supabase
        .from("partner_company_bu_associations")
        .select("supervisor_profile_ids")
        .eq("partner_company_id", companyId)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      const supervisorIds = assoc?.supervisor_profile_ids ?? [];
      
      if (supervisorIds.length === 0) {
        return { supervisorIds: [], profiles: [] };
      }

      // Buscar profiles dos supervisores
      const { data: profiles, error: profilesError } = await supabase
        .from("v_bu_active_profiles")
        .select("id, display_name, photo_url, job_title_name")
        .in("id", supervisorIds);

      if (profilesError) throw profilesError;

      return { 
        supervisorIds, 
        profiles: (profiles ?? []) as SupervisorProfile[] 
      };
    },
    enabled: !!companyId && !!buId,
  });
}

export function useUpdatePartnerSupervisors() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      supervisorIds 
    }: { 
      companyId: string; 
      supervisorIds: string[]; 
    }) => {
      if (!buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("partner_company_bu_associations")
        .update({ 
          supervisor_profile_ids: supervisorIds,
          updated_at: new Date().toISOString(),
        })
        .eq("partner_company_id", companyId)
        .eq("bu_id", buId)
        .is("deleted_at", null);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.partnerSupervisors(variables.companyId, buId),
        refetchType: 'active',
      });
      toast.success("Supervisores atualizados");
    },
    onError: (error: Error) => {
      console.error("[useUpdatePartnerSupervisors] Error:", error);
      toast.error("Erro ao atualizar supervisores");
    },
  });
}
```

---

### Fase 4: UI — Editor de Supervisores

**Arquivo:** `src/modules/tickets/components/settings/SupervisorsEditor.tsx`

Componente que reutiliza `BuUserMultiSelect` para seleção de supervisores:

```typescript
/**
 * Editor de supervisores de empresa parceira.
 * Usa BuUserMultiSelect (componente canônico) para seleção.
 */

import { useState, useEffect } from "react";
import { Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePartnerSupervisors, useUpdatePartnerSupervisors } from "../../hooks";

interface SupervisorsEditorProps {
  companyId: string;
}

export function SupervisorsEditor({ companyId }: SupervisorsEditorProps) {
  const { data, isLoading } = usePartnerSupervisors(companyId);
  const { mutate: updateSupervisors, isPending } = useUpdatePartnerSupervisors();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (data?.supervisorIds) {
      setSelectedIds(data.supervisorIds);
      setHasChanges(false);
    }
  }, [data?.supervisorIds]);

  const handleChange = (ids: string[]) => {
    setSelectedIds(ids);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSupervisors(
      { companyId, supervisorIds: selectedIds },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  const handleCancel = () => {
    setSelectedIds(data?.supervisorIds ?? []);
    setHasChanges(false);
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">Supervisores</h4>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Supervisores são automaticamente adicionados como observadores em todos 
          os novos tickets desta empresa. Eles podem visualizar e interagir com os tickets.
        </AlertDescription>
      </Alert>

      <BuUserMultiSelect
        value={selectedIds}
        onValueChange={handleChange}
        placeholder="Selecione supervisores..."
        excludeExternal
        disabled={isPending}
      />

      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isPending}
          >
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### Fase 5: Integração na UI

**Arquivo:** `src/modules/tickets/components/settings/PartnerCompaniesTab.tsx`

Adicionar `SupervisorsEditor` no dialog de configurações da empresa (ao lado de `PartnerServicesTab` e `FallbackContactsEditor`):

```typescript
// No Dialog de configurações (após FallbackContactsEditor)
<Separator />

<SupervisorsEditor companyId={servicesCompany.id} />
```

---

### Fase 6: Exports

**Arquivo:** `src/modules/tickets/hooks/index.ts`

Adicionar:

```typescript
// Supervisors
export {
  usePartnerSupervisors,
  useUpdatePartnerSupervisors,
} from './usePartnerSupervisors';
```

---

### Fase 7: Documentação

**Arquivo:** `docs/canonical/SCHEMA_QUICK_REFERENCE.md`

Atualizar seção `partner_company_bu_associations`:

```markdown
### partner_company_bu_associations
`id, partner_company_id, bu_id, is_active, notes, created_at, created_by, updated_at, deleted_at, default_contact_ids, supervisor_profile_ids`
```

---

## 5. Resumo de Arquivos

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| Migration SQL | **Criar** | Coluna + trigger |
| `src/lib/queryKeys/tickets.ts` | Modificar | Query key |
| `src/modules/tickets/hooks/usePartnerSupervisors.ts` | **Criar** | Hook de dados |
| `src/modules/tickets/components/settings/SupervisorsEditor.tsx` | **Criar** | UI |
| `src/modules/tickets/components/settings/PartnerCompaniesTab.tsx` | Modificar | Integrar editor |
| `src/modules/tickets/hooks/index.ts` | Modificar | Export |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | Modificar | Documentar coluna |

---

## 6. Fluxo de Uso

```text
1. Admin acessa /tickets/settings → Tab "Empresas Parceiras"
2. Clica em "Configurar" (ícone ⚙️) em uma empresa
3. No dialog, seção "Supervisores" permite selecionar usuários internos
4. Salva → atualiza partner_company_bu_associations.supervisor_profile_ids

5. Quando ticket externo é criado para essa empresa:
   → Trigger dispara
   → Supervisores são inseridos como watchers em ticket_participants
   → can_view_ticket() já funciona (verifica participantes)
   → Supervisores podem ver e interagir com o ticket
```

---

## 7. Comportamentos Importantes

| Cenário | Comportamento |
|---------|---------------|
| **Novo ticket externo** | Supervisores adicionados automaticamente como watchers |
| **Ticket interno** | Trigger ignora (type != 'external') |
| **Ticket sem partner_company** | Trigger ignora |
| **Supervisor já é creator/owner** | Não duplica (verificação EXISTS) |
| **Remover supervisor da lista** | Novos tickets não incluem mais |
| **Tickets existentes** | Mantêm watchers atuais (sem retroativo) |

---

## 8. Padrões Respeitados

| Padrão | Status | Implementação |
|--------|--------|---------------|
| Identity Convention | ✅ | Usa `profile_id` (profiles.id) |
| BU-Scoped Data | ✅ | Associação por BU |
| Query Keys centralizadas | ✅ | `src/lib/queryKeys` |
| Trigger naming | ✅ | Prefixo `trg_` |
| Soft delete | ✅ | Respeita `deleted_at` |
| Componentes canônicos | ✅ | Usa `BuUserMultiSelect` |
| Hooks barrel | ✅ | Export via `index.ts` |

---

## 9. Ordem de Execução

1. **Migration** — Criar coluna e trigger
2. **Query Key** — Adicionar em `tickets.ts`
3. **Hook** — Criar `usePartnerSupervisors.ts`
4. **UI** — Criar `SupervisorsEditor.tsx`
5. **Integração** — Modificar `PartnerCompaniesTab.tsx`
6. **Exports** — Atualizar `hooks/index.ts`
7. **Docs** — Atualizar `SCHEMA_QUICK_REFERENCE.md`

---

## 10. Validação Pós-Implementação

| Cenário | Esperado |
|---------|----------|
| Adicionar supervisor a empresa | ✅ Persiste em `supervisor_profile_ids` |
| Criar ticket externo para empresa com supervisores | ✅ Supervisores adicionados como watchers |
| Supervisor acessa lista de tickets | ✅ Vê tickets onde é watcher |
| Supervisor acessa detalhe do ticket | ✅ Pode ver e enviar mensagens |
| Criar ticket interno | ✅ Trigger ignora |
| Criar ticket externo sem empresa | ✅ Trigger ignora |
| Remover supervisor da empresa | ✅ Novos tickets não incluem mais |
