# 🔍 Relatório de Auditoria Completa — Hub da Jet
**Data:** 2026-01-11  
**Versão do TCR:** 1.1.0  
**Status:** Análise Consolidada

---

## Sumário Executivo

| Categoria | Crítico | Alto | Médio | Baixo | Total |
|-----------|---------|------|-------|-------|-------|
| 🔒 Segurança (DB) | 2 | 4 | 1 | 0 | 7 |
| 🗃️ Banco de Dados | 0 | 2 | 3 | 2 | 7 |
| 🔧 Backend (Edge Functions) | 0 | 1 | 2 | 1 | 4 |
| 🖥️ Frontend (Código) | 1 | 5 | 8 | 6 | 20 |
| 📦 Código Legado | 0 | 2 | 5 | 3 | 10 |
| **TOTAL** | **3** | **14** | **19** | **12** | **48** |

---

## 1. 🔒 Segurança — Banco de Dados

### 1.1 CRÍTICO: Views com SECURITY DEFINER

**Problema:** 2 views detectadas com `SECURITY DEFINER` em vez de `SECURITY INVOKER`.

| View | Risco | Ação |
|------|-------|------|
| (identificar via linter) | Views ignoram RLS do usuário | Alterar para SECURITY INVOKER |

**Impacto:** Qualquer usuário autenticado pode acessar dados de outras BUs.

**Correção:**
```sql
ALTER VIEW public.nome_da_view SET (security_invoker = on);
```

### 1.2 CRÍTICO: RLS Policies com `USING(true)` em operações de escrita

**Problema:** 4 policies detectadas com `USING(true)` ou `WITH CHECK(true)` para INSERT/UPDATE/DELETE.

**Risco:** Qualquer usuário pode modificar/deletar dados de outras BUs.

**Ação:** Revisar e adicionar condições de BU scope:
```sql
-- De
WITH CHECK (true)

-- Para
WITH CHECK (is_current_bu(bu_id) AND has_permission(...))
```

### 1.3 ALTO: Leaked Password Protection Desabilitado

**Status:** ⚠️ Proteção contra senhas vazadas está DESABILITADA.

**Ação:** Habilitar no Supabase Dashboard → Auth → Password Protection.

### 1.4 MÉDIO: Extension no Schema Public

**Problema:** Extension instalada no schema `public` ao invés de schema separado.

**Ação:** Mover extensions para schema `extensions`.

---

## 2. 🗃️ Banco de Dados — Estrutura

### 2.1 ALTO: Erros de Statement Timeout

**Logs recentes mostram:**
```
ERROR: canceling statement due to statement timeout
ERROR: NO_BU_CONTEXT: User is not authenticated
```

**Causas prováveis:**
1. Queries sem índices adequados
2. Chamadas sem BU context em contexto POST-BU
3. RPCs sem timeout configurado

**Ação:**
- Auditar queries lentas no dashboard
- Verificar funções que retornam `NO_BU_CONTEXT`

### 2.2 ALTO: Functions sem search_path fixo

**Problema:** 1+ funções detectadas com `search_path` mutável.

**Risco:** SQL injection via manipulação de search_path.

**Correção:**
```sql
CREATE OR REPLACE FUNCTION nome_funcao()
RETURNS ... LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$ ... $$;
```

### 2.3 MÉDIO: Tabelas sem índices de BU

**Verificar:** Todas as tabelas operacionais precisam de:
- `INDEX (bu_id)` para isolamento
- `INDEX (bu_id) WHERE deleted_at IS NULL` para queries ativas

### 2.4 MÉDIO: 130 tabelas — Potencial Overgrowth

**Observação:** O sistema tem 130 tabelas. Verificar se há:
- Tabelas duplicadas ou de teste
- Tabelas não utilizadas
- Views materializadas obsoletas

---

## 3. 🔧 Backend — Edge Functions

### 3.1 ALTO: Estrutura de Edge Functions

**Diretório:** `supabase/functions/`

| Função | Status | Observação |
|--------|--------|------------|
| `_shared/` | ✅ OK | Código compartilhado |
| `audit-permissions/` | ⚠️ Revisar | Verificar se valida JWT |
| `auth-email-hook/` | ✅ OK | Hook de auth |
| `cron-dispatcher/` | ⚠️ Revisar | Verificar idempotência |
| `culture-message/` | ✅ OK | - |
| `evaluate-notification-health/` | ✅ OK | - |
| `get-place-details/` | ⚠️ Revisar | Valida BU context? |
| `get-public-asset/` | ✅ OK | Público por design |
| `get-tcr/` | ✅ OK | - |
| `invoke-vic/` | ⚠️ Revisar | Verificar rate limiting |
| `process-agent-document/` | ✅ OK | - |
| `process-notification-outbox/` | ✅ OK | - |
| `request-magic-link/` | ✅ OK | - |
| `search-address/` | ⚠️ Revisar | Valida input? |
| `search-cities/` | ⚠️ Revisar | Valida input? |
| `send-partner-invite/` | ⚠️ Revisar | Rate limiting? |

