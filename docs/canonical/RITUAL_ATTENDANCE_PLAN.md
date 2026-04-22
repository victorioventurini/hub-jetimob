# Plano de Implementação — Sistema Centralizado de Presença em Ritos Coletivos

**Versão:** 1.0.0  
**Data:** 2026-04-22  
**Status:** Proposta — aguardando aprovação  
**Origem:** Briefing externo (Claude/GPT) reinterpretado contra canônicos do Hub  
**Canônicos consultados:** TCR v3.28.0, IDENTITY_CONVENTION v2.2, PERMISSIONS_AND_RBAC_MODEL v1.5, WIZARDS_FRAMEWORK_BOUNDARY v1.0, HOOKS_BARREL_STANDARD, QUERY_KEYS_STANDARD, BU_SCOPED_SUPABASE_RULES

---

## 0. Briefing original × realidade do Hub

O prompt externo descreve uma arquitetura genericamente correta, mas referencia paths e convenções que **não existem** no Hub. Antes do plano, a tabela abaixo desfaz cada divergência:

| Item no briefing externo | Realidade no Hub | Decisão |
|---|---|---|
| `src/modules/okrs/wizards/shared/components/attendance/` | Caminho real é `src/modules/okrs/components/wizards/shared/`. O framework genérico vive em `.../shared/framework/` e é exposto via `@/wizards-framework` | **Componente vai no framework**, exposto por `@/wizards-framework` |
| `RitualSlug` | Não existe. Usamos `WizardPersona` (catálogo em `src/modules/okrs/constants/ritualWizardTypes.ts`) | **Adotar `WizardPersona`** |
| `participant_user_id UUID REFERENCES users(id)` | `users` não existe — convenção é `profiles.id` (IDENTITY_CONVENTION v2.2 §1.2) | **`participant_profile_id REFERENCES profiles(id)`** |
| Tabela sem `bu_id` | Toda tabela operacional do Hub é BU-scoped (BU_SCOPED_SUPABASE_RULES) | **`bu_id NOT NULL` + RLS por BU** |
| `whoCanMark: 'conductor' \| 'team-leader' \| 'bu-admin'` (string literal) | Permissões são via permission keys, não hardcode de roles (PERMISSIONS_AND_RBAC_MODEL §5) | **`whoCanMark` traduzido para permission keys** + helper `canMarkAttendance(session)` |
| Inventar tabela nova para "Y" do contador "X de Y" | Avaliações já vivem em `okr_wizard_sessions.addendums[type='participant_evaluation']` (já consumido em `RitualHistoryPage`) | **Reusar addendums** para o numerador; nova tabela só p/ presença (denominador) |
| `attendanceService.ts` em `wizards/shared/services/` | O Hub não usa camada "service" — operações vão em hooks de mutation Tanstack Query | **Hooks `useSessionAttendance*`** (mutations + queries) |
| `requireConfirmation` + `editableAfterConfirmation` | Já temos padrão de `Reabrir Ritual` para Admin BU (`mem://features/rituals/ritual-reopen-mechanism`). Sessão fechada → snapshot imutável | **Adotar mesma janela**: enquanto sessão `in_progress` é editável; quando `completed`, vira read-only salvo reopen |
| Resolvers em `attendanceResolvers.ts` | Dados de membros já existem via `useBuUsersDirectory`, `useTeam`, `useHierarchicalTeamList`, `useCompanyOkrs` | **Resolvers reusam hooks existentes**, não duplicam queries |

---

## 1. Princípios arquiteturais (intransigíveis)

1. **Componente único no framework genérico.** Vive em `src/modules/okrs/components/wizards/shared/framework/components/AttendanceStep.tsx` e é re-exportado via `@/wizards-framework`. Nenhum wizard tem lógica própria.
2. **Configuração declarativa em SSOT.** Nova entrada por persona em `framework/config/stepDefinitions.ts` (mesmo padrão dos outros steps). Nada de `if (persona === 'mbr')` em componentes.
3. **Identidade canônica.** `participant_profile_id` referencia `profiles.id`. Auditoria (`marked_by_profile_id`) idem. Nenhum FK para `auth.users` em colunas de domínio.
4. **BU-scoped.** `bu_id NOT NULL`, RLS por BU usando funções canônicas (`my_profile_id()`, `has_role_in_current_bu()`).
5. **Permissões via keys.** `okrs.attendance.mark:as_conductor` e `okrs.attendance.mark:as_team_leader` (alinhado ao padrão `okrs.checkin.create:self_or_owned` já existente).
6. **Snapshot imutável.** Quando a sessão muda para `completed`, registros viram read-only via trigger; reabertura por Admin BU passa a sessão para `in_progress` novamente, conforme padrão atual.
7. **Query keys centralizadas.** Novo arquivo `src/lib/queryKeys/attendance.ts` (com tests), exportado por `queryKeys/index.ts`.

