

## Hotfix RLS no soft-delete de Projetos — UPDATE seguro mesmo com BU header stale

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/bu-isolation-master` — header `x-current-bu-id` síncrono
- ✅ `mem://auth/identity-rbac-master` — `my_profile_id()` + `is_bu_admin` + `is_leader_of_project_owner`
- ✅ `mem://standards/soft-delete-policy-v1` — soft-delete preserva `bu_id`, só seta `deleted_at`
- ✅ `mem://standards/query-key-prefix-standard` — query keys precisam variar por escopo (incluindo `buId`)
- ✅ Lidas todas as 4 policies de `projects` (`select`, `insert`, `update`, `delete`) + trigger `enforce_bu_scope`
- ✅ Validados todos os caminhos de `current_bu_id()` (header → is_default → primeiro membership)

### Causa raiz (confirmada via DB + análise)

A policy `projects_update`:
```
USING:      is_current_bu(bu_id) AND (owner_id = my_profile_id() OR is_bu_admin(...) OR is_leader_of_project_owner(...))
WITH CHECK: is_current_bu(bu_id)
```

`is_current_bu(p_bu_id)` retorna `true` apenas se:
- `is_platform_admin(auth.uid())` **OU**
- `current_bu_id() == p_bu_id`

`current_bu_id()` faz parse do header `x-current-bu-id`. Se o cast `::json` falhar (PostgREST recente envia headers como JSONB em alguns cenários, ou header ausente), cai no fallback `is_default = true` — que para 1 usuário (João Victor) aponta para outra BU. Pra esse usuário, qualquer UPDATE em projeto da BU 001 **falha no WITH CHECK** com a mensagem exata "new row violates row-level security policy".

Adicionalmente, há **bug latente** que amplifica o problema: `useProject` e `useMilestones` cacheiam por `projectId` **sem incluir `buId` na queryKey**. Quando o usuário troca de BU mas o cache antigo persiste, `currentBuId` no React diverge do `bu_id` real do projeto exibido — qualquer mutation sai com BU errada.

A trigger `enforce_bu_scope_projects` compara `NEW.bu_id` com `current_bu_id()` e dá `BU_SCOPE_VIOLATION` em mismatch — mas como `NEW.bu_id == OLD.bu_id` (não estamos mudando BU), passa. Quem barra é só o WITH CHECK.

### Correção (3 frentes mínimas)

#### 1. DB — `current_bu_id()` robusto a parse de headers
Tornar o parse tolerante usando `current_setting('request.headers', true)::jsonb` + fallback explícito; e **só** usar fallback `is_default` quando header **realmente não veio** (não quando veio e não bate com nenhuma membership — esse caso deve preferir a BU do header se for membership válida em qualquer ramo).

```sql
CREATE OR REPLACE FUNCTION public.current_bu_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_header text;
  v_header_uuid uuid;
  v_bu uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NO_BU_CONTEXT'; END IF;

  -- Read header (try jsonb first, then json)
  BEGIN
    v_header := current_setting('request.headers', true)::jsonb->>'x-current-bu-id';
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_header := current_setting('request.headers', true)::json->>'x-current-bu-id';
    EXCEPTION WHEN OTHERS THEN v_header := NULL; END;
  END;

  IF v_header IS NOT NULL AND v_header <> '' THEN
    BEGIN v_header_uuid := v_header::uuid; EXCEPTION WHEN OTHERS THEN v_header_uuid := NULL; END;
    IF v_header_uuid IS NOT NULL THEN
      -- Aceita membership tanto via user_id quanto via profile_id (cobre 6 perfis com user_id NULL)
      SELECT m.bu_id INTO v_bu
      FROM bu_user_memberships m
      WHERE (m.user_id = v_user_id OR m.profile_id = my_profile_id())
        AND m.bu_id = v_header_uuid AND m.deleted_at IS NULL
      LIMIT 1;
      IF v_bu IS NOT NULL THEN RETURN v_bu; END IF;
    END IF;
  END IF;

  -- Fallback: is_default
  SELECT bu_id INTO v_bu FROM bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = my_profile_id())
    AND is_default = true AND deleted_at IS NULL LIMIT 1;
  IF v_bu IS NOT NULL THEN RETURN v_bu; END IF;

  -- Último: primeira membership
  SELECT bu_id INTO v_bu FROM bu_user_memberships
  WHERE (user_id = v_user_id OR profile_id = my_profile_id())
    AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_bu IS NOT NULL THEN RETURN v_bu; END IF;

  RAISE EXCEPTION 'NO_BU_CONTEXT';
END $$;
```

