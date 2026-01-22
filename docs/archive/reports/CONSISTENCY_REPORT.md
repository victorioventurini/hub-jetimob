# Consistency Report — Hub da Jet

**Versão:** 1.0.0  
**Última atualização:** 2026-01-09  
**Status:** Living Document  
**Gerado por:** Compliance Baseline

---

## Visão Geral

Este documento registra o estado atual de consistência do codebase, incluindo duplicações conhecidas e o plano de redução.

---

## Baseline Atual

**Data do scan:** 2026-01-09  
**Total de findings:** Pendente execução inicial

### Resumo por Categoria

| Categoria | Errors | Warnings | Status |
|-----------|--------|----------|--------|
| Shared Components | TBD | TBD | 🔍 Aguardando scan |
| Shared Utilities | TBD | TBD | 🔍 Aguardando scan |

---

## Top Duplicações Conhecidas

### 1. Headers de Página Inline

**Padrão detectado:** `<div className="flex justify-between"><h1>...</h1></div>`

**Componente canônico:** `<PageHeader>`

**Arquivos afetados:** (executar `npx tsx scripts/audit-shared-components.ts`)

**Prioridade:** Média  
**Impacto:** Visual inconsistency, maintenance burden

---

### 2. Loading States Inline

**Padrão detectado:** `<Loader2 className="animate-spin" />` sem usar LoadingState

**Componente canônico:** `<LoadingState>`, `<LoadingSpinner>`

**Arquivos afetados:** (executar audit)

**Prioridade:** Baixa  
**Impacto:** Minor visual inconsistency

---

### 3. Query Keys Hardcoded

**Padrão detectado:** `queryKey: ["tickets", buId]`

**Utilitário canônico:** `queryKeys.tickets.list(buId)`

**Arquivos afetados:** (executar `npx tsx scripts/audit-shared-utils.ts`)

**Prioridade:** Alta  
**Impacto:** Cache collisions, refactoring difficulty

---

### 4. useState para Filtros

**Padrão detectado:** `const [status, setStatus] = useState("all")`

**Utilitário canônico:** `useUrlState("status", "all")`

**Arquivos afetados:** (executar audit)

**Prioridade:** Média  
**Impacto:** Non-shareable URLs, lost state on refresh

---

### 5. Select de Usuário Customizado

**Padrão detectado:** Query manual em `profiles` + Select customizado

**Componente canônico:** `<BuUserSelect>`, `<BuUserMultiSelect>`

**Arquivos afetados:** (executar audit)

**Prioridade:** Alta  
**Impacto:** Missing users without first login (User Directory violation)

---

## Plano de Redução

### Wave 1: Alta Prioridade (Sprint Atual)

**Objetivo:** Eliminar violações de segurança e consistência de dados

| Item | Ação | Responsável | Status |
|------|------|-------------|--------|
| Query Keys Hardcoded | Migrar para queryKeys.ts | TBD | ⏳ Pendente |
| Select de Usuário Customizado | Substituir por BuUserSelect | TBD | ⏳ Pendente |
| Supabase Global em Módulos | Migrar para useBuScopedSupabase | TBD | ⏳ Pendente |

---

### Wave 2: Média Prioridade (Próximo Sprint)

**Objetivo:** Melhorar UX e manutenibilidade

| Item | Ação | Responsável | Status |
|------|------|-------------|--------|
| useState para Filtros | Migrar para useUrlState | TBD | ⏳ Pendente |
| Headers de Página Inline | Substituir por PageHeader | TBD | ⏳ Pendente |
| Empty States Inline | Substituir por EmptyState | TBD | ⏳ Pendente |

---

### Wave 3: Baixa Prioridade (Backlog)

**Objetivo:** Polish e consistência visual

| Item | Ação | Responsável | Status |
|------|------|-------------|--------|
| Loading States Inline | Substituir por LoadingState | TBD | ⏳ Pendente |
| Error States Inline | Substituir por ErrorState | TBD | ⏳ Pendente |
| Phone Formatting Manual | Substituir por lib/phone | TBD | ⏳ Pendente |

---

## Métricas de Progresso

### Gráfico de Evolução

```
Wave 1 (Alta):    ████████░░░░░░░░░░░░  40% (projeção)
Wave 2 (Média):   ░░░░░░░░░░░░░░░░░░░░   0%
Wave 3 (Baixa):   ░░░░░░░░░░░░░░░░░░░░   0%
```

### Histórico de Findings

| Data | Errors | Warnings | Delta |
|------|--------|----------|-------|
| 2026-01-09 | TBD | TBD | Baseline |

---

## Como Atualizar Este Report

1. Execute os audits:
   ```bash
   npx tsx scripts/audit-shared-components.ts
   npx tsx scripts/audit-shared-utils.ts
   ```

2. Atualize as seções "Top Duplicações" com arquivos específicos

3. Mova itens resolvidos para status ✅

4. Atualize o "Histórico de Findings" com novos valores

---

## Regras de Governance

1. **Novos PRs não podem aumentar o count de errors**
2. **Warnings podem aumentar temporariamente, mas devem ter ticket de correção**
3. **Cada wave deve reduzir o total de findings em pelo menos 30%**
4. **Report deve ser atualizado a cada sprint**

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [SHARED_COMPONENTS_REGISTRY.md](./SHARED_COMPONENTS_REGISTRY.md) | Componentes e utils canônicos |
| [COMPLIANCE_BASELINE.md](./COMPLIANCE_BASELINE.md) | Audits obrigatórios |
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | Padrões de desenvolvimento |
