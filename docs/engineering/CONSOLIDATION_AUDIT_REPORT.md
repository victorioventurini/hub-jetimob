# Auditoria de Consolidação do Hub

**Data:** 2026-01-11  
**Status:** Diagnóstico Completo  
**Versão TCR:** v2.11.0

---

## Resumo Executivo

### Métricas Gerais do Projeto

| Métrica | Valor |
|---------|-------|
| Módulos Frontend | 14 |
| Hooks com useQuery | 94 arquivos / 1785 ocorrências |
| Query Keys Hardcoded | 61 arquivos / 1060 ocorrências |
| Views SECURITY DEFINER | 9 (pendentes) |
| RLS Policies Permissivas | 28 tabelas com `USING(true)` |
| Linter Errors | 9 |
| Linter Warnings | 7 |

---

## 🔴 Problemas Críticos de Segurança (Backend)

### 1. Views com SECURITY DEFINER (9 pendentes)

A migration anterior pode não ter sido efetiva. Views identificadas que ainda precisam de correção:

```
- v_pending_checkins
- v_bu_all_profiles_admin  
- v_profiles_directory
- v_ai_agents_public
- v_okr_org_objectives_with_krs
- v_okr_team_objectives_with_krs
- v_team_contribution_summary
- v_checkin_summary
- v_org_objective_progress (+ 2 mais)
```

**Risco:** Views com SECURITY DEFINER ignoram RLS do usuário consultante.

**Ação:** Recriar views com `CREATE OR REPLACE VIEW ... WITH (security_invoker = on)`.

---

### 2. RLS Policies com `USING(true)` (28 tabelas)

Políticas identificadas que permitem acesso irrestrito:

| Tabela | Policy | Tipo |
|--------|--------|------|
| automation_action_catalog | select | READ - OK (catálogo público) |
| automation_event_catalog | select | READ - OK (catálogo público) |
| hub_integrations_catalog | select | READ - OK (catálogo público) |
| modules | select | READ - OK (catálogo público) |
| permission_catalog | select | READ - OK (catálogo público) |
| permission_presets | select | READ - OK (catálogo público) |
| notification_templates | select | READ - OK (templates padrão) |
| notification_channels | select | READ - OK |
| notification_events | select | READ - OK |
| **cron_execution_logs** | **insert** | ⚠️ RISCO - qualquer auth pode inserir |
| **notification_template_audit_log** | **insert** | ⚠️ RISCO - qualquer auth pode inserir |
| **notification_template_versions** | **insert** | ⚠️ RISCO - qualquer auth pode inserir |
| **permission_audit_log** | **insert** | ⚠️ RISCO - qualquer auth pode inserir |

**Ação:** Revisar policies de INSERT que usam `WITH CHECK(true)` - devem ter validação de contexto.

---

### 3. Leaked Password Protection Desabilitado

O Supabase Auth não está configurado para detectar senhas vazadas.

**Ação:** Habilitar via Supabase dashboard > Auth > Providers > Password.

---

## 🟡 Problemas de Performance por Módulo

### Ranking de Complexidade (Maior → Menor)

| # | Módulo | Hooks | Componentes | Query Keys Hardcoded | select('*') | Risco |
|---|--------|-------|-------------|---------------------|-------------|-------|
| 1 | **okrs** | 29 | 42+ | 15+ | 0 | 🟢 Otimizado |
| 2 | **assets** | 11 | 20+ | 5+ | 2* | 🟡 Médio |
| 3 | **tickets** | 8 | 15+ | 3+ | 0 | 🟢 Otimizado |
| 4 | **kpis** | 2 | 10+ | 2+ | 1** | 🟡 Médio |
| 5 | **integrations** | 15+ | 10+ | 10+ | 0 | 🟡 Query keys |
| 6 | **automations** | 5 | 8+ | 0 | 0 | 🟢 Otimizado |
| 7 | **permissions** | 10+ | 8+ | 5+ | 0 | 🟢 Otimizado |
| 8 | **teams** | 5+ | 5+ | 3+ | 0 | 🟢 Otimizado |
| 9 | **users-global** | 3+ | 5+ | 2+ | 0 | 🟢 Baixo |
| 10 | **vic** | 5+ | 8+ | 2+ | 0 | 🟢 Baixo |
| 11 | **home** | 3+ | 10+ | 0 | 0 | 🟢 RPC criada |
| 12 | **bu** | 3 | 2 | 3 | 0 | 🟡 Query keys |
| 13 | **settings** | 2+ | 5+ | 2+ | 0 | 🟢 Baixo |
| 14 | **external** | 1 | 2 | 1 | 0 | 🟢 Baixo |

\* `useInventory.getItem` e `getItemByCode` usam `select('*')` em funções imperativas
\** `useKpiData` usa `select('*')` com joins

---

## 🔵 Débito Técnico: Query Keys Hardcoded

### Top 10 Arquivos com Mais Violações