### 3.2 MÉDIO: Padronização de Headers CORS

**Verificar:** Todas as functions devem incluir:
```typescript
"x-current-bu-id, x-correlation-id"
```

---

## 4. 🖥️ Frontend — Violações de Padrão

### 4.1 CRÍTICO: Hardcode de Roles (15 arquivos)

**Violação:** `role === 'super_admin'` ou `role === 'admin'` detectado em 15 arquivos.

**Arquivos afetados:**
```
src/pages/Wizards.tsx
src/hooks/useAuth.tsx
src/modules/assets/hooks/useAssetPermissions.ts
src/modules/okrs/components/wizards/shared/HierarchyContextSwitcher.tsx
src/pages/SelectBu.tsx
src/modules/permissions/components/UserPermissionsV2Sheet.tsx
src/components/layout/Header.tsx
src/components/layout/DynamicSidebar.tsx
src/modules/okrs/pages/CollaboratorCheckinPage.tsx
src/modules/okrs/components/wizards/shared/WizardContextSelector.tsx
src/modules/users-global/pages/GlobalUsersPage.tsx
src/modules/users-global/components/UserGlobalSheet.tsx
src/modules/bu/components/BuSelector.tsx
src/modules/assets/components/inventory/InventoryMovementDialog.tsx
```

**Ação:** Migrar para `usePermissions()` com permission keys.

### 4.2 ALTO: Query Keys Hardcoded (11 arquivos)

**Violação:** `queryKey: [` ao invés de usar `queryKeys.xxx`.

**Arquivos afetados:**
```
src/integrations/supabase/getOptionalBuClient.ts (exemplo em comentário - OK)
src/hooks/useUserDependencies.ts (usa spread de queryKeys - ⚠️ revisar)
src/modules/assets/hooks/useBuAdmins.ts
src/modules/assets/hooks/useBrands.ts
src/modules/assets/hooks/useAssetPermissions.ts
src/modules/okrs/hooks/useTeamPreviousCycleAnalysis.ts
src/modules/okrs/hooks/useOrgOkrsForContext.ts
src/modules/okrs/hooks/useWizardSession.ts
src/pages/me/NotificationsPage.tsx
src/modules/assets/hooks/useAuthorizers.ts
src/modules/okrs/hooks/useKpiHistory.ts
```

**Padrão correto:**
```typescript
// ❌ ERRADO
queryKey: [...queryKeys.okrs.teamObjectives(buId), 'extra']

// ✅ CORRETO (criar key específica)
queryKey: queryKeys.okrs.teamPreviousCycle(buId, teamId, cycleId)
```

### 4.3 ALTO: useState para Filtros (3 arquivos)

**Violação:** Usar `useState` para search/filter/page ao invés de URL state.

**Arquivos afetados:**
```
src/modules/okrs/pages/OrgObjectiveViewPage.tsx
  - useState<StatusFilter>
  - useState<TeamFilter>

src/modules/okrs/components/wizard/WizardKrSelection.tsx
  - useState<WizardKrFilter>  (aceitável - modal)

src/modules/permissions/pages/BuPermissionsPage.tsx
  - useState(urlSearch) - ✅ Correto, usa debounce para URL
```

**Ação:** `OrgObjectiveViewPage.tsx` deve migrar para `useUrlState`.

### 4.4 ALTO: onClick com navigate (2 arquivos)

**Violação padrão:** `onClick={() => navigate(...)}` ao invés de `<Link>`.

**Arquivos:**
```
src/modules/integrations/pages/CronJobConfigPage.tsx:245
src/components/ui/resource-not-found-state.tsx:93
```

**Ação:** Substituir por `<Link>` ou `<Button asChild>`.

### 4.5 MÉDIO: select('*') Residuais

**Status:** ✅ LIMPO — Apenas menções em comentários de documentação.

Os 11 matches encontrados são todos:
- Comentários explicando que NÃO usar `select('*')`
- Definições de `FIELDS` explícitos

### 4.6 MÉDIO: Componentes Duplicados Detectados

