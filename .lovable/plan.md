

# Plano Revisado: Vínculo Ciclos ↔ Rituais + Reorganização de URLs

## Visão Geral

Duas mudanças integradas na mesma entrega:
1. **Vínculo formal** entre ciclos de OKR e rituais (status `planning/active/closed`)
2. **Migração de URLs** dos rituais de `/okrs/*` para `/rituals/*`

---

## Fase 0 — Novo arquivo de rotas: `rituals.routes.tsx`

**Criar:** `src/routes/rituals.routes.tsx`

Mapa de rotas:

| URL antiga | URL nova |
|---|---|
| `/wizards` | `/rituals` |
| `/okrs/collaborator-checkin` | `/rituals/collaborator-checkin` |
| `/okrs/leader-prep` | `/rituals/team-checkin-pre` |
| `/okrs/team-checkin` | `/rituals/team-checkin` |
| `/okrs/managers-checkin` | `/rituals/managers-checkin` |
| `/okrs/clevel-checkin` | `/rituals/clevel-checkin` |
| `/okrs/mbr` | `/rituals/mbr` |
| `/okrs/qbr-pre` | `/rituals/qbr-pre` |
| `/okrs/qbr-pre-clevel` | `/rituals/qbr-clevel` |
| `/okrs/qbr` | `/rituals/qbr` |
| `/okrs/qbr-post` | `/rituals/qbr-post` |
| `/okrs/ritual-history` | `/rituals/history` |

- Wrapper `RitualRoute` (mesma lógica do `OkrRoute`: `ProtectedRoute > BuRequiredRoute > ModuleRoute("okrs")`)
- Mover a rota `/wizards` (WizardsPage) de `core.routes.tsx` para `rituals.routes.tsx` como `/rituals`

**Editar:** `src/routes/okrs.routes.tsx` — remover as 12 rotas de rituais  
**Editar:** `src/routes/core.routes.tsx` — remover rota `/wizards`  
**Editar:** `src/routes/index.ts` — adicionar `export { ritualRoutes } from './rituals.routes'`  
**Editar:** `src/App.tsx` — importar e renderizar `ritualRoutes`

## Fase 1 — Redirects das URLs antigas

**Editar:** `src/routes/rituals.routes.tsx` — adicionar `<Navigate>` redirects para cada URL antiga:

```text
/wizards → /rituals
/okrs/collaborator-checkin → /rituals/collaborator-checkin
/okrs/leader-prep → /rituals/team-checkin-pre
/okrs/team-checkin → /rituals/team-checkin
/okrs/managers-checkin → /rituals/managers-checkin
/okrs/clevel-checkin → /rituals/clevel-checkin
/okrs/mbr → /rituals/mbr
/okrs/qbr-pre → /rituals/qbr-pre
/okrs/qbr-pre-clevel → /rituals/qbr-clevel
/okrs/qbr → /rituals/qbr
/okrs/qbr-post → /rituals/qbr-post
/okrs/ritual-history → /rituals/history
```

Usar `<Navigate to="..." replace />` para preservar query params (ex: `?session=`, `?team=`). Componente wrapper `RedirectWithParams` que concatena `search` e `hash`.

## Fase 2 — Atualizar referências no frontend (~29 arquivos)

Todos os `Link to=`, `navigate()`, `route:` e `backUrl` que apontam para URLs antigas:

| Arquivo | O que muda |
|---|---|
| `src/pages/Wizards.tsx` | Todas as `route:` + link do histórico → `/rituals/history` |
| `src/components/layout/DynamicSidebar.tsx` | `href: "/wizards"` → `"/rituals"` |
| `src/modules/okrs/components/wizards/shared/FullPageWizardShell.tsx` | `backUrl` default → `'/rituals'` |
| `LeaderPrepWizardCard.tsx` | Link → `/rituals/team-checkin-pre?team=` |
| `TeamCheckinWizardCard.tsx` | Link → `/rituals/team-checkin?team=` |
| `CollaboratorWizardCard.tsx` | Link → `/rituals/collaborator-checkin` |
| `CLevelCheckinWizardCard.tsx` | Link → `/rituals/clevel-checkin` |
| `ManagersCheckinWizardCard.tsx` | Link → `/rituals/managers-checkin` |
| `MbrWizardCard.tsx` | Link → `/rituals/mbr` |
| `src/modules/home/components/LeaderDashboard.tsx` | Link histórico → `/rituals/history` |
| `src/modules/okrs/pages/RitualCalendarPage.tsx` | Link histórico → `/rituals/history` |
| `OkrCreationPage.tsx` | `backUrl` e `navigate` → `/rituals` |
| `QbrPrePage.tsx` | `backUrl` → `/rituals` |
| Todos os wizard pages (`*Page.tsx`) | `backUrl` → `/rituals` |
| `ExecutiveDashboardPage.tsx` | Links do histórico |
| Testes (`*.test.tsx`) | Atualizar URLs esperadas |
| `e2e/fixtures/test-data.ts` | Atualizar `ROUTES` |
| `e2e/okr-wizards.spec.ts` | Atualizar rotas |

## Fase 3 — Rename visual: leader-prep → "Pré Check-in do Time"

**Apenas labels visuais** — o `wizard_type` no banco permanece `leader-prep`.

