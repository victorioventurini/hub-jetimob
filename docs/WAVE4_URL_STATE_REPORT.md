# Wave 4B - URL State Migration Report

**Data:** 2026-01-08
**Status:** ✅ CONCLUÍDA

---

## Resumo Executivo

A Wave 4B completou a migração de todos os consumidores do hook legado `src/hooks/useUrlState.ts` para a API oficial `@/shared/url` (object-based).

---

## Arquivos Migrados (17 total)

| Arquivo | Hooks Utilizados |
|---------|------------------|
| `src/modules/assets/pages/KeysPage.tsx` | `useUrlSearch` |
| `src/modules/assets/pages/AssetsSettingsPage.tsx` | `useUrlTab` |
| `src/modules/kpis/pages/KpiDashboardPage.tsx` | `useUrlState` (object) |
| `src/modules/teams/pages/TeamDetailPage.tsx` | `useUrlTab` |
| `src/modules/teams/pages/TeamsPage.tsx` | `useUrlState`, `useUrlTab`, `useUrlSearch` |
| `src/pages/settings/SettingsIntegrations.tsx` | `useUrlSearch` |
| `src/pages/settings/SettingsModules.tsx` | `useUrlState`, `useUrlTab` |
| `src/modules/okrs/pages/OkrsPage.tsx` | `useUrlState`, `useUrlTab` |
| `src/modules/okrs/pages/OrgViewListPage.tsx` | `useUrlState` |
| `src/modules/okrs/pages/OkrDashboardPage.tsx` | `useUrlState`, `useUrlStates` |
| `src/pages/Modules.tsx` | `useUrlTab` |
| `src/pages/Users.tsx` | `useUrlState` (object) |
| `src/modules/vic/components/VicAuditPage.tsx` | `useUrlState` (object) |
| `src/modules/automations/pages/AutomationsPage.tsx` | `useUrlTab`, `useUrlSearch` |
| `src/modules/tickets/pages/TicketsListPage.tsx` | `useUrlState`, `useUrlTab`, `useUrlSearch` |
| `src/modules/tickets/pages/TicketsSettingsPage.tsx` | `useUrlTab` |
| `src/modules/integrations/pages/GlobalIntegrationDetailPage.tsx` | `useUrlTab` |
| `src/modules/permissions/pages/BuPermissionsPage.tsx` | `useUrlTab`, `useUrlSearch` |

---

## Mudanças de API

### Antes (tuple API - DEPRECATED)
```typescript
import { useUrlState } from "@/hooks/useUrlState";

const [value, setValue] = useUrlState({ key: 'q', defaultValue: '' });
```

### Depois (object API - PADRÃO)
```typescript
import { useUrlState, useUrlSearch, useUrlTab } from "@/shared/url";

// Para search com debounce
const { value: search, set: setSearch } = useUrlSearch("q");

// Para tabs
const [tab, setTab] = useUrlTab("default");

// Para outros estados
const state = useUrlState({ key: 'status', defaultValue: 'all' });
const value = state.value;
const setValue = state.set;
```

---

## Parâmetros de URL Padronizados

| Parâmetro | Uso | Exemplo |
|-----------|-----|---------|
| `q` | Busca textual | `?q=texto` |
| `tab` | Aba ativa | `?tab=users` |
| `status` | Filtro de status | `?status=active` |
| `page` | Paginação | `?page=2` |
| `pageSize` | Itens por página | `?pageSize=25` |
| `sort` | Campo de ordenação | `?sort=name` |
| `dir` | Direção de ordenação | `?dir=asc` |
| `year` | Filtro de ano | `?year=2026` |
| `team_id` | Filtro de time | `?team_id=uuid` |
| `view` | Visualização ativa | `?view=company` |

---

## Hook Legado

O arquivo `src/hooks/useUrlState.ts` foi marcado como **@deprecated**:

- Comentário de deprecação adicionado
- Warning em dev mode quando importado
- Mantido apenas para referência/fallback de emergência
- Será removido em versão futura

---

## Scripts de Auditoria

### Verificar imports legados
```bash
npx tsx scripts/audit-useUrlState-legacy.ts
```

Resultado esperado: `0 findings`

---

## QA

Checklist de QA disponível em: `docs/qa/QA_URL_STATE_WAVE4.md`

Cenários cobertos:
- Filtros persistem após refresh
- Deep links funcionam
- Back/Forward do navegador restauram estado
- Troca de BU mantém filtros
- Compartilhamento de URLs funciona

---

## Riscos Remanescentes

1. **Hook legado ainda existe** - Mantido para fallback, mas não deve ser usado
2. **Alguns componentes internos podem usar useState local** - Auditoria contínua com `audit-url-state.ts`

---

## Próximos Passos

1. [ ] Executar QA manual completo (`docs/qa/QA_URL_STATE_WAVE4.md`)
2. [ ] Remover hook legado após período de estabilização (Wave 5+)
3. [ ] Adicionar lint rule para bloquear imports do hook legado

---

## Conclusão

A migração foi concluída com sucesso. Todos os 17 arquivos que usavam a API tuple foram atualizados para a API object-based. O sistema de URL state está agora padronizado e segue as convenções definidas em `DEVELOPMENT_STANDARDS.md`.
