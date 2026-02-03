
# Plano: UI de Vinculação KPI ↔ KR no Form de Edição

## Contexto

O formulário de edição de Key Results (`TeamKrFormDialog` e `OrgKrFormDialog`) atualmente não possui interface para associar KPIs. A infraestrutura de backend está **100% pronta**:

- Tabela: `okr_kr_metrics` (kr_id, kr_type, kpi_id, role: 'primary'|'guardrail')
- Hooks CRUD: `useOkrKrMetrics`, `useCreateKrMetric`, `useDeleteKrMetric`
- Tipos: `OkrKrMetric`, `OkrMetricRole`

**Objetivo:** Criar a UI faltante para vincular KPIs existentes a KRs diretamente no form de edição.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────┐
│                TeamKrFormDialog.tsx                     │
├─────────────────────────────────────────────────────────┤
│ [Campos existentes: Título, Baseline, Meta, Direção...] │
├─────────────────────────────────────────────────────────┤
│  ┌─── Nova Seção: "Métricas Vinculadas" ────────────┐  │
│  │                                                   │  │
│  │  KPI Primário: [KpiSelect ▼] ou (nenhum)         │  │
│  │  ℹ️ O KPI primário alimenta o progresso do KR    │  │
│  │                                                   │  │
│  │  Guardrails: [+ Adicionar guardrail]             │  │
│  │  • KPI "Tempo Médio de Resposta" [✕]             │  │
│  │  • KPI "Taxa de Erro" [✕]                        │  │
│  │  ℹ️ Guardrails monitoram limites operacionais    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                [Cancelar] [Salvar]                      │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. KpiSelect (Canônico)
**Arquivo:** `src/components/selects/KpiSelect.tsx`

Componente de seleção de KPI seguindo o padrão de `BuUserSelect`:
- Busca KPIs ativos da BU via `kpi_metrics`
- Suporta filtro por `team_id` e `area_id` (opcional)
- Exibe: nome, unidade, e badge de RAG status
- Props: `value`, `onValueChange`, `excludeIds`, `disabled`

```tsx
// Interface simplificada
interface KpiSelectProps {
  value?: string;
  onValueChange: (id: string | null) => void;
  placeholder?: string;
  teamId?: string;       // Filtra por time
  excludeIds?: string[]; // KPIs já vinculados
  disabled?: boolean;
  allowNone?: boolean;
}
```

### 2. KrMetricsSection
**Arquivo:** `src/modules/okrs/components/KrMetricsSection.tsx`

Seção reutilizável para vincular métricas a KRs:
- Usa hooks existentes: `useOkrKrMetrics`, `useCreateKrMetric`, `useDeleteKrMetric`
- Exibe KPI primário (máximo 1) e guardrails (múltiplos)
- Botões para adicionar/remover vínculos
- Apenas disponível no modo **edição** (kr já existe)

```tsx
interface KrMetricsSectionProps {
  krId: string;
  krType: 'org' | 'team';
  teamId?: string;  // Para filtrar KPIs
  disabled?: boolean;
}
```

---

## Alterações em Arquivos Existentes

### 1. TeamKrFormDialog.tsx
- Importar `KrMetricsSection`
- Adicionar seção após campos existentes (apenas quando `isEditing`)
- Separador visual antes da seção

### 2. OrgKrFormDialog.tsx
- Mesmo padrão do `TeamKrFormDialog`
- `krType = 'org'`

### 3. src/components/selects/index.ts
- Exportar `KpiSelect`

### 4. src/modules/okrs/hooks/index.ts
- Exportar hooks de métricas faltantes: `usePrimaryKrMetric`, `useGuardrailKrMetrics`, `useCreateKrMetric`, `useDeleteKrMetric`

---

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| 1 KPI primário máx | Constraint no banco: só 1 primary por KR |
| Guardrails ilimitados | Múltiplos KPIs como guardrail |
| Sem duplicatas | Um KPI não pode ser primary E guardrail do mesmo KR |
| Filtro por contexto | KpiSelect mostra apenas KPIs da BU atual |
| Apenas em edição | Seção só aparece quando KR já existe (precisa de ID) |

---

## Fluxo de Uso

1. Usuário abre edição de KR existente
2. Seção "Métricas Vinculadas" aparece abaixo dos campos principais
3. Para vincular KPI primário:
   - Clica no select "KPI Primário"
   - Seleciona um KPI da lista (filtrada por time se aplicável)
   - Sistema chama `useCreateKrMetric` com role='primary'
4. Para adicionar guardrail:
   - Clica em "+ Adicionar guardrail"
   - Seleciona KPI
   - Sistema chama `useCreateKrMetric` com role='guardrail'
5. Para remover vínculo:
   - Clica no ✕ ao lado do KPI
   - Sistema chama `useDeleteKrMetric` (soft delete)

---

## Seção Técnica

### Query para KpiSelect
```sql
SELECT id, name, unit, target_value, direction, lifecycle_status
FROM kpi_metrics
WHERE lifecycle_status = 'active'
  AND deleted_at IS NULL
ORDER BY name
LIMIT 100
```

### Padrão de Invalidação (já implementado nos hooks)
```typescript
// useCreateKrMetric.onSuccess
queryClient.invalidateQueries({ 
  queryKey: queryKeys.okrs.krMetrics(kr_id, kr_type) 
});
```

### Campos Explícitos (padrão do projeto)
```typescript
const KPI_SELECT_FIELDS = `id, name, unit, target_value, direction`;
```

---

## Arquivos a Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/selects/KpiSelect.tsx` | Componente | Select canônico de KPI |
| `src/modules/okrs/components/KrMetricsSection.tsx` | Componente | Seção de métricas no form |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/selects/index.ts` | Exportar KpiSelect |
| `src/modules/okrs/components/TeamKrFormDialog.tsx` | Adicionar KrMetricsSection |
| `src/modules/okrs/components/OrgKrFormDialog.tsx` | Adicionar KrMetricsSection |
| `src/modules/okrs/hooks/index.ts` | Exportar hooks de métricas faltantes |

---

## Estimativa

- **Componentes novos:** 2
- **Arquivos modificados:** 4
- **Complexidade:** Média (infraestrutura pronta, apenas UI)
- **Risco:** Baixo (hooks e tabela já testados)

---

## Checklist de Validação

- [x] KpiSelect segue padrão de BuUserSelect
- [x] Sem `select('*')` nas queries
- [x] staleTime configurado (3-5 min)
- [x] Toasts de sucesso/erro em português
- [x] Loading states com `isLoading` prop do Button
- [x] Cores semânticas (tokens, não hardcoded)
- [x] Exportações no barrel index.ts

## Status: ✅ CONCLUÍDO (2026-02-03)
