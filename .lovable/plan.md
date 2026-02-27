

# Corrigir listagem de usuarios no modulo /users

## Problema

A pagina `/users` (`src/pages/Users.tsx`) usa a RPC `get_bu_users_by_membership` para listar usuarios (linha 133). Isso viola o padrao **User Directory Global v2** (TCR v2.13.0+) porque:

1. A RPC filtra por membership, excluindo usuarios que nunca fizeram login (sem `bu_user_memberships`)
2. Na linha 145, ha um filtro client-side `employment_status === 'active'` que exclui usuarios com status `vacation`

A usuaria andressa.goulart@jetimob.com pertence ao time de marketing (aparece no organograma), mas nao aparece em `/users` porque provavelmente nao tem membership ativa.

## Fonte de verdade consultada

- **TCR v2.13.0+**: "User Directory Global v2 consolidado: View canonica `v_bu_active_profiles` como fonte unica. Hooks: `useBuUsersDirectory`"
- **QA_USER_DIRECTORY_GLOBAL_v2.md**: View nunca depende de `bu_user_memberships` para incluir profiles
- **Padrao canonico**: `useBuUsersDirectory` ja implementa a query correta

## Solucao

Substituir a chamada RPC `get_bu_users_by_membership` por query direta na view `v_bu_active_profiles`, e remover o filtro client-side redundante.

## Alteracoes

### Arquivo: `src/pages/Users.tsx` (linhas 107-206)

**1. Substituir a queryFn (linhas 132-145)**

Trocar a chamada RPC por query na view canonica:

```typescript
let query = supabase
  .from("v_bu_active_profiles")
  .select(`
    id,
    user_id,
    display_name,
    first_name,
    last_name,
    work_email,
    photo_url,
    team_id,
    team_name,
    job_title_id,
    job_title_name,
    employment_status,
    onboarding_completed,
    has_bu_membership,
    start_date,
    created_at,
    user_type
  `)
  .eq("bu_id", currentBu.id)
  .neq("employment_status", "terminated")
  .eq("user_type", "internal")
  .order("display_name")
  .limit(1000);

// Filtro de busca
if (qSearch) {
  const searchTerm = `%${qSearch}%`;
  query = query.or(`display_name.ilike.${searchTerm},work_email.ilike.${searchTerm}`);
}

// Filtro de time
if (qTeamId) {
  query = query.eq("team_id", qTeamId);
}

const { data, error } = await query;
if (error) throw error;

const rows = data || [];
```

**2. Remover filtro client-side (linha 145)**

A linha `const rows = (data || []).filter(...)` com `employment_status === 'active'` sera removida. A view ja exclui terminated e o filtro na query e suficiente.

**3. Adaptar mapeamento de campos (linhas 165-201)**

Os campos da view usam `id` em vez de `profile_id`. O mapeamento sera ajustado:

```typescript
const profiles = rows.map((p) => ({
  id: p.id,           // era p.profile_id
  user_id: p.user_id,
  first_name: p.first_name,
  last_name: p.last_name,
  display_name: p.display_name,
  work_email: p.work_email,
  job_title_name: p.job_title_name || 'Sem cargo',
  job_title_id: p.job_title_id,
  photo_url: p.photo_url,
  city: null,          // nao disponivel na view
  state: null,         // nao disponivel na view
  work_mode: null,     // nao disponivel na view
  employment_status: p.employment_status,
  team: p.team_id && p.team_name ? { id: p.team_id, name: p.team_name } : null,
  manager: null,       // busca separada abaixo
})) as ProfileWithTeam[];
```

**4. Busca de managers e campos complementares**

Apos obter os IDs da view, fazer query complementar em `profiles` para buscar `manager_user_id`, `city`, `state`, `work_mode`:

```typescript
const profileIds = rows.map(r => r.id);
if (profileIds.length > 0) {
  const { data: extraData } = await supabase
    .from("profiles")
    .select("id, manager_user_id, city, state, work_mode")
    .in("id", profileIds);
  // Merge extra fields into profiles
}
```

Depois buscar managers como ja e feito hoje.

## Impacto

- Usuarios importados sem login passarao a aparecer na listagem
- Usuarios com status `vacation` passarao a aparecer (antes filtrados pelo client-side)
- Mantida exclusao de `terminated` e `external`
- Alinhamento completo com o padrao canonico do TCR