---

## 2. Banco de Dados

### 2.1 Tabela `ritual_session_attendance`

```sql
CREATE TABLE public.ritual_session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.okr_wizard_sessions(id) ON DELETE CASCADE,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id),

  -- Participante (snapshot histórico)
  participant_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  participant_name TEXT NOT NULL,
  participant_role TEXT,                    -- cargo (job_title) no momento
  participant_team_id UUID REFERENCES public.teams(id),
  participant_team_name TEXT,               -- snapshot do nome do time

  -- Presença
  is_present BOOLEAN NOT NULL,

  -- Auditoria
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft delete (Soft-Delete Standard v1.1)
  deleted_at TIMESTAMPTZ,

  UNIQUE (session_id, participant_profile_id)
);

CREATE INDEX idx_attendance_session       ON public.ritual_session_attendance(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_participant   ON public.ritual_session_attendance(participant_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_bu_marked_at  ON public.ritual_session_attendance(bu_id, marked_at DESC) WHERE deleted_at IS NULL;
```

### 2.2 RLS

```sql
ALTER TABLE public.ritual_session_attendance ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário com acesso à sessão (mesmo padrão de okr_wizard_sessions)
CREATE POLICY ritual_session_attendance_select_v1
  ON public.ritual_session_attendance
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND bu_id = current_user_bu_id()
    AND EXISTS (
      SELECT 1 FROM public.okr_wizard_sessions s
      WHERE s.id = ritual_session_attendance.session_id
        AND s.bu_id = ritual_session_attendance.bu_id
    )
  );

-- INSERT/UPDATE: depende da permission key e do papel no rito
-- (validação fina vai no trigger BEFORE INSERT/UPDATE para checar whoCanMark)
CREATE POLICY ritual_session_attendance_write_v1
  ON public.ritual_session_attendance
  FOR ALL TO authenticated
  USING (
    bu_id = current_user_bu_id()
    AND has_permission((SELECT auth.uid()), 'okrs.attendance.mark:any')
  )
  WITH CHECK (
    bu_id = current_user_bu_id()
    AND marked_by_profile_id = my_profile_id()
  );
```

### 2.3 Trigger de imutabilidade pós-conclusão

```sql
CREATE OR REPLACE FUNCTION public.fn_attendance_block_after_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.okr_wizard_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  IF v_status = 'completed' AND NOT has_role_in_current_bu('admin') THEN
    RAISE EXCEPTION 'Sessão já encerrada — presença é imutável';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_attendance_block_after_completed
  BEFORE INSERT OR UPDATE OR DELETE ON public.ritual_session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_attendance_block_after_completed();
```

### 2.4 View agregada para dashboards

```sql
CREATE VIEW public.v_ritual_attendance_summary
WITH (security_invoker = true) AS
SELECT
  s.id                AS session_id,
  s.bu_id,
  s.wizard_type,
  s.team_id,
  s.cycle_id,
  s.completed_at,
  COUNT(a.id) FILTER (WHERE a.is_present)        AS present_count,
  COUNT(a.id)                                     AS total_count,
  CASE WHEN COUNT(a.id) > 0
       THEN ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.is_present) / COUNT(a.id), 1)
       ELSE NULL END                              AS attendance_rate_pct
FROM public.okr_wizard_sessions s
LEFT JOIN public.ritual_session_attendance a
  ON a.session_id = s.id AND a.deleted_at IS NULL
GROUP BY s.id;
```

### 2.5 Permission keys

A registrar em `permission_catalog`:

- `okrs.attendance.mark:any` — gate genérico (RLS)
- `okrs.attendance.mark:as_conductor` — condutor de Weekly/MBR/QBR/Pós-QBR
- `okrs.attendance.mark:as_team_leader` — líder do time (Check-in do Time)
- `okrs.attendance.view` — ver dados de presença (já implícito p/ quem tem acesso ao rito; mantemos chave para overrides)

Distribuição inicial nos templates V2:
- `okrs_admin_v2`: as três keys de mark + view
- Líderes: `mark:as_team_leader` automático (templates já existentes)
- Condutores formais (CEO/COO/Admin BU): `mark:as_conductor` via template + override quando aplicável

---

## 3. Frontend — Estrutura de arquivos

```
src/modules/okrs/components/wizards/shared/framework/
├── components/
│   ├── AttendanceStep.tsx              # NOVO — step completo (lista + contador + confirm)
│   ├── attendance/
│   │   ├── AttendanceCheckboxList.tsx  # NOVO — lista de checkboxes (apresentacional)
│   │   ├── AttendanceCounter.tsx       # NOVO — "X de Y presentes"
│   │   └── AttendanceSummary.tsx       # NOVO — view read-only (dashboard/histórico)
│   └── ... (componentes existentes do framework)
├── config/
│   ├── stepDefinitions.ts              # MODIFICADO — declarar attendance no Step 1
│   ├── attendanceConfig.ts             # NOVO — config declarativa por persona
│   └── attendanceResolvers.ts          # NOVO — resolvers de participantes esperados
├── hooks/
│   ├── useSessionAttendance.ts         # NOVO — leitura/mutação para o condutor
│   ├── useAttendanceSummary.ts         # NOVO — leitura agregada (dashboard)
│   └── useParticipantAttendanceHistory.ts  # NOVO — série histórica por pessoa
└── index.ts                            # MODIFICADO — exportar novos artefatos
```

E:
- `src/wizards-framework/index.ts` — re-export dos novos artefatos públicos
- `src/lib/queryKeys/attendance.ts` — chaves canônicas + teste
- `src/lib/queryKeys/index.ts` — re-export

### 3.1 Configuração declarativa por persona

`framework/config/attendanceConfig.ts`:

```ts
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export type ParticipantsResolverId =
  | 'team-members'
  | 'bu-leaders'
  | 'teams-with-active-okrs'
  | 'leaders-plus-c-level'
  | 'qbr-participants';

export type AttendanceMarkerRole = 'conductor' | 'team-leader';

export interface AttendanceConfig {
  enabled: boolean;
  resolver?: ParticipantsResolverId;
  markerRole?: AttendanceMarkerRole;       // mapeia para permission key correspondente
  defaultPresence?: 'none' | 'all';
  requireConfirmation?: boolean;
  editableAfterConfirmation?: boolean;
}

export const ATTENDANCE_CONFIG: Record<WizardPersona, AttendanceConfig> = {
  // Coletivos
  'team-checkin': { enabled: true, resolver: 'team-members',           markerRole: 'team-leader', defaultPresence: 'all',  requireConfirmation: false, editableAfterConfirmation: true },
  'weekly':       { enabled: true, resolver: 'bu-leaders',             markerRole: 'conductor',   defaultPresence: 'none', requireConfirmation: true,  editableAfterConfirmation: true },
  'mbr':          { enabled: true, resolver: 'teams-with-active-okrs', markerRole: 'conductor',   defaultPresence: 'none', requireConfirmation: true,  editableAfterConfirmation: true },
  'qbr-meeting':  { enabled: true, resolver: 'leaders-plus-c-level',   markerRole: 'conductor',   defaultPresence: 'none', requireConfirmation: true,  editableAfterConfirmation: true },
  'qbr-post':     { enabled: true, resolver: 'qbr-participants',       markerRole: 'conductor',   defaultPresence: 'none', requireConfirmation: true,  editableAfterConfirmation: true },

  // Individuais (sem presença)
  'collaborator':       { enabled: false },
  'leader-prep':        { enabled: false },
  'clevel-checkin':     { enabled: false },
  'pre-weekly':         { enabled: false },
  'mbr-pre':            { enabled: false },
  'qbr-pre':            { enabled: false },
  'qbr-pre-clevel':     { enabled: false },
  'team-okr-creation':  { enabled: false },
  'team-kr-creation':   { enabled: false },
};
```

