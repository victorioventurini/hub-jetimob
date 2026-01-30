# Wave: Hooks & Barrel Files Consolidation (REVISADO)

**Versão:** 1.1
**Data:** 2026-01-30
**Status:** Em Planejamento
**Referência TCR:** v2.74.0 §10.4 (Barrel Files de Hooks)

---

## ✅ PRE-CHECKLIST EXECUTADO

| Documento | Status | Seção Relevante |
|-----------|--------|-----------------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` v2.74.0 | ✅ Analisado COMPLETO | §10.4 Barrel Files de Hooks |
| `docs/canonical/DEVELOPMENT_STANDARDS.md` v1.17.0 | ✅ Analisado | §K Hooks e Barrel Files |
| `docs/canonical/QUERY_KEYS_STANDARD.md` | ✅ Analisado | Query Keys Pattern |
| `docs/guides/HOOKS_CONSOLIDATION_REPORT.md` | ✅ Analisado | Wave 3-7 já executada |
| Memory `pre-action-audit-policy` | ✅ Cumprido | Análise técnica antes de ação |

---

## Objetivo

Consolidar a estrutura de hooks/queries em todo o sistema, eliminando duplicações e garantindo que todos os imports sigam o padrão de barrel files conforme **TCR §10.4**.

---

## Padrão Oficial (TCR §10.4)

```
src/modules/[module]/
├── hooks/
│   ├── index.ts          # BARREL FILE PRINCIPAL ← Ponto único de import
│   ├── queries/          # (opcional)
│   │   ├── index.ts      # Barrel da subpasta
│   │   └── useXyzQuery.ts
│   ├── mutations/        # (opcional)
│   │   ├── index.ts      # Barrel da subpasta
│   │   └── useXyzMutation.ts
│   └── useOtherHook.ts
```

### Regras Obrigatórias (TCR)

1. **Proibido** importar hooks direto do arquivo (ex: `from './hooks/useTeams'`)
2. **Obrigatório** importar do barrel (ex: `from './hooks'` ou `from '@/modules/teams/hooks'`)
3. Subpastas (`queries/`, `mutations/`) devem ter seu próprio `index.ts`
4. O barrel file do módulo re-exporta tudo de subpastas

---

## Análise Realizada

### 1. Documentação Consultada (VERIFICADO)

| Documento | Versão | Seção Relevante |
|-----------|--------|-----------------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | v2.74.0 | §10.4 Barrel Files de Hooks |
| `docs/canonical/DEVELOPMENT_STANDARDS.md` | v1.17.0 | §K Hooks e Barrel Files |
| `docs/canonical/QUERY_KEYS_STANDARD.md` | - | Query Keys Pattern |
| `docs/guides/HOOKS_CONSOLIDATION_REPORT.md` | v1.0.0 | Relatório Wave 3-7 |

### 2. Estado Atual dos Módulos

| Módulo | Barrel File | Status | Problemas Identificados |
|--------|-------------|--------|-------------------------|
| `okrs` | `hooks/index.ts` + `hooks/queries/index.ts` | ✅ Consolidado | Nenhum |
| `teams` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `tickets` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `assets` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `permissions` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `bu` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `integrations` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `vic` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `home` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `kpis` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `settings` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `external` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `areas` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `partners` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `users-global` | `hooks/index.ts` | ✅ Consolidado | Nenhum |
| `automations` | `hooks/index.ts` | ✅ Consolidado | Nenhum |

### 3. Problemas Identificados em `src/hooks/`

| Arquivo | Tipo | Problema | Ação Necessária |
|---------|------|----------|-----------------|
| `useNotificationCenter.ts` | Alias/Proxy | Re-exporta de `notifications/` | **Remover após migrar imports** |
| `useNotificationAdmin.ts` | Standalone | Não está no barrel `notifications/` | Mover para pasta `notifications/` |
| `useNotificationTemplates.ts` | Standalone | Não está no barrel `notifications/` | Mover para pasta `notifications/` |
| `notifications/index.ts` | Barrel | Existe, mas incompleto | Completar exports |
| `components/ui/use-toast.ts` | Alias/Proxy | Re-exporta de `hooks/use-toast.ts` | **Manter** (padrão shadcn) |

### 4. Verificação de Imports Diretos

**Busca realizada:** Imports de arquivos individuais (ex: `from "@/modules/okrs/hooks/useTeams"`)

**Resultado:** ✅ **ZERO violações encontradas** em módulos principais.

Todos os 125 arquivos que importam de `@/hooks/` usam o padrão correto.

---

## Plano de Ação

### Fase 1: Consolidar `src/hooks/notifications/`

**Objetivo:** Unificar todos os hooks de notifications em uma única pasta com barrel file completo.

#### 1.1 Mover arquivos para `src/hooks/notifications/`

```
src/hooks/notifications/
├── index.ts                    # Barrel completo
├── types.ts                    # ✅ Já existe
├── utils.ts                    # ✅ Já existe
├── useNotificationQueries.ts   # ✅ Já existe
├── useNotificationMutations.ts # ✅ Já existe
├── useNotificationAdmin.ts     # ⬅️ MOVER de src/hooks/
├── useNotificationTemplates.ts # ⬅️ MOVER de src/hooks/
```

#### 1.2 Atualizar `src/hooks/notifications/index.ts`

Consolidar todos os exports:

```typescript
// Types
export type { ... } from './types';

