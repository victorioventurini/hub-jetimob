# Module Health Audit Report

**Data:** 2026-01-11  
**Versão TCR:** 2.11.0  
**Objetivo:** Identificar módulos problemáticos para consolidação

---

## Resumo Executivo

| Módulo | Complexidade | Performance | Manutenibilidade | Prioridade |
|--------|-------------|-------------|------------------|------------|
| **OKRs** | 🔴 ALTA | 🟡 MÉDIA | 🔴 RUIM | **P0** |
| **Assets** | 🟡 MÉDIA | 🟢 BOA | 🟢 BOA | P2 |
| **KPIs** | 🟡 MÉDIA | 🟡 MÉDIA | 🟡 MÉDIA | **P1** |
| **Tickets** | 🟢 BAIXA | 🟢 BOA | 🟢 BOA | P3 |
| **Integrations** | 🟢 BAIXA | 🟢 BOA | 🟢 BOA | P3 |

---

## 1. Módulo OKRs — 🔴 CRÍTICO

### Métricas de Complexidade

| Métrica | Valor | Limite TCR | Status |
|---------|-------|-----------|--------|
| Componentes | 42+ | 20 | 🔴 EXCEDE |
| Hooks | 29 | 10 | 🔴 EXCEDE |
| Páginas | 14 | 8 | 🔴 EXCEDE |
| Subpastas components/ | 10 | 5 | 🔴 EXCEDE |
| Wizards distintos | 7 | 3 | 🔴 EXCEDE |

### Problemas Identificados

#### 1.1 Fragmentação de Wizards
```
src/modules/okrs/components/wizard/       # Wizard antigo
src/modules/okrs/components/wizards/      # Wizards novos (7 variantes)
  ├── clevel-checkin/
  ├── collaborator/
  ├── leader-prep/
  ├── managers-checkin/
  ├── shared/
  ├── team-checkin/
  └── team-okr-creation/
```
**Problema:** Código duplicado entre wizards. Cada wizard tem ~500 linhas.

#### 1.2 Hooks Desorganizados
- `useOkrData.ts` - Monolítico com 10+ funções
- `useSharedOkrData.ts` - Duplica lógica do anterior
- `useTeamContributedOkrs.ts` - Poderia ser parte de useOkrData
- `useOrgObjectiveView.ts` - Hook de página, deveria estar junto da página
- 3 hooks de wizard (`useWizardDraft`, `useWizardSession`, `useGenericWizardDraft`)

#### 1.3 Páginas com Lógica Duplicada
- `CollaboratorCheckinPage.tsx` - 200+ linhas
- `ManagersCheckinPage.tsx` - 200+ linhas (mesma estrutura)
- `CLevelCheckinPage.tsx` - Similar aos anteriores
- `TeamCheckinPage.tsx` - Similar aos anteriores

#### 1.4 Performance
- ✅ Usa campos explícitos (não usa select('*'))
- ✅ Usa staleTime em queries
- ❌ **Não usa paginação** em listas de KRs e Objectives
- ❌ Dashboard faz 5+ queries paralelas sem RPC agregadora

### Ações Recomendadas (OKRs)

| Ação | Esforço | Impacto | Prioridade |
|------|---------|---------|------------|
| Criar `WizardShellBase` unificado | Alto | Alto | P0 |
| Consolidar hooks de OKR em 3 arquivos | Alto | Alto | P0 |
| Criar RPC `rpc_okr_dashboard_data` | Médio | Alto | P0 |
| Mover hooks de página para junto das páginas | Baixo | Médio | P1 |
| Adicionar paginação em listas | Médio | Médio | P1 |

---

## 2. Módulo KPIs — 🟡 ATENÇÃO

### Métricas de Complexidade

| Métrica | Valor | Limite TCR | Status |
|---------|-------|-----------|--------|
| Componentes | 8 | 20 | 🟢 OK |
| Hooks | 2 | 10 | 🟢 OK |
| Páginas | 1 | 8 | 🟢 OK |

### Problemas Identificados

#### 2.1 Mock Data em Produção
```typescript
// src/modules/kpis/hooks/useMockKpiData.ts
export function useMockKpiData() {
  // Retorna dados mockados - NÃO está conectado ao banco
}
```
**Problema:** `KpiDashboardPage` usa `useMockKpiData()` ao invés de `useKpiData()`.

#### 2.2 Queries sem staleTime
```typescript
// useKpiData.ts - linha 61
const { data: kpis } = useQuery({
  queryKey: queryKeys.kpis.list(...),
  // ❌ Sem staleTime definido
});
```

#### 2.3 Estrutura de Tipos Duplicada
- `DbKpiMetric` em useKpiData.ts
- `KpiWithValues` em types.ts
- Mapeamento manual entre os dois

### Ações Recomendadas (KPIs)

