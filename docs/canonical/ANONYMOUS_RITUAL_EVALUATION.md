# Anonymous Ritual Evaluation — Canonical Standard

**Status:** Active
**Owner:** Rituals Squad
**Última revisão:** 2026-05-04
**Escopo:** Coleta anônima de avaliação dos ritos coletivos entre lideranças (cadência mensal ou superior).

---

## 1. Princípios

1. **Anonimato técnico.** A linha em `ritual_evaluation_responses` NÃO carrega `auth.uid()`, IP, user-agent ou qualquer ID que permita reidentificação. O condutor enxerga apenas médias e citações sem autoria.
2. **Framework agnóstico.** Os componentes (`framework/components/evaluation/*`) NÃO contêm `if (persona === ...)`. A SSOT é o `evaluationConfig.ts`. Adicionar um rito coletivo = adicionar entrada `enabled: true` lá.
3. **PRE-BU vs POST-BU.** A página pública usa `globalClient` (sem `BuProvider`). A BU é resolvida server-side pelas RPCs `SECURITY DEFINER` que validam o short-code.
4. **Server is source of truth.** Estado da coleta (`open_at`, `closed_at`, `short_code`) vive na sessão do wizard. O step hidrata via `useRitualEvaluationSummary`. O frontend não persiste isso em draft.
5. **Soft-delete.** `ritual_evaluation_responses.deleted_at` é filtrado em todos os agregados.

---

## 2. Escopo aprovado

Habilitado APENAS em ritos coletivos entre lideranças com cadência ≥ mensal:

| Persona         | enabled | showWhatWorked | Observação |
|-----------------|---------|----------------|------------|
| `mbr`           | true    | true           | Container ativo: `MbrPage` |
| `mbr-first`     | true    | true           | Histórico (sem container ativo hoje) |
| `qbr-meeting`   | true    | true           | Container ativo: `QbrMeetingPage` |
| `qbr-post`      | true    | true           | Container ativo: `QbrPostPage` |

**Explicitamente FORA** (decisão usuário 2026-05-04):
- `weekly` — cadência alta, fadigaria a coleta.
- `qbr-pre-clevel` — instrumento individual de preparação, não rito coletivo.
- Todos os ritos individuais e ritos preparatórios.

---

## 3. Modelo de Dados

### 3.1 Sessão do wizard (3 colunas adicionadas)

```sql
ALTER TABLE public.okr_wizard_sessions
  ADD COLUMN evaluation_short_code TEXT,
  ADD COLUMN evaluation_open_at    TIMESTAMPTZ,
  ADD COLUMN evaluation_closed_at  TIMESTAMPTZ;

-- Unicidade case-insensitive do short-code
CREATE UNIQUE INDEX uq_evaluation_short_code
  ON public.okr_wizard_sessions (UPPER(evaluation_short_code))
  WHERE evaluation_short_code IS NOT NULL;
```

Geração via `generate_ritual_short_code()` (4 chars do alfabeto sem ambíguos: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).

### 3.2 Tabela de respostas

```sql
public.ritual_evaluation_responses (
  id              UUID PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES okr_wizard_sessions(id),
  bu_id           UUID NOT NULL,           -- denormalizado para RLS rápida
  score_value     SMALLINT NOT NULL,       -- 1..5 (validation trigger)
  score_quality   SMALLINT NOT NULL,
  score_decisions SMALLINT NOT NULL,
  score_time      SMALLINT NOT NULL,
  change_one_thing TEXT NOT NULL,          -- 3..1000 chars (validation trigger)
  what_worked     TEXT,                    -- 0..1000 chars
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

**Sem CHECK constraints** (canon `mem://standards/database/check-constraint-prohibition`). Validação por trigger `fn_validate_ritual_evaluation_response`.

### 3.3 View agregada

`v_ritual_evaluation_summary` (`security_invoker = true`) — joina `okr_wizard_sessions` + `ritual_evaluation_responses` + `ritual_session_attendance` (denominador "X de Y"). Inclui `evaluation_short_code` para hidratação do step sem RPC extra.

---

## 4. Superfície de RPCs

| RPC | Quem | Propósito |
|---|---|---|
| `get_public_ritual_evaluation_form(p_short_code)` | Anônimo | Resolve short-code → `(session_id, ritual_label, wizard_type, show_what_worked, is_open)` |
| `submit_ritual_evaluation(...)` | Anônimo | Insere uma resposta. Recusa se sessão não está aberta. |
| `open_ritual_evaluation(p_session_id)` | Condutor | Gera short-code, marca `open_at`. Permission: `okrs.evaluation.open:as_conductor`. |
| `close_ritual_evaluation(p_session_id)` | Condutor | Marca `closed_at`. Permission: `okrs.evaluation.close:as_conductor`. |
| `get_ritual_evaluation_live_count(p_session_id)` | Condutor | `(response_count, expected_count)` ao vivo. |
| `get_ritual_evaluation_open_answers(p_session_id)` | Condutor | Citações **APENAS após fechamento**. Permission: `okrs.evaluation.view:as_conductor`. |

Todas RPCs públicas/SD validam `bu_id` server-side. Chamadas anônimas NUNCA inserem `auth.uid()`/IP/UA na resposta.

---

## 5. Permission Keys (catálogo)

