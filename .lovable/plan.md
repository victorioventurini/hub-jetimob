## Diagnóstico confirmado (pós-checklist canônico)

**Erro real (Postgres):** `COALESCE types text and project_status cannot be matched`
**Local:** `public.update_project_v2`, linha 153 da migração `20260424205425_...sql`
**Causa:** `NULLIF(p_payload->>'status','')` retorna `text`, mas a coluna `projects.status` é do enum `project_status`. O `COALESCE` exige tipos compatíveis em todos os ramos.

**Por que afeta a Natalia:** ela é owner do projeto `ab89e575-...` → autorização passa (linha 134), mas o `UPDATE` falha no parser antes mesmo de aplicar mudanças. Qualquer usuário (admin, leader, owner) cai no mesmo erro ao salvar edição que envie o campo `status`.

## Verificação canônica (pré-checklist concluído)
- ✅ `DATA_MODEL_REGISTRY.md` linha 264 → confirma enum `project_status`
- ✅ `mem://features/projects/holistic-module-architecture-v2` → RBAC V2 inalterado
- ✅ `IDENTITY_CONVENTION` → função já usa `my_profile_id()` corretamente
- ✅ `BU_SCOPED_SUPABASE_RULES` → SECURITY DEFINER lê `bu_id` do registro (correto)
- ✅ `CHECK_CONSTRAINT_PROHIBITION` → solução respeita uso de enum (sem CHECK)
- ✅ `useProjectMutations.ts` → frontend já envia `status` como string; nenhum ajuste necessário

## Mudança proposta (cirúrgica, 1 linha)

Nova migração `supabase/migrations/<timestamp>_fix_update_project_v2_status_cast.sql`:

```sql
-- Fix: cast explícito do status text → project_status no UPDATE
CREATE OR REPLACE FUNCTION public.update_project_v2(p_project_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_actor_profile uuid;
  v_bu_id uuid;
  v_owner_id uuid;
  v_deleted_at timestamptz;
  v_authorized boolean := false;
BEGIN
  -- (mesmo corpo de validação/autorização da v1.6)
  ...
  UPDATE projects
     SET
       name         = COALESCE(NULLIF(p_payload->>'name', ''), name),
       description  = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description','') ELSE description END,
       owner_id     = CASE WHEN p_payload ? 'owner_id' AND NULLIF(p_payload->>'owner_id','') IS NOT NULL
                           THEN (p_payload->>'owner_id')::uuid ELSE owner_id END,
       status       = COALESCE(
                        NULLIF(p_payload->>'status','')::public.project_status,  -- ← CAST adicionado
                        status
                      ),
       start_date   = CASE WHEN p_payload ? 'start_date' THEN NULLIF(p_payload->>'start_date','')::date ELSE start_date END,
       due_date     = CASE WHEN p_payload ? 'due_date'   THEN NULLIF(p_payload->>'due_date','')::date   ELSE due_date END,
       external_url = CASE WHEN p_payload ? 'external_url' THEN NULLIF(p_payload->>'external_url','') ELSE external_url END
   WHERE id = p_project_id;

  RETURN jsonb_build_object('ok', true, 'code', 'UPDATED', 'project_id', p_project_id, 'bu_id', v_bu_id);
END;
$$;

COMMENT ON FUNCTION public.update_project_v2(uuid, jsonb) IS
'v1.7 — Fix cast text→project_status no COALESCE de status. Demais regras inalteradas.';
```

## Frontend
**Nenhuma alteração necessária.** `useProjectMutations.ts` já envia `status` como string conforme contrato.

## Validação pós-deploy
1. Reproduzir cenário da Natalia: editar projeto `ab89e575-0b55-44c1-8461-35beea8c38a5` alterando qualquer campo (com ou sem mudar status) → deve retornar `{ ok: true, code: 'UPDATED' }`.
2. Conferir nos logs do Postgres que não há mais `COALESCE types ... cannot be matched`.
3. Smoke test: editar status (`planned → in_progress`) por owner, por leader, por admin.

## Risco
**Baixíssimo.** Mudança isolada em 1 expressão SQL, sem alterar autorização, whitelist de campos ou contrato da RPC. Não toca em RLS, triggers ou frontend.