### 3.2 Tradução markerRole → permission key

```ts
const PERMISSION_BY_ROLE: Record<AttendanceMarkerRole, string> = {
  'conductor':   'okrs.attendance.mark:as_conductor',
  'team-leader': 'okrs.attendance.mark:as_team_leader',
};
```

`useSessionAttendance` consulta `useIdentity` + `usePermissions` e devolve `canMark: boolean` — **componentes nunca leem role direto**.

### 3.3 Resolvers reutilizam hooks existentes

| Resolver | Fonte de dados |
|---|---|
| `team-members` | `useBuUsersDirectory({ teamId, includeSubteams: true })` (já existente, expande subtimes — `mem://standards/users/team-filter-includes-subteams`) |
| `bu-leaders` | `useHierarchicalTeamList()` → líderes únicos + `useIdentity()` para condutor |
| `teams-with-active-okrs` | `useCompanyOkrs(cycleId)` agrupado por time → líder de cada time |
| `leaders-plus-c-level` | `useHierarchicalTeamList()` (líderes) + permission `cycles.clevel:participate` para C-level |
| `qbr-participants` | Última sessão `wizard_type = 'qbr-meeting'` na BU/ciclo → `ritual_session_attendance` daquela sessão |

### 3.4 Integração no Step 1

`stepDefinitions.ts` ganha entrada `'attendance'` reutilizável **antes** do conteúdo principal de cada Step 1 dos ritos coletivos. Implementação preferida (mantendo padrão atual): adicionar **flag `showAttendance: true`** no config do Step 1 atual e fazer o componente de abertura renderizar o `AttendanceStep` em slot dedicado, espelhando o padrão `showPreparationStatus`.

Ordem visual no Step 1 quando ambos existem:
1. `PreparationStatusCard` (preparação prévia)
2. `AttendanceStep` (presença) — **novo**
3. Conteúdo específico (pauta curada, balanço, decisões etc.)

### 3.5 Integração com avaliações de participantes

O contador de avaliações **não inventa tabela**: lê o `addendums` da sessão (campo já existente — usado em `RitualHistoryPage` via `hasParticipantEvaluations`) e usa `present_count` da view como denominador.

Fallback documentado: quando `total_count = 0` (presença não registrada), denominador cai para o tamanho da lista de "esperados" do resolver, com aviso visual `Presença não registrada — contador estimado` + CTA para voltar ao Step 1.

---

## 4. Hooks (Tanstack Query)

### 4.1 Query Keys

`src/lib/queryKeys/attendance.ts`:

```ts
export const attendanceKeys = {
  all: ['attendance'] as const,
  sessions: () => [...attendanceKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...attendanceKeys.sessions(), sessionId] as const,
  summaries: () => [...attendanceKeys.all, 'summaries'] as const,
  summary: (sessionId: string) => [...attendanceKeys.summaries(), sessionId] as const,
  history: () => [...attendanceKeys.all, 'history'] as const,
  participant: (profileId: string, persona: string, range?: string) =>
    [...attendanceKeys.history(), profileId, persona, range ?? 'all'] as const,
};
```

### 4.2 API dos hooks

```ts
// Editor (Step 1 do condutor)
const {
  participants,        // ExpectedParticipant[] com is_present resolvido
  presentCount, totalCount,
  isConfirmed,
  canMark,             // computado via permission key
  togglePresence, confirm, edit,
} = useSessionAttendance(sessionId);

// Dashboard
const { summary, participants } = useAttendanceSummary(sessionId);

// Histórico individual
const { history, attendanceRate, absencePatterns } =
  useParticipantAttendanceHistory(profileId, persona, dateRange);
```

Mutations seguem padrão Tanstack: optimistic update + invalidation de `attendanceKeys.session(sessionId)` e `attendanceKeys.summary(sessionId)`.

---

## 5. UI — Estados visuais