```
okrs.evaluation.open:as_conductor
okrs.evaluation.close:as_conductor
okrs.evaluation.view:as_conductor
```

Sem hardcode de roles. Quem é "conductor" é resolvido pelo `permissionsCatalog` (role-based mapping).

---

## 6. Rota pública

```
/p/r/:shortCode
```

- Registrada em `src/routes/public.routes.tsx` via `lazyWithRetry` (canon `mem://standards/frontend-lazy-with-retry`).
- Adicionada em `PUBLIC_PATHS`.
- Página: `src/pages/PublicRitualEvaluation.tsx`.
- **Mobile-first.** Botões 1-5 com 48-56 px de área de toque. Mensagem clara de anonimato no header.
- Usa `globalClient` (PRE-BU). Não monta `BuProvider`.

---

## 7. Framework — componentes e hooks

### 7.1 Componentes (sob `framework/components/evaluation/`)

| Componente | Responsabilidade |
|---|---|
| `EvaluationStartCard` | Botão "Abrir avaliação" / QR + URL + curto / botão "Encerrar" |
| `EvaluationLiveCounter` | "X de Y respostas" (denominador = presentes confirmados) |
| `EvaluationSummary` | 4 medidores 1-5 + 2 listas de citações |
| `EvaluationCollectionStep` | Orquestrador (idle → opened → closed). Plumbing zero — só `sessionId` + `persona` + `footer`. |

Componentes são `memo`. Apresentacionais não conhecem persona — apenas o orquestrador lê `evaluationConfig`.

### 7.2 Hooks (sob `framework/hooks/`)

| Hook | Cliente |
|---|---|
| `usePublicRitualEvaluationForm`, `useSubmitRitualEvaluation` | `globalClient` (rota pública) |
| `useRitualEvaluationSummary` | `useBuScopedSupabase` |
| `useRitualEvaluationLiveCount` | `useBuScopedSupabase` |
| `useRitualEvaluationOpenAnswers` | `useBuScopedSupabase` |
| `useOpenRitualEvaluation`, `useCloseRitualEvaluation` | `useBuScopedSupabase` |

### 7.3 Query keys

`src/lib/queryKeys/ritualEvaluation.ts` — prefix obrigatório `['ritualEvaluation', ...]` (canon `mem://standards/query-key-prefix-standard`).

---

## 8. Histórico de ritos

`RitualEvaluationSection` em `src/modules/okrs/pages/ritual-history/`:

1. Lê `v_ritual_evaluation_summary` por `sessionId`.
2. Se `response_count > 0` → renderiza `EvaluationSummary` (modelo novo).
3. Senão → fallback ao `RitualFeedbackSection` legado (lê `reflectionData.data.ritualFeedback`, coleta antiga 1-5 estrelas no MbrClosingStep).

Substitui o uso direto de `RitualFeedbackSection` no `RitualHistoryCard.tsx`.

---

## 9. Refactor dos containers ativos

Nos 3 containers ativos foi inserido um step `'evaluation'` ANTES do encerramento:

| Container | Step antes | Persona |
|---|---|---|
| `MbrPage` | `'qbr-followup'` → **`'evaluation'`** → `'closing'` | `mbr` |
| `QbrMeetingPage` | `'commitments'` → **`'evaluation'`** → `'closing'` | `qbr-meeting` |
| `QbrPostPage` | `'follow-up'` → **`'evaluation'`** → `'minutes'` | `qbr-post` |

Tipos atualizados em `src/modules/okrs/types/wizard/{mbr,qbr}.ts`.

### 9.1 Remoção do feedback inline

- `WeeklyClosingStep`: já não tinha — sem ação.
- `QbrPreCLevelPage`: o step `'feedback'` (id mantido para compat de drafts em andamento) foi renomeado para "Encerramento" e o bloco de coleta foi escondido via nova prop `MbrClosingStep.hideFeedbackBlock`. O bloco continua existindo no MBR padrão.
- Campo `ritualFeedback` em `MbrTeamSubmission`/`QbrTeamSubmission` deve ser marcado `@deprecated` e mantido para retro compat na leitura do histórico.

---

## 10. Anti-fraude e privacidade

- **Rate limit:** mitigação básica de bot via `client_fingerprint` (TZ + screen + lang) — NÃO usado para reidentificação, apenas para rate-limit por curto período.
- **Não logar payload** das respostas em logs estruturados das edges/RPCs.
- **Aceitar duplicatas** — anonimato é prioritário sobre deduplicação.
- **`get_ritual_evaluation_open_answers`** recusa execução se `evaluation_closed_at IS NULL` (citações não vazam ao vivo).

---

## 11. Não-objetivos (explicitos)

- Notificações para participantes ("avaliação aberta").
- Dashboard longitudinal cross-rituals (será iteração futura).
- Edição de uma resposta após enviada (anonimato impede).
- Avaliação em ritos individuais/preparatórios.

---

## 12. Referências

- `mem://features/rituals/anonymous-evaluation-standard` — resumo operacional.
- `mem://standards/bu-isolation-master` — RLS BU-scoped.
- `mem://standards/query-key-prefix-standard` — query keys.
- `mem://standards/frontend-lazy-with-retry` — rota pública.
- `mem://standards/database/check-constraint-prohibition` — validação por trigger.
- Migrations: `supabase/migrations/20260504133148_*.sql` (base) + `20260504133934_*.sql` (short_code na view).
