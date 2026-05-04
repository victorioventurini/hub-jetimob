
# Avaliação Anônima de Ritos Coletivos — Plano Final

**Status:** aprovado para implementação
**Escopo:** MBR, MBR-first, QBR-Meeting, QBR-Post
**Fora de escopo:** Weekly, QBR-Pre-CLevel, Pré-QBR, Check-ins individuais e Pré-Weekly (ritos individuais/operacionais — feedback inline atual nos dois primeiros será REMOVIDO)

---

## 1. Banco de Dados (1 migração)

**1.1 Sessões — short-code de avaliação**
```sql
ALTER TABLE okr_wizard_sessions
  ADD COLUMN evaluation_short_code TEXT UNIQUE,
  ADD COLUMN evaluation_open_at    TIMESTAMPTZ,
  ADD COLUMN evaluation_closed_at  TIMESTAMPTZ;
```
Função `generate_ritual_short_code()` → 4 chars `[A-Z2-9]` (sem 0/O/1/I/L), case-insensitive na busca via `UPPER()`.

**1.2 Tabela `ritual_evaluation_responses`** — sem `profile_id`, sem IP, sem user-agent. Campos: `session_id`, `bu_id`, `score_value/quality/decisions/time` (smallint), `change_one_thing` (text obrigatório), `what_worked` (text opcional), `submitted_at`, `deleted_at`.

**1.3 Validações por trigger** (sem CHECK — `mem://standards/database/check-constraint-prohibition`):
- scores ∈ [1,5]
- `length(change_one_thing) BETWEEN 3 AND 1000`
- `length(what_worked) <= 1000`
- bloqueia INSERT se `evaluation_open_at IS NULL` ou `evaluation_closed_at IS NOT NULL` ou `completed_at IS NOT NULL`

**1.4 RLS** — SELECT direto bloqueado (`USING (false)`); leitura só via view agregada e RPC pós-fechamento.

**1.5 View `v_ritual_evaluation_summary`** (`security_invoker = true`) — médias das 4 dimensões + `response_count` + `expected_count` (vem de `ritual_session_attendance.is_present`).

**1.6 RPCs (`SECURITY DEFINER`)**
| RPC | Auth | Função |
|---|---|---|
| `get_public_ritual_evaluation_form(p_short_code)` | público | `{session_id, ritual_label, show_what_worked, is_open}` |
| `submit_ritual_evaluation(...)` | público | Valida + insere; rate-limit 10/min por IP via `pg_temp` table |
| `open_ritual_evaluation(p_session_id)` | auth + `okrs.evaluation.open:as_conductor` | Gera código, seta `evaluation_open_at` |
| `close_ritual_evaluation(p_session_id)` | auth + `okrs.evaluation.close:as_conductor` | Seta `evaluation_closed_at` |
| `get_ritual_evaluation_live_count(p_session_id)` | auth + acesso à sessão | `{response_count, expected_count}` |
| `get_ritual_evaluation_open_answers(p_session_id)` | auth + `okrs.evaluation.view:as_conductor` | Só executa se `evaluation_closed_at IS NOT NULL` |

**1.7 Permission keys** em `permissionsCatalog.ts` — incluídas em templates Líder de BU, Admin BU, Plataforma.

---

## 2. Frontend — Framework (agnóstico)

**2.1 SSOT** `framework/config/evaluationConfig.ts` — espelha `attendanceConfig.ts`:
```ts
EVALUATION_CONFIG: {
  mbr:           { enabled: true, showWhatWorked: true },
  'mbr-first':   { enabled: true, showWhatWorked: true },
  'qbr-meeting': { enabled: true, showWhatWorked: true },
  'qbr-post':    { enabled: true, showWhatWorked: true },
  // todos os outros: { enabled: false }
}
```

**2.2 Componentes em `framework/components/evaluation/`**
- `EvaluationCollectionStep.tsx` — step novo, posicionado **antes** do `ClosingStep`. Estados: idle → opened (QR + counter) → closed (resumo). `qrcode.react` para o QR.
- `EvaluationLiveCounter.tsx` — polling 3s; "X de Y · ●●●○○".
- `EvaluationSummary.tsx` — 4 medidores + 2 listas de citações pós-fechamento.
- `EvaluationStartCard.tsx` — botão "Abrir avaliação" + URL curta + QR.

**2.3 Hooks** em `src/modules/okrs/hooks/evaluation/`:
- `useOpenRitualEvaluation`, `useCloseRitualEvaluation`
- `useRitualEvaluationLiveCount` (polling)
- `useRitualEvaluationSummary`, `useRitualEvaluationOpenAnswers`
- `usePublicRitualEvaluationForm`, `useSubmitRitualEvaluation` (usam `globalClient`)

**2.4 Query keys** `src/lib/queryKeys/ritualEvaluation.ts` + tests (padrão de `attendance.ts`).