| Arquivo | Mudança |
|---|---|
| `Wizards.tsx` | `name: 'Preparação do Check-in'` → `'Pré Check-in do Time'` |
| `LeaderPrepWizardCard.tsx` | `"Preparar Check-in do Time"` → `"Pré Check-in do Time"` |
| `FullPageWizardShell` config/label onde `leader-prep` for exibido | Atualizar label |
| `WIZARD_CONFIGS` em `src/modules/okrs/types/wizard.ts` | Atualizar `label` do `leader-prep` |

## Fase 4 — Atualizar Edge Functions (deep-links em e-mails)

7 edge functions precisam mudar `contextUrl`:

| Edge Function | Mudança |
|---|---|
| `team-checkin-summary/index.ts` | `/okrs/ritual-history?session=` → `/rituals/history?session=` |
| `mbr-summary/index.ts` | idem |
| `collaborator-checkin-summary/index.ts` | idem |
| `clevel-checkin-summary/index.ts` | idem |
| `qbr-pre-summary/index.ts` | idem |
| `qbr-meeting-summary/index.ts` | idem |
| `qbr-post-summary/index.ts` | idem |

## Fase 5 — Migration: Status formal nos ciclos

```sql
CREATE TYPE public.cycle_status AS ENUM ('planning', 'active', 'closed');

ALTER TABLE public.cycles 
  ADD COLUMN status public.cycle_status NOT NULL DEFAULT 'planning';

-- Migrar dados existentes
UPDATE public.cycles SET status = CASE
  WHEN now()::date BETWEEN start_date AND end_date THEN 'active'
  WHEN end_date < now()::date THEN 'closed'
  ELSE 'planning'
END;

-- Constraint: max 1 ciclo active por BU+type
CREATE OR REPLACE FUNCTION public.validate_single_active_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.cycles
      WHERE bu_id = NEW.bu_id AND type = NEW.type
        AND status = 'active' AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Já existe um ciclo % ativo para esta BU', NEW.type;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_single_active_cycle
  BEFORE INSERT OR UPDATE OF status ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.validate_single_active_cycle();
```

## Fase 6 — Hooks: `useActiveCycle` e `useCycleActions`

**Criar:** `src/modules/okrs/hooks/useActiveCycle.ts`
- Query por `status = 'active'` em vez de inferência por datas
- Retorna `{ activeCycle, planningCycles, isLoading }`

**Criar:** `src/modules/okrs/hooks/useCycleActions.ts`
- `activateCycle(id)`: UPDATE status → `'active'`
- `closeCycle(id)`: UPDATE status → `'closed'`
- Invalida cache keys relevantes

**Editar:** `src/lib/queryKeys/okrs.ts` — adicionar key `activeCycle`

## Fase 7 — UI: Controles de status na aba Ciclos

**Editar:** `src/modules/okrs/components/settings/CyclesTab.tsx`
- Badge de status por ciclo (planning/active/closed)
- Ciclo ativo destacado no topo
- Botão "Ativar Ciclo" (planning → active, com AlertDialog)
- Botão "Encerrar Ciclo" (active → closed, avisa se QBR não concluído)

## Fase 8 — Wizard de Criação: contexto de ciclo explícito

**Editar:** `src/modules/okrs/pages/OkrCreationPage.tsx`
- Substituir `useActiveCycles()` por `useActiveCycle()`
- Banner: `"Criando OKRs para: Q2 2026 · 01 abr → 30 jun"`
- Sem ciclo ativo + planning → permitir rascunho com aviso
- Sem nenhum ciclo → bloquear wizard com EmptyState

## Fase 9 — Check-ins e QBR: filtro por ciclo ativo formal

Trocar `useActiveCycles()` por `useActiveCycle()` em:
- `CollaboratorCheckinPage`, `LeaderPrepPage`, `TeamCheckinPage`
- `ManagersCheckinPage`, `CLevelCheckinPage`
- `QbrPrePage`, `QbrPreCLevelPage`, `QbrMeetingPage`, `QbrPostPage`

O hook `useUserKrsForWizard(cycleId)` já filtra por `cycle_id` — só muda a origem.

## Fase 10 — Indicador de ciclo ativo no Header

**Criar:** `src/components/layout/ActiveCycleIndicator.tsx`
- Exibe: `Q2 2026 · Semana 4 de 13 · 31%`
- Click → `/okrs` (dashboard)
- Visível quando não é página do Hub e existe ciclo ativo
- Responsivo: `hidden md:flex`

**Editar:** `src/components/layout/Header.tsx` — renderizar o indicador

## Fase 11 — Atualizar documentação

- `docs/canonical/DATA_MODEL_REGISTRY.md` — enum `cycle_status`, coluna `status`
- `docs/HUB_ADMIN_DEEP_DIVE.md` — seção de ciclos
- `docs/BU_SETTINGS_DEEP_DIVE.md` — novas rotas `/rituals/*`
- `.lovable/memory` — atualizar memories relevantes

---

## O que NÃO muda

- Estrutura interna dos wizards (steps, lógica, componentes)
- `wizard_type` no banco — permanece `leader-prep` etc.
- Rotas OKR que não são rituais (`/okrs`, `/okrs/create`, `/okrs/manage`, etc.)
- `useUserKrsForWizard` — já filtra por `cycleId`
- Máquina de estados do QBR (`qbr_status`) — preservada
- Histórico de rituais — sessões passadas mantêm `cycle_id` original

## Impacto estimado

- 1 migration SQL
- 3 arquivos novos (rituals.routes, useActiveCycle, useCycleActions, ActiveCycleIndicator)
- ~35 arquivos editados (rotas, links, edge functions, testes, docs)
- 7 edge functions re-deployed

