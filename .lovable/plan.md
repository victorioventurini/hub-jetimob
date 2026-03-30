

# Calendário de Ritos — Plano de Implementação

## Visao Geral

Adicionar calendarização de rituais ao Hub: cadências configuráveis por admin da BU, ocorrências geradas automaticamente, associação silenciosa com sessões de wizard, e visão de saúde/aderência.

---

## 1. Database — Duas novas tabelas

### `ritual_cadences` (BU-scoped, RLS)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| bu_id | uuid NOT NULL FK bu_units | Trigger `set_bu_id` |
| wizard_type | text NOT NULL | Valor de `WizardPersona` |
| team_id | uuid FK teams | NULL para ritos BU-level (MBR, QBR) |
| frequency | text NOT NULL | `weekly`, `biweekly`, `monthly`, `quarterly` |
| day_of_week | int | 0-6, para weekly/biweekly |
| day_of_month | int | 1-28, para monthly |
| month_week_ordinal | int | 1-4 (ex: "primeira segunda") |
| start_date | date NOT NULL | |
| end_date | date | NULL = indefinido |
| responsible_profile_id | uuid FK profiles | Quem garante o rito |
| is_active | boolean DEFAULT true | |
| created_at/updated_at | timestamptz | |

### `ritual_occurrences` (BU-scoped, RLS)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| bu_id | uuid NOT NULL FK bu_units | |
| cadence_id | uuid FK ritual_cadences | NULL para ocorrências avulsas |
| wizard_type | text NOT NULL | |
| team_id | uuid FK teams | |
| planned_date | date NOT NULL | |
| status | text DEFAULT 'scheduled' | `scheduled`, `completed_on_time`, `completed_late`, `missed`, `rescheduled` |
| actual_date | date | Data real de execução |
| rescheduled_from | date | Original se reagendado |
| rescheduled_to | date | Nova data |
| session_id | uuid FK okr_wizard_sessions | Vinculo com execução |
| notes | text | |
| created_at/updated_at | timestamptz | |

### RLS Policies
- **Admin BU**: CRUD completo via `is_bu_admin(auth.uid()::text, bu_id)` ou `is_platform_admin(auth.uid()::text)`
- **Líderes**: SELECT em cadences/occurrences do próprio time via `is_team_leader(my_profile_id(), team_id)`
- **Membros**: SELECT em occurrences do próprio time via `user_team_memberships`

### Indexes
- `(bu_id, wizard_type, team_id, planned_date)` em occurrences — para busca de associação automática
- `(cadence_id, status)` em occurrences

---

## 2. Edge Function — `generate-ritual-occurrences`

Chamada via `supabase.functions.invoke()` quando admin cria/atualiza cadência. Recebe `cadence_id`, faz:

1. Lê cadência do banco (frequency, day_of_week, etc.)
2. Calcula todas as datas de `start_date` até `end_date` (ou fim do ano + 1 trimestre)
3. Upsert: preserva occurrences com `session_id` (já executadas), remove futuras órfãs
4. Retorna contagem de ocorrências geradas

Usa `withMiddleware` + validação JWT + BU header conforme padrão `_shared/middleware.ts`.

---

## 3. Associação Automática — `onSuccess` do `completeSessionMutation`

Em `useWizardSession.ts`, no `onSuccess` do `completeSessionMutation`:

1. Query `ritual_occurrences` com status `scheduled` para `wizard_type` + `team_id` + `bu_id` onde `planned_date BETWEEN now() - 7 days AND now() + 7 days`
2. Se encontrar, UPDATE: `session_id = sessionId`, `actual_date = now()`, `status = completed_on_time | completed_late` (baseado em `planned_date` vs `actual_date`)
3. Fire-and-forget (não bloqueia o fluxo do wizard)
4. Se nao encontrar, nada — sessão fica avulsa

---

## 4. Frontend — Nova página `/settings/rituals`

### Rota
Em `settings.routes.tsx`: rota protegida com `BuAdminRoute` + `HubLayout`.

### Card em BuSettingsPage
Novo `SettingsCard` com icone `CalendarDays`, titulo "Calendario de Ritos".

### Página `RitualCalendarPage.tsx`

Tres abas usando `Tabs` + `useUrlTab`:

#### Aba "Cadencias"
- Lista cadências agrupadas por `wizard_type` (usa `WIZARD_TYPE_LABELS` existente)
- Cada cadência mostra: time (via `TeamSelect`), frequência, dia, responsável
- Dialog de criação/edição reutilizando: `TeamSelect`, `BuUserSelect`, `SimpleSelect` (frequência), `Calendar` (date picker)
- CRUD via hooks `useRitualCadences` (TanStack Query)
- Ao salvar, chama `generate-ritual-occurrences`

#### Aba "Calendario"
- Grid mensal com seletor de mês
- Filtros: `TeamSelect` + `SimpleSelect` (wizard_type)
- Cada dia mostra dots coloridos por status:
  - Cinza = scheduled
  - Verde = completed_on_time
  - Amarelo = completed_late
  - Vermelho = missed
  - Azul = rescheduled
- Click em ocorrência abre `Sheet` lateral com detalhes e ações (reagendar, link para histórico)

#### Bloco "Saude"
- Cards por time com barra de progresso
- Query: `COUNT(*) FILTER (WHERE status IN ('completed_on_time','completed_late')) / COUNT(*)` nos últimos 90 dias
- Ordenação por menor aderência

### Componentes reutilizados (sem duplicação)
`TeamSelect`, `BuUserSelect`, `SimpleSelect`, `WIZARD_TYPE_LABELS`, `PageHeader`, `Tabs/TabsList/TabsTrigger/TabsContent`, `Card`, `Badge`, `Calendar`, `Sheet`, `useUrlTab`

---

## 5. Enriquecimento do Historico

Em `RitualHistoryPage.tsx`, para cada `RitualHistoryItem`:
- Query join com `ritual_occurrences` via `session_id`
- Se vinculada: badge `"Previsto 17/03 · Realizado 19/03"`
- Se avulsa: badge `"Execução avulsa"` em cinza

Alteração mínima — apenas badge visual no card.

---

## 6. Visão do Líder/Membro

Componente `TeamRitualCalendar` (reutilizável) para embedding no dashboard do time ou sidebar:
- Próximas 5 ocorrências do time
- Histórico recente com status
- Leitura only, mesmo query filtrado por `team_id`

---

## 7. Cron para marcar `missed`

Edge function `cron-dispatcher` já existe. Adicionar lógica diária:
- `UPDATE ritual_occurrences SET status = 'missed' WHERE status = 'scheduled' AND planned_date < CURRENT_DATE - 1 AND session_id IS NULL`
- Integrar no cron existente para evitar nova função

---

## Registros Canônicos

| Item | Ação |
|------|------|
| `operationalTables.ts` | Adicionar `ritual_cadences`, `ritual_occurrences` |
| `queryKeys/okrs.ts` | Adicionar `ritualCadences`, `ritualOccurrences`, `ritualAdherence` |
| `WizardPersona` type | Sem alteração (já cobre todos os tipos) |

---

## Ordem de Execução

1. Migration SQL (tabelas + RLS + trigger `set_bu_id` + indexes)
2. Edge function `generate-ritual-occurrences`
3. Hooks: `useRitualCadences`, `useRitualOccurrences`, `useRitualAdherence`
4. Página `RitualCalendarPage` com 3 abas
5. Rota + card em BuSettingsPage
6. Associação automática em `useWizardSession.ts`
7. Cron `missed` no dispatcher
8. Enriquecimento do histórico
9. Componente `TeamRitualCalendar` para dashboards

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Criar |
| `supabase/functions/generate-ritual-occurrences/index.ts` | Criar |
| `src/pages/settings/RitualCalendarPage.tsx` | Criar |
| `src/modules/okrs/hooks/useRitualCadences.ts` | Criar |
| `src/modules/okrs/hooks/useRitualOccurrences.ts` | Criar |
| `src/modules/okrs/hooks/useRitualAdherence.ts` | Criar |
| `src/modules/okrs/components/ritual-calendar/` | Criar (subcomponentes das abas) |
| `src/pages/settings/BuSettingsPage.tsx` | Adicionar card |
| `src/routes/settings.routes.tsx` | Adicionar rota |
| `src/modules/okrs/hooks/useWizardSession.ts` | Estender `onSuccess` |
| `src/modules/okrs/pages/RitualHistoryPage.tsx` | Badge de data prevista |
| `src/integrations/supabase/operationalTables.ts` | Registrar tabelas |
| `src/lib/queryKeys/okrs.ts` | Adicionar keys |
| `supabase/config.toml` | Registrar nova function |