---

## 3. Frontend — Página pública

**3.1 Rota** em `src/routes/public.routes.tsx` via `lazyWithRetry`:
```
/p/r/:shortCode → PublicRitualEvaluation
```
`PUBLIC_PATHS` atualizado.

**3.2 `src/pages/PublicRitualEvaluation.tsx`** — usa `globalClient` (PRE-BU). Estados: loading, form, sent, expired, invalid, alreadySubmitted (controle local via `localStorage[shortCode]`, nunca enviado ao servidor). Reusa `StarRatingInput` de `src/components/ui/star-rating.tsx`. Mobile-first.

**3.3 Mensagem clara de anonimato** no topo: "Suas respostas são anônimas. O sistema não registra sua identidade."

---

## 4. Refator dos ritos atuais

**4.1 Adicionar step de avaliação ANTES do encerramento em:**
- `MbrPage.tsx` + `MbrClosingStep.tsx`
- `QbrMeetingPage.tsx` + `QbrMeetingClosingStep.tsx`
- `QbrPostPage.tsx` + `QbrPostClosingStep.tsx`
- `MbrFirstPage.tsx` (se existir como página separada; senão, mesma config de `mbr`)

**4.2 Remover `ritualFeedback` inline (RitualImprovementFeedback)** desses 4 wizards. Tipos `MbrTeamSubmission`/`QbrTeamSubmission`: marcar `ritualFeedback` como `@deprecated` (retrocompat para snapshots antigos).

**4.3 Remover feedback inline também de:**
- `WeeklyClosingStep.tsx` (decisão do usuário: Weekly fora do escopo)
- `QbrPreCLevelPage.tsx` (decisão do usuário: QBR-Pre-CLevel fora do escopo)

**4.4 Histórico (`RitualHistoryPage`)**
- Novo `RitualEvaluationSection.tsx` — lê `v_ritual_evaluation_summary` + `get_ritual_evaluation_open_answers`. Layout: 4 medidores horizontais + 2 colunas de citações.
- `RitualFeedbackSection.tsx` e `ParticipantEvaluationsSection.tsx` viram **fallback legado** (badge "Formato anterior") quando a sessão não tem registros novos.

---

## 5. Princípios intransigíveis (verificados contra canônicos)

1. **Anonimato técnico real** — tabela sem qualquer FK ou metadado vinculável a pessoa.
2. **Framework agnóstico** — zero `if (persona === ...)` em `framework/components/` (`WIZARDS_FRAMEWORK_BOUNDARY`).
3. **BU resolvida server-side** — cliente público nunca informa `bu_id` (`BU_SCOPED_SUPABASE_RULES`).
4. **Soft-delete** — `deleted_at` na tabela; anulação só por sessão inteira (preserva anonimato).
5. **Validações em trigger**, não CHECK.
6. **Permission keys**, nunca hardcode de roles.
7. **Query keys via `src/lib/queryKeys/ritualEvaluation.ts`**.
8. **`globalClient`** na página pública; `lazyWithRetry` na rota.
9. **Snapshot imutável pós-`completed_at`** (mesma janela do `ritual-reopen-mechanism`).

---

## 6. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Brute-force do `short_code` (33⁴ ≈ 1.2M) | Rate-limit 10 submits/min por IP na RPC + código só funciona com `evaluation_open_at` setado + expira em 24h |
| Resposta dupla via cache limpo | Aceito (anonimato > deduplicação). UI orienta "uma resposta por dispositivo" |
| Vazamento via timing/log | RPC retorna apenas `{ok}`; sem logging do payload |
| Quebra de histórico antigo | `RitualEvaluationSection` faz fallback para `reflectionData.data.ritualFeedback` legado |

---

## 7. Não-objetivos desta entrega

- Notificações pedindo avaliação (briefing exige captura ao vivo)
- Dashboard de tendência longitudinal (fase 2: `/okrs/rituals/health`)
- Edição/retorno individual ao respondente
- Aplicação a Weekly e QBR-Pre-CLevel

---

## 8. Entregáveis

1. Migração única (tabela + view + RPCs + triggers + permission keys)
2. `evaluationConfig.ts` + 4 componentes de framework
3. Rota pública + `PublicRitualEvaluation.tsx`
4. 7 hooks novos
5. Refator de 4 wizards (adicionar step) + 2 wizards (remover feedback inline)
6. `RitualEvaluationSection` + fallback legado no histórico
7. Query keys + tests
8. Memória `mem://features/rituals/anonymous-evaluation-standard` + atualização do índice
9. Doc canônico `docs/canonical/RITUAL_EVALUATION_PLAN.md`
10. Tests: RPC (sessão fechada, código inválido, score fora de range, rate-limit), parser pública, agregação, anti-duplo-voto local