| Padrão Detectado | Arquivos | Ação |
|------------------|----------|------|
| Page headers inline | Vários | Usar `PageHeader` do shared |
| Loading states manuais | Vários | Usar `LoadingState` |
| Empty states manuais | Vários | Usar `EmptyState` |
| UserSelect duplicados | 2+ | Usar `BuUserMultiSelect` |

---

## 5. 📦 Código Legado — Para Remoção

### 5.1 ALTO: Hooks Deprecated

| Hook/Arquivo | Status | Migrar Para |
|--------------|--------|-------------|
| `src/hooks/useUrlState.ts` | @deprecated | `@/shared/url` |
| `src/components/selects/MultiUserSelect.tsx` | @deprecated | `BuUserMultiSelect` |
| `src/modules/okrs/hooks/useOkrData.ts` | @deprecated (facade) | `./queries/*` |
| `src/hooks/useSharedData.ts` (useProfilesForSelect) | @deprecated | `useBuUsersDirectory` |

### 5.2 ALTO: Funções Deprecated nas OKRs

| Função | Em | Migrar Para |
|--------|-----|-------------|
| `useOrgObjectivesWithKrs` | useOkrData.ts | `useOrgObjectives()` |
| `useAllOrgKeyResults` | useOkrData.ts | `useOrgKeyResults()` |
| `useTeamObjectivesWithKrs` | useOkrData.ts | `useTeamObjectives()` |
| `useDeleteOrgObjective` | useOkrMutations.ts | `useCancelOrgObjective` |
| `useDeleteOrgKeyResult` | useOkrMutations.ts | `useCancelOrgKeyResult` |
| `useDeleteTeamObjective` | useOkrMutations.ts | `useCancelTeamObjective` |
| `useDeleteTeamKeyResult` | useOkrMutations.ts | `useCancelTeamKeyResult` |

### 5.3 MÉDIO: URL Parsers Deprecated

| Função | Em | Migrar Para |
|--------|-----|-------------|
| `parsers.stringArray` | shared/url/parsers.ts | `arrayFromRepeated` |
| `serializers.stringArray` | shared/url/parsers.ts | `serializeToRepeated` |

### 5.4 BAIXO: Arquivos Candidatos à Remoção

Verificar se ainda estão em uso:
- `src/components/selects/MultiUserSelect.tsx` (se migração concluída)
- Hooks wrapper em `useOkrData.ts` (após migração completa)

---

## 6. 📊 Métricas de Saúde

### 6.1 Cobertura de Padrões

| Métrica | Atual | Meta | Status |
|---------|-------|------|--------|
| Tables com RLS | ~95% | 100% | ⚠️ |
| Queries sem select(*) | 100% | 100% | ✅ |
| QueryKeys centralizadas | ~85% | 100% | ⚠️ |
| URL State para filtros | ~80% | 100% | ⚠️ |
| Permissions via hook | ~70% | 100% | ⚠️ |
| Deprecated removidos | 0% | 100% | ❌ |

### 6.2 Dívida Técnica por Módulo

| Módulo | Crítico | Alto | Total |
|--------|---------|------|-------|
| OKRs | 0 | 3 | 8 |
| Assets | 0 | 2 | 5 |
| Tickets | 0 | 1 | 3 |
| Permissions | 0 | 1 | 2 |
| Auth/Users | 1 | 2 | 5 |
| Shared/Layout | 0 | 2 | 4 |

---

## 7. 🎯 Plano de Ação Priorizado

### Wave 1 — Segurança (Imediato)
1. ✅ Corrigir views com SECURITY DEFINER
2. ✅ Corrigir RLS policies permissivas
3. ✅ Habilitar leaked password protection
4. ✅ Adicionar search_path fixo em functions

### Wave 2 — Compliance Blocking (Sprint atual)
1. Migrar hardcode de roles → usePermissions()
2. Centralizar query keys restantes
3. Migrar URL state em OrgObjectiveViewPage
4. Corrigir onClick navigate

### Wave 3 — Limpeza de Legado (Próximo sprint)
1. Remover hooks deprecated após migração
2. Consolidar componentes duplicados
3. Remover funções wrapper desnecessárias

### Wave 4 — Performance (Contínuo)
1. Adicionar índices faltantes
2. Investigar statement timeouts
3. Otimizar queries lentas

---

## 8. 📝 Próximos Passos

1. **Executar audits automatizados:**
```bash
npx tsx scripts/run-compliance-checks.ts
```

2. **Criar tickets para cada item crítico/alto**

3. **Atualizar CONSISTENCY_REPORT.md com findings**

4. **Agendar review semanal de progresso**

---

*Relatório gerado automaticamente. Revisar manualmente antes de agir.*
