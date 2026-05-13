
# Módulo "Assessments" — Plano de Implementação

Substitui o protótipo Pippi por um módulo completo, BU-scoped, alinhado aos canônicos (TCR, RBAC v2, IDENTITY_CONVENTION, BU_SCOPED_SUPABASE_RULES, ANONYMOUS_RITUAL_EVALUATION).

Naming: módulo **Assessments**, rota base **`/assessments`**, rota pública **`/q/:token`** (curta para links).

## 1. Conceitos

```text
AssessmentTheme           ex: "Cultura Jetimob", "CRM Operação"
  └─ AssessmentForm       formulário reutilizável (banco de questões); tem versões e nível
        ├─ version 1, 2…  imutável após publicação
        └─ Question[]     enunciado + tempo individual + ordem
Assessment (prova)        composição de 1+ forms (snapshot de versões)
  └─ AssessmentInvite     link público com token, vinculado a um CPF
        └─ AssessmentRun  execução do respondente (timer, antifraude, respostas)
              └─ Answer   por questão
```

Decisões travadas:
- **Escopo:** BU-scoped (tudo carrega `bu_id`, RLS por BU).
- **Acesso do respondente:** link público + token único; identificação por CPF (sem login).
- **Antifraude:** observacional — bloqueia paste/drop/menu, conta tab-switches, registra tempo; **avaliador interpreta** (sem auto-invalidação). Aviso explícito ao respondente.
- **Composição:** uma prova combina N forms. Ex.: "Cultura Jetimob v2 + CRM Operação Nível 1".

## 2. Banco de dados (BU-scoped)

Todas com `bu_id uuid NOT NULL`, `created_at`, `updated_at`, `deleted_at`, RLS por BU + permission keys. Sem CHECK constraints — usar ENUMs e validation triggers.

| Tabela | Campos-chave |
|---|---|
| `assessment_themes` | `name`, `slug`, `description` |
| `assessment_forms` | `theme_id`, `title`, `level` (smallint), `description`, `current_version`, `status` (`draft`/`published`/`archived`) |
| `assessment_form_versions` | `form_id`, `version` (int), `published_at`, `published_by`, `total_time_seconds` (derivado), `frozen` (bool) |
| `assessment_form_questions` | `version_id`, `position`, `prompt`, `time_limit_seconds`, `help_text`, `min_chars`, `max_chars` |
| `assessments` | `title`, `description`, `intro_text`, `outro_text`, `status` (`draft`/`active`/`closed`), `expires_at`, `default_total_time_seconds` |
| `assessment_form_links` | `assessment_id`, `version_id`, `position` (snapshot da versão usada) |
| `assessment_invites` | `assessment_id`, `token` (uuid, único), `cpf` (digits-only), `respondent_name`, `respondent_email?`, `expires_at`, `status` (`pending`/`started`/`submitted`/`expired`/`revoked`), `linked_profile_id?` |
| `assessment_runs` | `invite_id`, `started_at`, `submitted_at?`, `time_used_seconds`, `tab_switch_count`, `paste_attempt_count`, `client_meta` (jsonb) |
| `assessment_answers` | `run_id`, `question_id`, `text`, `time_spent_seconds`, `paste_attempts`, `tab_switches_during`, `last_keystroke_at` |

Índice único `(assessment_id, cpf)` em `assessment_invites`. ENUMs: `assessment_form_status`, `assessment_status`, `assessment_invite_status`.

**CPF → Profile linking (futuro):** trigger em `profiles` que, ao detectar `profiles.cpf` igual a `assessment_invites.cpf`, preenche `linked_profile_id`. CPF guardado apenas em dígitos.

**Versionamento:** ao publicar versão (`frozen=true`), edição cria próxima `draft`. `assessment_form_links.version_id` é snapshot — alterar uma questão depois não afeta provas em andamento.

**Soft delete + RLS:** padrão canônico. Filtro `deleted_at is null`. RLS:
- `assessment_invites`/`runs`/`answers`: leitura por respondente via RPC `SECURITY DEFINER` validando `token` (mesmo padrão de `ANONYMOUS_RITUAL_EVALUATION`); leitura/gestão de admin via permission key + `bu_id`.
- Demais tabelas: leitura/escrita via permission keys + `bu_id = currentBuId`.

## 3. Permission keys (RBAC v2)

Adicionar ao `permission_catalog`:
- `assessments.themes.manage:bu`
- `assessments.forms.view:bu` / `.manage:bu` (CRUD de forms e versões)
- `assessments.assessments.view:bu` / `.manage:bu` / `.results.view:bu`
- `assessments.invites.manage:bu`

Admin BU recebe as `manage`. Template opcional "Avaliador" recebe `view`/`results.view`. Sem hardcode de role.

Registro em `MODULES`/`get_enabled_modules_for_bu`: novo módulo operacional `assessments` (slug, route `/assessments`, ícone), gateado por permission key na sidebar via `DynamicSidebar`.

## 4. Frontend — estrutura

Novo módulo `src/modules/assessments/` (segue padrão de `tickets`/`projects`).