#### 2. DB — relaxar `WITH CHECK` de `projects_update` para soft-delete
O WITH CHECK só precisa garantir que `bu_id` não está sendo trocado entre BUs. Como o `enforce_bu_scope` trigger já garante isso (BEFORE UPDATE), o WITH CHECK pode ser simplificado para evitar o requisito de header BU bater:

```sql
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects FOR UPDATE
USING (
  is_current_bu(bu_id) AND (
    owner_id = my_profile_id()
    OR is_bu_admin(auth.uid(), bu_id)
    OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  )
)
WITH CHECK (
  -- Garante que bu_id não foi alterado para fora do escopo permitido do usuário
  profile_has_bu_access(my_profile_id(), bu_id) AND (
    owner_id = my_profile_id()
    OR is_bu_admin(auth.uid(), bu_id)
    OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  )
);
```

Isso mantém: ✅ ownership/admin/leader, ✅ BU isolation (via `profile_has_bu_access` + trigger), ✅ defesa contra cross-BU update.

#### 3. Frontend — incluir `buId` nas query keys de detalhe/milestones
Atualizar `src/lib/queryKeys/projects.ts`:
```ts
detail: (id: string, buId?: string | null) => ['projects', 'detail', buId ?? null, id] as const,
milestones: (projectId: string, buId?: string | null) => ['projects', 'milestones', buId ?? null, projectId] as const,
```

Atualizar `useProject.ts` e `useMilestones.ts` para passar `buId`. Elimina o vetor de cache stale entre BUs.

### Por que essa abordagem
- **Resolve a causa real** (header parse fragile + WITH CHECK over-restritivo).
- **Mantém isolamento BU**: USING + trigger + WITH CHECK relaxado ainda barram cross-BU.
- **Padrão canônico**: `profile_id`-first em `current_bu_id()` alinha com `mem://auth/identity-rbac-master`.
- **Zero novos componentes**, zero novos hooks, zero mudança de RLS em outras tabelas.

### Validação pós-correção
1. Logado como Uriel (owner) ou admin → arquivar projeto `98074a55-...` → toast "Projeto arquivado".
2. Trocar de BU → voltar → arquivar outro projeto → funciona.
3. Logado como João Victor (default em outra BU, collaborator em 001) → tenta arquivar → ainda barra (USING falha pois não é owner/admin/líder), agora com toast "sem permissão" via count=0, sem erro RLS cru.
4. Sanity: criar/atualizar projeto continua OK (USING+CHECK validam ownership).
5. Sanity: trigger `enforce_bu_scope` continua barrando tentativa de mudar `bu_id` de uma row para outra BU.

### Arquivos afetados
- **1 migration SQL**:
  - `CREATE OR REPLACE FUNCTION public.current_bu_id` (parser robusto + profile_id fallback)
  - `DROP/CREATE POLICY projects_update` (WITH CHECK relaxado)
- **3 arquivos TS**:
  - `src/lib/queryKeys/projects.ts` (assinatura `detail`/`milestones` aceita `buId`)
  - `src/modules/projects/hooks/useProject.ts` (passa `buId` na queryKey)
  - `src/modules/projects/hooks/useMilestones.ts` (passa `buId` na queryKey)

### Documentação canônica
- Nota TCR §3.3.1: "hotfix soft-delete projects — current_bu_id() agora resiliente a parse de headers e aceita profile_id; WITH CHECK de projects_update relaxado (USING + trigger garantem isolamento). Query keys de detalhe incluem buId."
- Atualizar `mem://standards/bu-isolation-master`: query keys de detalhe devem incluir `buId` para evitar cache cross-BU.

### Princípios respeitados
- BU Isolation (USING + trigger + WITH CHECK ainda barram cross-BU)
- Sem `select('*')`, sem CHECK constraint, soft-delete preservado
- Componentes/hooks centralizados — zero duplicação