| Arquivo | Ocorrências | Impacto |
|---------|-------------|---------|
| `useIntegrations.ts` | 15+ | Alto - cache inconsistente |
| `useBuData.ts` | 6 | Médio |
| `NotificationCenter.tsx` | 5 | Médio |
| `CronJobConfigPage.tsx` | 4 | Baixo |
| `usePermissionAudit.ts` | 2 | Baixo |
| `AddPermissionDialog.tsx` | 2 | Baixo |
| Outros (55 arquivos) | 1-2 cada | Baixo |

**Namespaces faltantes em `queryKeys.ts`:**
- `integrations.*`
- `cron.*`
- `notifications.*`

---

## 🟣 Módulos que Precisam de Refatoração

### 1. OKRs - Módulo Mais Complexo (Bem Estruturado ✅)

**Estrutura:**
```
okrs/
├── hooks/ (29 arquivos)
│   ├── useOkrData.ts ✅ Campos explícitos, staleTime
│   ├── useSharedOkrData.ts ✅ Campos explícitos
│   ├── useCycleCheckins.ts ✅ RPC utilizada
│   ├── useMockOkrData.ts ⚠️ REMOVER - mock data
│   └── useWizardDraft.ts ⚠️ Query key hardcoded
├── components/ (42+ arquivos)
│   └── wizards/ (complexo mas bem organizado)
└── pages/ (3 arquivos)
```

**Problemas:**
1. `useMockOkrData.ts` ainda existe - deve ser removido
2. 15+ query keys hardcoded

---

### 2. Assets - Segundo Mais Complexo (Necessita Correções)

**Estrutura:**
```
assets/
├── hooks/ (11 arquivos)
│   └── useInventory.ts ⚠️ 558 linhas - muito grande
├── components/
└── pages/
```

**Problemas:**
1. `useInventory.ts` com 558 linhas - precisa ser dividido
2. `getItem()` e `getItemByCode()` usam `select('*')`
3. Funções imperativas misturadas com hooks

**Recomendação:**
- Extrair `useAssetItem.ts` para busca individual
- Extrair `useAssetMovements.ts` para movimentações
- Extrair mutations para `useAssetMutations.ts`

---

### 3. KPIs - Módulo Pequeno mas com Problemas

**Problemas:**
1. `useKpiData.ts` usa `select('*')` na linha 68
2. `useMockKpiData.ts` ainda existe - avaliar remoção
3. Apenas 2 hooks para todo o módulo - subdividir

---

### 4. Integrations - Query Keys Desorganizadas

**Problemas:**
1. 15+ query keys hardcoded em `useIntegrations.ts`
2. Usa cliente global onde deveria usar BU-scoped
3. Mix de admin panel e BU-scoped no mesmo hook

**Recomendação:**
- Criar `queryKeys.integrations.*`
- Separar `useAdminIntegrations.ts` de `useBuIntegrations.ts`

---

## 📊 Plano de Consolidação (Priorizado)

### Wave 1 - Segurança (Crítico)
1. [ ] Recriar 9 views como SECURITY INVOKER (migration)
2. [ ] Revisar 4 policies de INSERT com `WITH CHECK(true)`
3. [ ] Habilitar Leaked Password Protection

### Wave 2 - Performance (Alto)
4. [ ] Corrigir 2 `select('*')` em `useInventory.ts`
5. [ ] Corrigir 1 `select('*')` em `useKpiData.ts`
6. [ ] Dividir `useInventory.ts` (558 linhas → 4 arquivos)

### Wave 3 - Manutenibilidade (Médio)
7. [ ] Adicionar namespace `queryKeys.integrations.*`
8. [ ] Migrar 61 arquivos para queryKeys centralizadas
9. [ ] Remover `useMockOkrData.ts` e `useMockKpiData.ts`

### Wave 4 - Cleanup (Baixo)
10. [ ] Refatorar `useIntegrations.ts` (separar admin/bu)
11. [ ] Documentar exceptions em RLS permissivas
12. [ ] Atualizar documentação TCR

---

## Arquivos para Ação Imediata

### Críticos (Segurança)
```
supabase/migrations/XXXX_fix_security_invoker_views.sql
supabase/migrations/XXXX_fix_insert_policies.sql
```

### Alto Impacto (Performance)
```
src/modules/assets/hooks/useInventory.ts (dividir)
src/modules/kpis/hooks/useKpiData.ts (linha 68)
```

### Médio Impacto (Qualidade)
```
src/lib/queryKeys.ts (adicionar namespaces)
src/modules/integrations/hooks/useIntegrations.ts (refatorar)
src/modules/okrs/hooks/useMockOkrData.ts (remover)
src/modules/kpis/hooks/useMockKpiData.ts (avaliar)
```

---

## Conclusão

O projeto está em estado **BOM** em termos de arquitetura, com a maioria dos módulos seguindo os padrões do TCR. 

**Principais vitórias da P3:**
- Home Dashboard consolidado em 1 RPC
- 18+ `select('*')` eliminados
- BU scope corrigido em 7 arquivos

**Débitos restantes:**
- 9 views SECURITY DEFINER (backend)
- 61 arquivos com query keys hardcoded (frontend)
- 3 arquivos grandes que precisam ser divididos

**Recomendação:** Executar Wave 1 (segurança) imediatamente, Wave 2 (performance) na próxima sprint.

---

*Documento gerado automaticamente em 2026-01-11*