```text
src/modules/assessments/
  pages/
    AssessmentFormsListPage.tsx       # banco de forms (filtros: tema, nível, status)
    AssessmentFormEditorPage.tsx      # editor de versão (CRUD questões, tempo, preview)
    AssessmentsListPage.tsx           # provas
    AssessmentBuilderPage.tsx         # monta prova combinando forms
    AssessmentInvitesPage.tsx         # gerar/revogar links, ver status por CPF
    AssessmentResultsPage.tsx         # respostas + métricas antifraude por run
  components/
    QuestionEditor.tsx
    LockedTextarea.tsx                # bloqueia paste/drop/contextmenu + heurística
    AntiFraudBanner.tsx               # aviso ao respondente
    AttemptTelemetry.tsx              # hook (tempo ativo, visibilitychange)
  hooks/
    useAssessmentForms.ts / useAssessmentFormVersion.ts
    useAssessments.ts / useAssessmentBuilder.ts
    useAssessmentInvites.ts / useAssessmentRunResults.ts
  public/
    PublicAssessmentEntry.tsx         # /q/:token — confirma CPF + nome + aceite
    PublicAssessmentRunner.tsx        # roda timer global + por questão; autosave 15s
  routes: src/routes/assessments.routes.tsx (lazyWithRetry, ModuleRoute slug='assessments')
  public route em public.routes.tsx: /q/:token (globalClient, sem BU)
```

Sidebar: novo item "Assessments" gated por `assessments.forms.view:bu`. Adicionar `/q` em `PUBLIC_PATHS`.

Query keys em `src/lib/queryKeys/assessments.ts` (helpers `assessments.list`, `assessments.byId`, `assessments.invites.byAssessment`, etc.).

## 5. Fluxo público (sem login)

1. URL `/q/:token` → `PublicAssessmentEntry` chama RPC `rpc_assessment_invite_lookup(token)` → retorna `assessment` + `invite_status` + flags.
2. Respondente confirma CPF (digitado), nome e aceita termo de antifraude.
3. RPC `rpc_assessment_run_start(token, cpf)` cria/recupera `run` (idempotente).
4. Runner: timer total = somatório `time_limit_seconds`; timer por questão (avança ao esgotar); autosave a cada 15s e em `blur` via RPC `rpc_assessment_answer_upsert`.
5. Submissão via `rpc_assessment_run_submit` → status `submitted`, congelado.

Todos os RPCs `SECURITY DEFINER`, validam `token + cpf + expires_at`, usam `globalClient` (PRE-BU). Nenhum endpoint admin exposto publicamente.

## 6. Antifraude observacional

`LockedTextarea`:
- `onPaste`/`onDrop`/`onContextMenu` → `preventDefault` + incrementa contadores.
- Heurística: salto de >50 chars entre keystrokes consecutivos = `paste_attempt` provável.
- `document.visibilitychange` → conta tab-switches >10s; pausa cronômetro de "tempo ativo" (cronômetro do limite **não pausa**).
- Atalhos comuns (Ctrl/Cmd+V/C/X, F12) interceptados no nível do form.

Tudo gravado em `assessment_runs` (totais) e `assessment_answers` (por questão). Resultado mostra badge **"Sinais de risco"** ao avaliador, sem invalidar automaticamente.

Aviso explícito antes de iniciar: "Este questionário registra colagem, troca de aba e tempo. Os dados serão analisados pelo avaliador."

## 7. Temas, níveis e composição

- `assessment_themes`: catálogo livre por BU.
- `assessment_forms.level`: inteiro por BU (1=estagiário, 2=analista...). Rótulos configuráveis em `bu_settings.assessment_levels` (jsonb `{1:"Estagiário",2:"Analista"}`).
- `AssessmentBuilderPage` permite arrastar forms publicados; cada item registra `version_id` (snapshot). Mudar versão depois exige editar a prova.

## 8. Migração do Pippi

O caso Pippi vira **uma prova** com **um form** ("Autoavaliação Estratégica") em uma BU específica + um convite emitido para o CPF de Guilherme. Sem código dedicado; sem rota `/tools/pippi`. Plano anterior é descartado.

## 9. Entregáveis e ordem

1. Migration: enums, tabelas, índices, RLS, RPCs públicos, trigger CPF↔profile, registro em `modules`.
2. Permission keys + atualização de templates (RBAC v2).
3. Camada de dados (hooks com `globalClient`/`buScopedClient` corretos, query keys).
4. Páginas admin (forms → editor → prova → convites → resultados).
5. Fluxo público `/q/:token` + `LockedTextarea` + telemetria.
6. Sidebar + módulo + rota lazy + `PUBLIC_PATHS`.
7. Documentar em `docs/canonical/ASSESSMENTS_MODULE.md` e atualizar TCR + DATA_MODEL_REGISTRY + memória.

## 10. Fora do escopo (v1)

- Auto-correção/scoring/gabarito (v2: adicionar `expected_answer`/`rubric` no `assessment_form_questions`).
- Proctoring com webcam/screen-share.
- OTP por email/SMS.
- Trilhas formais de progressão (estagiário→analista→sênior) — modelado como nível livre + composição manual; trilha estruturada fica para v2.