| Ação | Esforço | Impacto | Prioridade |
|------|---------|---------|------------|
| Remover `useMockKpiData` e conectar ao banco | Baixo | Alto | P0 |
| Adicionar staleTime em queries | Baixo | Médio | P1 |
| Unificar tipos (remover duplicação) | Médio | Médio | P1 |

---

## 3. Módulo Assets — 🟢 BOM

### Métricas de Complexidade

| Métrica | Valor | Limite TCR | Status |
|---------|-------|-----------|--------|
| Componentes | 6 subpastas | 20 | 🟢 OK |
| Hooks | 13 | 10 | 🟡 LIMITE |
| Páginas | 7 | 8 | 🟢 OK |

### Pontos Positivos
- ✅ Hooks bem separados (`useInventoryQueries` + `useInventoryMutations`)
- ✅ Paginação implementada com `range()`
- ✅ Usa campos explícitos
- ✅ Usa staleTime

### Problemas Menores
- `useInventory.ts` é wrapper desnecessário (backward compat)
- 13 hooks pode ser consolidado em 8-10

### Ações Recomendadas (Assets)

| Ação | Esforço | Impacto | Prioridade |
|------|---------|---------|------------|
| Deprecar `useInventory.ts` wrapper | Baixo | Baixo | P2 |
| Consolidar hooks menores | Médio | Baixo | P3 |

---

## 4. Módulo Tickets — 🟢 BOM

### Métricas de Complexidade

| Métrica | Valor | Limite TCR | Status |
|---------|-------|-----------|--------|
| Componentes | 6 | 20 | 🟢 OK |
| Hooks | 8 | 10 | 🟢 OK |
| Páginas | ~5 | 8 | 🟢 OK |

### Pontos Positivos
- ✅ Paginação implementada com `range()` e `count: 'exact'`
- ✅ Usa campos explícitos
- ✅ Estrutura limpa

### Sem Ações Necessárias

---

## 5. Módulo Integrations — 🟢 BOM

### Métricas de Complexidade

| Métrica | Valor | Limite TCR | Status |
|---------|-------|-----------|--------|
| Componentes | 5 | 20 | 🟢 OK |
| Hooks | 3 | 10 | 🟢 OK |

### Sem Ações Necessárias

---

## Métricas Globais

### Cobertura de Padrões

| Padrão | Cobertura | Meta |
|--------|-----------|------|
| QueryKeys centralizados | ~95% | 100% |
| Campos explícitos (no select('*')) | ~99% | 100% |
| staleTime em queries | ~70% | 100% |
| Paginação em listas grandes | ~40% | 100% |
| RPCs agregadoras para dashboards | ~20% | 100% |

### Arquivos que Precisam de staleTime

```
src/modules/bu/hooks/useBuData.ts
src/modules/tickets/hooks/useTicketCategories.ts
src/modules/tickets/hooks/useTicketMessages.ts
src/modules/assets/hooks/useProfiles.ts
src/modules/assets/hooks/useLocations.ts
src/modules/assets/hooks/useAuthorizers.ts
src/modules/kpis/hooks/useKpiData.ts
```

### Listas sem Paginação (Alto Volume)

| Tabela | Hook | Impacto |
|--------|------|---------|
| `okr_team_objectives` | useOkrData | 🔴 Alto |
| `okr_team_key_results` | useOkrData | 🔴 Alto |
| `okr_org_objectives` | useOkrData | 🟡 Médio |
| `kpi_values` | useKpiData | 🟡 Médio |

---

## Plano de Consolidação

### Wave 1 — Performance & Segurança (Imediato)

- [ ] Criar RPC `rpc_okr_dashboard_data` para consolidar queries do dashboard
- [ ] Adicionar staleTime em 7 hooks identificados
- [ ] Remover `useMockKpiData` e conectar KPIs ao banco

### Wave 2 — Refatoração OKRs (1-2 semanas)

- [ ] Criar `WizardShellBase` com lógica compartilhada
- [ ] Consolidar 7 wizards para usar shell base
- [ ] Mover hooks de view para junto das páginas
- [ ] Consolidar `useOkrData`, `useSharedOkrData`, `useTeamContributedOkrs`

### Wave 3 — Paginação (1 semana)

- [ ] Adicionar paginação em listas de OKRs
- [ ] Adicionar paginação em KPI values

### Wave 4 — Cleanup (Contínuo)

- [ ] Deprecar `useInventory.ts` wrapper
- [ ] Remover código duplicado entre páginas de check-in
- [ ] Unificar tipos de KPI

---

## Conclusão

**Foco Principal: Módulo OKRs**

O módulo de OKRs representa ~60% da complexidade do projeto e precisa de refatoração urgente:
1. Muitos wizards duplicados
2. Hooks fragmentados
3. Dashboard sem RPC agregadora
4. Ausência de paginação

Os demais módulos estão em bom estado e requerem apenas ajustes menores.

---

*Documento gerado em 2026-01-11*
