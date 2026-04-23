

## Hotfix: `search_bu_users_for_mention` rejeita usuários cuja BU é primária mas não tem membership

### Pré-checklist (executado)
- ✅ TCR §3.3.1 + `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/bu-isolation-master` — diretório canônico é `v_bu_active_profiles` (UNION primary + memberships)
- ✅ `docs/qa/QA_USER_DIRECTORY_GLOBAL_v2.md` — view une os dois caminhos
- ✅ `mem://architecture/security-privilege-policy` — `SECURITY DEFINER` com guard explícito
- ✅ Reproduzido o erro real no banco: `ERROR: P0001: not authorized` (linha 9 da função)

### Causa raiz (confirmada via DB)

A função `search_bu_users_for_mention` faz:
```sql
IF NOT public.is_profile_bu_member(my_profile_id(), p_bu_id) THEN
  RAISE EXCEPTION 'not authorized';   -- ← PostgREST devolve 400
END IF;
```

`is_profile_bu_member` checa **apenas** `bu_user_memberships`. Mas o diretório canônico (`v_bu_active_profiles`) une **dois caminhos**:
1. Usuários com entry em `bu_user_memberships`
2. Usuários cuja BU é a primária (`profiles.bu_id`) sem entry duplicada em memberships

**Dados reais na BU `a0...001`**: 76 usuários no diretório, 74 via membership, **7 via primary-only sem membership**. Esses 7 usuários conseguem ver o diretório (via RLS de `profiles`/view), mas a RPC os rejeita com 400 — eles não conseguem mencionar ninguém, **mesmo dentro da própria BU primária**.

Mesma lógica defeituosa também afeta `search_mention_candidates` (tickets), que usa o mesmo `is_profile_bu_member` como gate. Por isso o sintoma "Nenhum usuário encontrado" + 400 é intermitente entre usuários: depende de qual caminho o profile do solicitante segue.

### Correção (1 migration, sem mudança de RLS)

Criar uma função canônica `is_profile_bu_member_or_primary(p_profile_id, p_bu_id)` que reflete o diretório:

```sql
CREATE OR REPLACE FUNCTION public.is_profile_bu_member_or_primary(
  p_profile_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships m
    WHERE m.profile_id = p_profile_id
      AND m.bu_id = p_bu_id
      AND m.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_profile_id
      AND p.bu_id = p_bu_id
      AND p.deleted_at IS NULL
      AND p.employment_status <> 'terminated'
  );
$$;
```

Atualizar `search_bu_users_for_mention` para usar essa função:
```sql
-- antes:
IF NOT public.is_profile_bu_member(v_profile_id, p_bu_id) THEN
-- depois:
IF NOT public.is_profile_bu_member_or_primary(v_profile_id, p_bu_id) THEN
```

Atualizar também `search_mention_candidates` (mesmo fix; mesma raiz).

### Por que essa abordagem
- **Alinhamento canônico**: a checagem de autorização passa a refletir o diretório (`v_bu_active_profiles`). SSOT semântico.
- **Defesa preservada**: continua bloqueando cross-BU para quem não pertence a nenhum dos dois caminhos.
- **Zero mudança em RLS, schema, ou frontend**.
- **Não derruba `is_profile_bu_member` original**: continua existindo e em uso por outras policies que conscientemente exigem membership explícita (ex: lideranças).
- **Resolve simultaneamente**: menções em projetos, OKRs e tickets para os 7+ usuários afetados (e qualquer novo usuário criado via fluxo "primary BU only").

### Validação pós-correção
1. Logar como um dos 7 usuários sem membership (BU `001`) → digitar `@th` em `/projects/98074a55-...` → dropdown lista usuários internos da BU.
2. Tentar invocar `search_bu_users_for_mention` para uma BU **diferente** da primária e sem membership → continua retornando `not authorized` (segurança preservada).
3. Sanity check: usuários com membership tradicional continuam funcionando (ambos os ramos do OR cobrem).
4. Sanity check tickets: `search_mention_candidates` também passa a aceitar usuários primary-only.
5. Sem regressão em `useSoftDeleteProject`, criação de projetos, RLS de `projects`.

### Arquivos afetados
- **1 migration SQL**:
  - CREATE FUNCTION `public.is_profile_bu_member_or_primary`
  - CREATE OR REPLACE FUNCTION `public.search_bu_users_for_mention` (troca da checagem)
  - CREATE OR REPLACE FUNCTION `public.search_mention_candidates` (troca da checagem)
- Nenhum arquivo TS alterado. `types.ts` permanece válido (assinatura intacta).

### Documentação canônica
- Nota no changelog do TCR: "hotfix RPCs de menção — autorização agora reflete `v_bu_active_profiles` (membership OU primary BU). Resolve 400 'not authorized' para usuários sem membership explícita na própria BU primária."
- Atualizar `mem://standards/bu-isolation-master`: gates de RPC sensíveis a diretório devem usar `is_profile_bu_member_or_primary`, não `is_profile_bu_member`.

### Princípios respeitados
- BU isolation preservada (cross-BU sem vínculo continua bloqueado)
- Sem `select('*')`, sem CHECK constraint, sem mudança de RLS
- Soft-delete respeitado (`deleted_at IS NULL` em ambos os ramos)
- Componentes/hooks frontend centralizados — zero duplicação