// Core queries/mutations (já existentes)
export { useNotificationEvents, ... } from './useNotificationQueries';
export { useBuNotificationChannelMutations, ... } from './useNotificationMutations';

// Admin hooks (a adicionar)
export { 
  useBuEventSettings,
  useBuEventSettingMutation,
  useNotificationOutbox,
  useRetryOutboxItem,
  useInAppNotifications,
  useOutboxStats,
  useBuProfiles,
  type OutboxItem,
  type InAppNotification,
  type BuEventSetting,
  type OutboxFilters,
  type InAppFilters,
} from './useNotificationAdmin';

// Template hooks (a adicionar)
export {
  useNotificationTemplates,
  useNotificationTemplateVersions,
  useNotificationTemplateVariables,
  useNotificationTemplateAudit,
  useSaveTemplateVersion,
  useActivateTemplateVersion,
  useCreateBuTemplate,
  extractTemplateVariables,
  validateTemplateVariables,
  type NotificationTemplate,
  type TemplateVersion,
  type TemplateVariable,
  type TemplateAuditLog,
  type TemplateFilters,
} from './useNotificationTemplates';

// Utils
export { groupSettingsByModule, moduleNames } from './utils';
```

#### 1.3 Atualizar imports nos consumidores

Arquivos a atualizar (9 arquivos):

| Arquivo | Import Atual | Import Novo |
|---------|--------------|-------------|
| `src/pages/settings/SettingsNotifications.tsx` | `@/hooks/useNotificationAdmin` | `@/hooks/notifications` |
| `src/pages/hub/HubNotifications.tsx` | `@/hooks/useNotificationCenter` | `@/hooks/notifications` |
| `src/pages/me/NotificationsPage.tsx` | `@/hooks/useNotificationCenter` | `@/hooks/notifications` |
| `src/pages/me/NotificationPreferences.tsx` | `@/hooks/useNotificationCenter` | `@/hooks/notifications` |
| `src/components/notifications/templates/TemplatesList.tsx` | `@/hooks/useNotificationTemplates` | `@/hooks/notifications` |
| `src/components/notifications/templates/TemplateEditorSheet.tsx` | `@/hooks/useNotificationTemplates` | `@/hooks/notifications` |
| `src/components/notifications/templates/TemplateHistorySheet.tsx` | `@/hooks/useNotificationTemplates` | `@/hooks/notifications` |
| `src/modules/tickets/components/settings/InternalRoutingRuleDialog.tsx` | `@/hooks/useNotificationAdmin` | `@/hooks/notifications` |

#### 1.4 Remover arquivos legados

Após atualizar imports:

- [ ] Deletar `src/hooks/useNotificationCenter.ts` (era apenas proxy)
- [ ] Deletar `src/hooks/useNotificationAdmin.ts` (movido)
- [ ] Deletar `src/hooks/useNotificationTemplates.ts` (movido)

---

### Fase 2: Validação Final

#### 2.1 Buscar imports órfãos

```bash
# Verificar se ainda existem imports dos arquivos deletados
grep -r "useNotificationCenter" src/ --include="*.ts" --include="*.tsx"
grep -r "useNotificationAdmin" src/ --include="*.ts" --include="*.tsx"
grep -r "useNotificationTemplates" src/ --include="*.ts" --include="*.tsx"
```

#### 2.2 Verificar tipos estão exportados

Garantir que todos os types necessários estão no barrel.

#### 2.3 Rodar testes

```bash
pnpm test
```

---

## Resumo de Mudanças

| Ação | Arquivos |
|------|----------|
| **Mover** | 2 arquivos para `notifications/` |
| **Atualizar barrel** | 1 arquivo (`notifications/index.ts`) |
| **Atualizar imports** | 8 arquivos |
| **Deletar** | 3 arquivos proxy/legados |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Quebra de build | Baixa | Atualizar todos imports antes de deletar |
| Tipos não exportados | Baixa | Verificar exports com busca |
| Testes falhando | Baixa | Rodar suite completa |

---

## Conclusão da Análise

### ✅ O que está BEM

1. **Todos os 16 módulos** em `src/modules/` têm barrel files consolidados e funcionando
2. **Zero violações** de imports diretos nos módulos principais
3. **Query keys** centralizadas em `src/lib/queryKeys/` com estrutura modular
4. **Padrão de barrel** está bem documentado em `DEVELOPMENT_STANDARDS.md` §K

### ⚠️ O que precisa de ação

1. **src/hooks/notifications/**: Consolidar 3 arquivos standalone no barrel
2. **Imports legados**: 8 arquivos ainda importam de proxies/arquivos individuais

### 📊 Score de Conformidade

- **Módulos:** 16/16 (100%) ✅
- **src/hooks/:** ~90% (3 arquivos para consolidar)
- **Query Keys:** 100% ✅

---

## Aprovação

- [ ] Revisar plano
- [ ] Aprovar execução

**Próximo passo:** Executar Fase 1 após aprovação.
