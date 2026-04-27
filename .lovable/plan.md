## Contexto

Em `/projects/:id`, ao tentar remover uma milestone via menu de ações, o usuário (Victorio, admin da BU Jetimob) recebeu o toast genérico "Erro ao remover milestone".

### Diagnóstico (pré-checklist canônico executado)

Consultei: `TECHNICAL_CONTEXT_REGISTRY.md`, `PERMISSIONS_AND_RBAC_MODEL.md`, `IDENTITY_CONVENTION.md`, `DATA_MODEL_REGISTRY.md`, `mem://features/projects/milestone-permissions-row-aware`, `mem://standards/soft-delete-policy-v1`.

Inspecionei o estado atual no banco:

- `useSoftDeleteMilestone` faz `UPDATE project_milestones SET deleted_at=now() WHERE id=?` — não usa `.select().single()`, então RLS bloqueando não dispara erro (apenas 0 rows). Logo o erro vem de uma exceção real (não de policy).
- Policies atuais em `project_milestones`:
  - `UPDATE`: permite `owner_id = my_profile_id()` OU (project owner OR bu admin OR líder OR `projects.milestone.update:bu`).
  - `DELETE`: somente (project owner OR bu admin OR líder OR `projects.milestone.delete:bu`).
- Triggers ativos em UPDATE: `enforce_bu_scope`, `validate_project_milestone_dates` (UPDATE OF start/due_date — não dispara em soft delete), `validate_milestone_name_length` (UPDATE OF name — não dispara), `update_updated_at_column`, `notify_milestone_status_changed` (early return quando status não muda).
- Victorio é admin, e os milestones desse projeto são reais; deveria conseguir remover. O toast genérico esconde a causa real (`onError` apenas faz `console.error` + toast fixo).

### Problema secundário (canônico violado)

A policy `UPDATE` permite o **milestone owner** alterar qualquer campo, inclusive `deleted_at`. Isso permite que o milestone owner faça soft-delete, contradizendo o canônico ("apenas o responsável pelo projeto pode remover"). Hoje a defesa está só na UI (helper `canDeleteMilestoneRecord`), sem barreira no DB.

---

## Mudanças propostas

### 1) Hook `useSoftDeleteMilestone` — diagnóstico + sucesso explícito

`src/modules/projects/hooks/useMilestoneMutations.ts`:

- Trocar `.update({ deleted_at })` por `.update({ deleted_at }).eq('id', id).eq('bu_id', ...)`. O `bu_id` precisa vir como parâmetro (defesa em profundidade — alinhado a `mem://standards/cross-bu-isolation-pattern`).
- Adicionar `.select('id, project_id')` (sem `.single()`) e validar que `data?.length === 1`. Se `0`, lançar erro `"Sem permissão para remover esta milestone"` (caso RLS bloqueie silenciosamente).
- `onError`: incluir `error.message` no toast (ex: `Erro ao remover milestone: ${msg}`) para revelar a causa real em produção.
- `onSuccess`: adicionar `toast.success("Milestone removido")` (hoje não há feedback de sucesso).

### 2) Página `ProjectDetailPage.tsx`

- `handleMilestoneDelete` passa `bu_id` para o hook (`project.bu_id`).

### 3) Migration RLS — endurecer regras de soft-delete

Nova migration:

- Recriar policy `project_milestones_update` segregando o caminho do milestone owner: ele pode editar **tudo exceto `deleted_at`**. O caminho via project owner / admin / líder / `update:bu` permanece amplo.
- Implementação canônica (não usa CHECK constraint — segue `mem://standards/database/check-constraint-prohibition`): trigger `BEFORE UPDATE` `enforce_milestone_soft_delete_authority` que, quando `OLD.deleted_at IS DISTINCT FROM NEW.deleted_at`, valida que `auth.uid()` é admin da BU OU project owner OU líder do project owner OU tem `projects.milestone.delete:bu`. Caso contrário: `RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE: only the project owner can remove milestones' USING ERRCODE='42501'`.
- Documentar a regra como SSOT no `mem://features/projects/milestone-permissions-row-aware` (atualizar).

### 4) Atualização de documentação canônica

- **`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`** (TCR): atualizar a seção de Projects/Milestones com a regra de autoridade de soft-delete (apenas project owner/admin/líder podem remover; milestone owner pode editar tudo exceto `deleted_at`).
- **`docs/canonical/DATA_MODEL_REGISTRY.md`**: atualizar a entrada de `project_milestones` adicionando o trigger `enforce_milestone_soft_delete_authority` e a regra row-aware das policies.
- **`docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`**: documentar a separação `update:self_or_owner` (milestone owner edita) vs `delete:bu`/project ownership (remoção).
- **`supabase/functions/_shared/tcr/modules.ts`** (TCR servido para AI/ChatGPT): incluir a mesma regra na seção `modules`/`projects` e bumpar `TCR_VERSION` em `supabase/functions/_shared/tcr/index.ts` para `3.29.0` com `TCR_UPDATED_AT = "2026-04-27"`.
- **`mem://features/projects/milestone-permissions-row-aware`** (memory file): adicionar seção "Defesa no DB" descrevendo o trigger e o erro `42501` esperado quando milestone owner tenta remover.
- **`mem://index.md`**: bumpar a descrição da entrada existente (`Milestone Permissions Row-Aware`) para refletir o trigger no DB.

### 5) Sem mudanças necessárias

- `useProjectPermissionsV2.ts` (gating UI já está correto).
- `MilestonesTable.tsx` (render OK; o ajuste de grid e notas-row já foi entregue).
- Query keys / soft-delete filter já obedecem aos canônicos.

---

## Arquivos afetados

| Arquivo | Tipo |
|---|---|
| `src/modules/projects/hooks/useMilestoneMutations.ts` | Edit |
| `src/modules/projects/pages/ProjectDetailPage.tsx` | Edit (1 linha — passa `bu_id`) |
| `supabase/migrations/<timestamp>_milestone_soft_delete_authority.sql` | Novo |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Edit |
| `docs/canonical/DATA_MODEL_REGISTRY.md` | Edit |
| `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` | Edit |
| `supabase/functions/_shared/tcr/modules.ts` | Edit |
| `supabase/functions/_shared/tcr/index.ts` | Edit (version bump) |
| `mem://features/projects/milestone-permissions-row-aware` | Edit |
| `mem://index.md` | Edit |

---

## Canônicos respeitados

- `mem://standards/cross-bu-isolation-pattern` — `bu_id` no `.eq()` da mutation.
- `mem://standards/database/check-constraint-prohibition` — trigger ao invés de CHECK.
- `mem://standards/soft-delete-policy-v1` — soft-delete via `deleted_at`, com autoridade clara.
- `mem://standards/query-optimization-standard` — `.select('id, project_id')` explícito.
- `mem://features/projects/milestone-permissions-row-aware` — atualizado para refletir defesa em DB.
- `IDENTITY_CONVENTION.md` — `my_profile_id()` continua sendo o caminho correto; nenhuma comparação `auth.uid()` x coluna de domínio.

---

## Resultado esperado

1. Tentar remover milestone como project owner / admin / líder → sucesso, com toast `"Milestone removido"`.
2. Tentar remover milestone como milestone owner (não project owner) → erro DB `42501`, traduzido em toast `"Erro ao remover milestone: only the project owner can remove milestones"` (mensagem útil em vez de genérica).
3. Caso RLS bloqueie (ex: bug de gating), o hook agora detecta `0 rows` e mostra toast com mensagem específica em vez de "sucesso silencioso".

Posso prosseguir?