> **Pré-checklist:** ✅ TCR, IDENTITY_CONVENTION, DATA_MODEL_REGISTRY, PERMISSIONS_AND_RBAC_MODEL, PRE_CHECKLIST consultados. Reuso obrigatório de `BuUserMultiSelect`, `MultiTeamSelect`, `useBuUsersDirectory`. Schema `assessment_invites` já tem `invitee_cpf` (NOT NULL), `invitee_profile_id`, `invitee_name`, `invitee_email` — sem migration necessária.

## Objetivo

No detalhe do assessment (`/assessments/provas/:id`, aba **Convites**), substituir o diálogo "1 CPF por vez" por um fluxo com 2 abas:

- **Internos** — seleção em massa (individual e por time) usando os componentes canônicos.
- **Externos** — manual (CPF + nome + email), como hoje, mas com máscara/validação via `cpfZodSchema`.

Sem novos componentes de seleção. Sem alteração de schema. Sem mexer em externos do hub.

---

## 1. Reuso (sem duplicar)

| Necessidade | Componente/hook canônico |
|---|---|
| Selecionar múltiplos internos | `BuUserMultiSelect` (`excludeExternal`, `teamId`) |
| Filtrar por time | `TeamSelect` (single) — alimenta `teamId` do componente acima |
| Listar perfis da BU | `useBuUsersDirectory` (já usado pelo MultiSelect) |
| Validar CPF de externos | `cpfZodSchema` / `maskCpfInput` (`src/lib/validation/cpf.ts`) |
| Mutation de criação | `useCreateInvite` (estendida — ver §3) |

---

## 2. UI — `AssessmentDetailPage > InvitesTab`

Substituir o `<Dialog>` atual por um diálogo com `Tabs` (`internal` | `external`):

### Aba "Internos"
- `TeamSelect` opcional ("Filtrar por time") → reduz a lista do MultiSelect.
- `BuUserMultiSelect` com `excludeExternal=true`, `teamId={teamFilter}`, `includeSubteams`, `excludeUserIds={profileIdsJaConvidados}` (perfis com convite ativo no assessment, evita duplicatas óbvias).
- Resumo: "X usuários selecionados" + lista compacta com avisos:
  - ⚠ "Sem CPF cadastrado — preencha no perfil" (bloqueia inclusão desse usuário).
  - ⚠ "Já possui convite ativo" (apenas info — quando `excludeUserIds` não pegar por race).
- Botão **Criar N convites** (desabilitado se nenhum válido).

### Aba "Externos"
- 1 linha por convidado (CPF mascarado + nome + email), botão "+ Adicionar mais um".
- Validação inline com `cpfZodSchema`. Bloqueia duplicatas dentro da própria lista.
- Botão **Criar N convites**.

Mensagens de erro/sucesso consolidadas em um único toast por lote ("3 convites criados, 1 falhou: CPF duplicado").

---

## 3. Hook — estender `useCreateInvite` para lote

Adicionar `useCreateInvitesBatch` em `src/modules/assessments/hooks/useAssessmentsData.ts`:

- Input: `{ assessment_id, invites: Array<{ invitee_profile_id?: string; invitee_cpf: string; invitee_name?: string; invitee_email?: string }> }`.
- Para internos vindos da UI (apenas `profile_id`), o hook resolve `cpf`/`display_name`/`work_email` via `select("id, cpf, display_name, work_email").in("id", ids)` em `profiles` — filtra fora os sem CPF e devolve no resultado para a UI exibir.
- `insert` em lote (`.insert(rows).select("id")`) com `bu_id`, `created_by = realProfileId`, `token` gerado por linha, `invitee_profile_id` preenchido para internos.
- Erros parciais: como `.insert([...])` é atômico, fazer pré-filtragem (sem CPF, duplicatas locais) e tratar `23505` retentando sem o(s) ofensor(es) — máximo 2 tentativas; reportar restantes ao usuário.
- Invalida `["assessments", "invites", buId, assessment_id]` 1x ao final.

`useCreateInvite` (singular) permanece para compatibilidade, agora delegando ao batch.

---

## 4. Validação e bloqueios

- Internos sem CPF em `profiles.cpf` → não são enviados ao DB; UI mostra ação "Editar perfil" linkando para `/users/:id`.
- CPF duplicado entre internos selecionados e externos digitados → bloqueio na UI antes do submit.
- Permissão: já gated por RLS `invites_insert` (`assessments.invite.create:bu`). Sem mudanças de RBAC.

---

## 5. Identidade & isolamento

- `invitee_profile_id` é FK para `profiles(id)` — alinhado com `IDENTITY_CONVENTION` (profile_id em FK de domínio).
- `created_by = realProfileId` (mantém comportamento atual; respeita impersonation via `useIdentity`).
- `bu_id = currentBuId` em todas as linhas (BU isolation mandatória).
- `useBuScopedSupabase` para todas as leituras/escritas; query keys via SSOT existente em `useAssessmentsData`.

---

## 6. Fora de escopo

- Importação CSV de convites em massa.
- Pré-vínculo retroativo entre `assessment_runs.respondent_cpf` e `profiles.cpf` no perfil do usuário.
- Alterar fluxo público (`PublicAssessmentRunner`) — convidado continua confirmando CPF normalmente.
- Notificação automática (in-app/email) ao convidado interno — fica para próxima fatia; por ora, link copiável continua igual.

---

## Entregáveis

1. `useCreateInvitesBatch` em `useAssessmentsData.ts` (resolução de CPF para internos, insert em lote, retry no 23505).
2. Refatorar `InvitesTab` em `AssessmentDetailPage.tsx`:
   - Diálogo "Novo convite" com `Tabs internos | externos`.
   - Aba internos: `TeamSelect` + `BuUserMultiSelect` (reuso 100%).
   - Aba externos: lista dinâmica com `maskCpfInput` + `cpfZodSchema`.
3. Sem novos componentes de seleção, sem nova migration, sem mexer em RLS.

