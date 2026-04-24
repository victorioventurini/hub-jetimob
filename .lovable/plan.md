# Plano: Responsável obrigatório em Milestones

## Conformidade prévia (TCR + canônicos)
- ✅ `DATA_MODEL_REGISTRY` — `project_milestones.owner_id` é nullable hoje; alteração para NOT NULL é compatível após backfill.
- ✅ `IDENTITY_CONVENTION` — `owner_id` referencia `profiles.id` (nunca `auth.users.id`).
- ✅ Soft-delete v1.1 — backfill respeita `deleted_at IS NULL`.
- ✅ BU Isolation — DDL é cross-BU mas backfill usa join por `project_id` (cada projeto carrega seu `bu_id`).
- ✅ Memória `holistic-module-architecture-v2` será atualizada para refletir nova invariante.

## 1. Migração SQL
- **Backfill** (idempotente):
  ```sql
  UPDATE public.project_milestones pm
  SET owner_id = p.owner_id, updated_at = now()
  FROM public.projects p
  WHERE pm.project_id = p.id
    AND pm.owner_id IS NULL
    AND p.owner_id IS NOT NULL;
  ```
- **Constraint**:
  ```sql
  ALTER TABLE public.project_milestones
    ALTER COLUMN owner_id SET NOT NULL;
  ```
- Sem CHECK constraints (segue `check-constraint-prohibition`).

## 2. Tipos (`src/modules/projects/types.ts`)
- `ProjectMilestone.owner_id`: `string | null` → `string`.
- `CreateMilestoneInput.owner_id`: `string | null | undefined` → `string` (obrigatório).
- `UpdateMilestoneInput.owner_id`: `string | null | undefined` → `string | undefined` (não pode ser limpo, mas pode ser trocado).
- `ProjectForWizard.milestones[].owner_id`: ajustar para `string`.

## 3. Hook de mutações (`useMilestoneMutations.ts`)
- `useCreateMilestone`: validar `if (!input.owner_id) throw new Error('Responsável é obrigatório')` antes do insert; remover fallback `?? null`.
- `useUpdateMilestone`: se `owner_id` vier no payload, validar não-null.

## 4. UI — Criação (`MilestoneCreateForm.tsx`)
- `ownerId` passa de `string | null` para `string | undefined`.
- `canSubmit` inclui `!!ownerId`.
- `BuUserSelect`: `allowNone={false}`, remover `noneLabel`.
- Estilo destacado (border destructive até preencher), igual aos campos de data.
- `onSubmit` recebe `owner_id: string` (não-null).

## 5. UI — Edição inline (`MilestoneList.tsx`)
- `BuUserSelect` na linha 197: `allowNone={false}`, remover `noneLabel="Sem responsável"`.
- Tipo de `onUpdate.owner_id`: `string` (não `string | null`).
- Remover branches que tratam `m.owner_id === null` (linhas ~50, exibição de "Sem responsável").

## 6. Callers de criação
- `MilestoneCreateForm` consumidores (ex: página de detalhe do projeto): garantir que passam `owner_id` no `useCreateMilestone.mutate`.
- Buscar com `rg "useCreateMilestone|MilestoneCreateForm" src/` e ajustar adapters se houver default `null`.

## 7. Documentação
- `mem://features/projects/holistic-module-architecture-v2`: adicionar invariante "Milestones têm owner obrigatório (NOT NULL no DB; UI bloqueia criação sem responsável). Backfill 2026-04-24 usou `project.owner_id` como fallback."

## 8. Validação
- `tsc --noEmit` para garantir tipos consistentes em todos os callers.
- Smoke test mental: criar milestone sem owner → bloqueado; editar e tentar limpar owner → opção indisponível; carregar milestone existente backfilled → mostra owner herdado do projeto.

## Arquivos afetados
- `supabase/migrations/<timestamp>_milestones_owner_required.sql` (nova)
- `src/modules/projects/types.ts`
- `src/modules/projects/hooks/useMilestoneMutations.ts`
- `src/modules/projects/components/MilestoneCreateForm.tsx`
- `src/modules/projects/components/MilestoneList.tsx`
- Eventuais callers descobertos via `rg`
- `.lovable/memory/features/projects/holistic-module-architecture-v2.md`
