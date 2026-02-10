
# Correção: Isolamento de BU na Listagem de Usuários e Página de Times

## Problema Raiz

A função SQL `is_current_bu()` retorna `true` para platform admins (super_admin), bypassing completamente a verificação de BU. Isso causa dois efeitos colaterais:

1. **Na lista de usuários** (`/users`): O RPC `get_bu_users_by_membership` faz `LEFT JOIN teams t ON p.team_id = t.id` sem filtro de BU. Para admins, o RLS permite ler times de qualquer BU, então perfis com `team_id` de outra BU (ex: Jet XP) exibem o nome do time corretamente -- quando não deveriam, pois o time pertence a outra BU.

2. **Na página de detalhe do time** (`/teams/:id`): O hook `useTeam()` busca o time apenas por ID, sem validar se pertence à BU atual. Para admins, o RLS permite acesso. Para não-admins, aparece "Time não encontrado".

### Dados Afetados

2 perfis na BU Jetimob têm `team_id` apontando para o time "Jet XP" (BU Jet Experience):
- João Victor Ehlers Machado (`1bc39f88-...`)
- Tania Raquel Florencianez Melgarejo (`b114dbfa-...`)

---

## Solução Proposta

### Passo 1: Corrigir o RPC `get_bu_users_by_membership`

Adicionar filtro de BU no LEFT JOIN de teams para garantir que apenas times da mesma BU sejam resolvidos:

```sql
-- DE:
LEFT JOIN teams t ON p.team_id = t.id
-- PARA:
LEFT JOIN teams t ON p.team_id = t.id AND t.bu_id = p_bu_id
```

Isso garante que, mesmo para admins, o nome do time só aparece se o time pertencer à BU sendo consultada. Perfis com `team_id` de outra BU mostrarão o campo "time" como vazio (comportamento correto).

### Passo 2: Adicionar validação de BU no `useTeam()` (frontend)

Após carregar o time, verificar se `team.bu_id` corresponde à BU atual do contexto. Se não corresponder, tratar como "não encontrado" ou redirecionar para a BU correta.

Opções:
- **Opção A (simples)**: Mostrar "Time não encontrado" se o time não pertence à BU atual
- **Opção B (melhor UX)**: Mostrar aviso com link para trocar de BU (similar ao `ResolveContextPage`)

Recomendo a **Opção A** por ser mais segura e consistente com o princípio de isolamento de BU.

### Passo 3: Decisão sobre os `team_id` dos perfis cross-BU

Os 2 perfis mencionados pertencem à BU Jetimob mas têm `team_id` de um time na BU Jet Experience. Isso pode ser:
- **Correto**: se esses perfis têm membership em ambas as BUs e o time é válido na BU Jet Experience
- **Incorreto**: se o `team_id` deveria apontar para um time da BU Jetimob

Isso precisa de confirmação do usuário antes de alterar os dados.

---

## Detalhes Técnicos

### Migração SQL (Passo 1)

```sql
CREATE OR REPLACE FUNCTION public.get_bu_users_by_membership(
  p_bu_id uuid,
  p_search text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  work_email text,
  photo_url text,
  city text,
  state text,
  work_mode text,
  employment_status text,
  job_title_id uuid,
  job_title_name text,
  team_id uuid,
  team_name text,
  manager_user_id uuid,
  role_in_bu text,
  is_default boolean,
  total_count bigint
)
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  WITH filtered_members AS (
    SELECT 
      p.id as profile_id,
      p.user_id,
      p.first_name,
      p.last_name,
      p.display_name,
      p.work_email,
      p.photo_url,
      p.city,
      p.state,
      p.work_mode::text,
      p.employment_status::text,
      p.job_title_id,
      jt.name as job_title_name,
      p.team_id,
      t.name as team_name,
      p.manager_user_id,
      m.role_in_bu::text,
      m.is_default,
      COUNT(*) OVER() as total_count
    FROM bu_user_memberships m
    JOIN profiles p ON m.profile_id = p.id
    LEFT JOIN job_titles jt ON p.job_title_id = jt.id
    LEFT JOIN teams t ON p.team_id = t.id AND t.bu_id = p_bu_id
    WHERE m.bu_id = p_bu_id
      AND m.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (
        p_search IS NULL
        OR p.display_name ILIKE '%' || p_search || '%'
        OR p.work_email ILIKE '%' || p_search || '%'
        OR COALESCE(jt.name, '') ILIKE '%' || p_search || '%'
      )
      AND (p_team_id IS NULL OR p.team_id = p_team_id)
      AND (
        p_status = 'all'
        OR (p_status = 'active' AND p.employment_status::text != 'terminated')
        OR (p_status != 'all' AND p_status != 'active' AND p.employment_status::text = p_status)
      )
    ORDER BY p.display_name NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT * FROM filtered_members;
END;
$$;
```

A unica mudança é na linha do LEFT JOIN: `AND t.bu_id = p_bu_id`.

### Frontend - useTeam (Passo 2)

No hook `useTeam` em `src/modules/teams/hooks/useTeams.ts`, adicionar verificação de `bu_id` do time contra a BU atual. Se divergir, retornar `null` (fazendo a página mostrar "Time não encontrado").

### Arquivos Modificados

1. **Migração SQL**: Atualizar `get_bu_users_by_membership` com filtro de BU no JOIN
2. **`src/modules/teams/hooks/useTeams.ts`**: Adicionar validação de BU no `useTeam()`