| Estado | Como renderiza | Observações |
|---|---|---|
| Não iniciado | Checkboxes conforme `defaultPresence`, contador, sem badge | Default `'all'` no Check-in do Time é mais leve; `'none'` nos demais é deliberado |
| Em edição | Badge "Editando", autosave, timestamp da última mudança | Toast discreto a cada toggle |
| Confirmado | Card mais compacto, ícone ✓/✗ por linha, botão "Editar presença" se permitido | `requireConfirmation` controla se aparece o botão "Confirmar" |
| Read-only (sessão `completed`) | Idem confirmado, sem botão de editar (exceto reopen por admin) | Reuso de `CompletedRitualView` como container |

Estilo segue **design tokens semânticos** — sem cor hardcoded.

---

## 6. Migração de dados existentes

- **Sessões antigas:** sem inferência. Dashboard exibe `—` e badge `Dado indisponível para este período`.
- **Sessões em andamento na implantação:** ao reabrir, o componente aparece. Condutor pode marcar retroativamente. Sem marcação → fallback (`expected` do resolver como denominador).
- **Sem migração retroativa de presença** (intencional — preserva integridade do histórico).

---

## 7. Plano de execução em ondas

| Onda | Escopo | Risco | Validação |
|---|---|---|---|
| **A** | DB: migração da tabela + RLS + trigger + view + permission keys | Médio | `supabase linter`, smoke insert/update via SQL |
| **B** | Framework: componentes, config, resolvers, hooks, query keys + barrel + tests | Baixo | `tsc --noEmit`, vitest dos hooks puros |
| **C** | Integração no Step 1 dos 5 ritos coletivos via flag `showAttendance` | Médio | Smoke manual nos 5 wizards |
| **D** | Integração com contador de avaliações (Encerramento) + fallback | Baixo | Smoke manual em 2 ritos |
| **E** | Dashboards (sessão, pessoa, série temporal, cruzamento × feedback) em `RitualHistoryPage` e novo painel | Baixo | Smoke manual + snapshot de view |
| **F** | Documentação canônica: nova `RITUAL_ATTENDANCE_STANDARD.md`, atualizar TCR + WIZARDS_FRAMEWORK_BOUNDARY + memórias | Nulo | Lint markdown |

Cada onda é independente e reversível. Validação `tsc --noEmit` ao final de cada uma.

---

## 8. Critérios de aceite (mapeados ao briefing original)

- [x] Componente único usado pelos 5 ritos coletivos via `@/wizards-framework`
- [x] Ritos individuais mantêm `enabled: false` (sem componente)
- [x] Mudar comportamento em um arquivo afeta todos os ritos
- [x] Contador de avaliações usa `present_count` (com fallback `expected_count` + aviso)
- [x] Histórico por sessão / pessoa / rito (3 visualizações) + cruzamento presença × feedback
- [x] Snapshot `participant_name/role/team_name` preserva contexto
- [x] Sessões antigas exibem `—` sem quebrar dashboards
- [x] Experiência diferenciada: Check-in do Time leve (`defaultPresence: 'all'`), demais formais (`'none'` + confirm)
- [x] Fallback funcional quando presença esquecida
- [x] Adicionar novo rito coletivo = adicionar entrada em `ATTENDANCE_CONFIG` + flag `showAttendance: true` (zero novo código)

---

## 9. Não-objetivos (fora desta entrega)

- Notificação push de "marque a presença antes de iniciar"
- Self-check-in pelos próprios participantes (briefing prevê apenas condutor/líder)
- Integração com calendário externo (Google/Outlook)
- Geração automática de ata a partir da presença

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| RLS muito permissiva expor presença | Policy `select` exige `bu_id = current_user_bu_id()` + existência da sessão na mesma BU |
| Snapshot capturar valor errado se mudança de cargo no meio do rito | Snapshot é congelado no `INSERT`; `UPDATE` posterior só altera `is_present`/`marked_at` |
| Reabertura por admin recriar histórico inflando estatísticas | `reopen` não apaga registros; novo evento de presença é `UPDATE` no mesmo registro (preserva `unique(session_id, participant_profile_id)`) |
| Resolvers acoplarem framework a hooks de OKR específicos | Resolvers ficam em `framework/config/attendanceResolvers.ts` e usam **apenas** hooks já públicos via barrels |

---

## 11. Aprovação

Este plano substitui integralmente o briefing original quando houver conflito com canônicos. Ao aprovar, executar as ondas A→F sequencialmente com checkpoint de aprovação entre A e B (DB já aplicada).
