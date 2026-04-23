

## Corrigir RPC `search_bu_users_for_mention` — coluna inexistente quebra menções em Projetos

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Módulo Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/bu-isolation-master` — `currentBuId` síncrono já está correto desde a correção anterior
- ✅ `mem://architecture/security-privilege-policy` — RPC continua `SECURITY DEFINER` com checagem `is_profile_bu_member`
- ✅ Conferido: `MentionInput` (centralizado) + `useMentionableUsers` (hook compartilhado) — sem duplicação, padrão correto. Tickets e Projetos compartilham 100% do código frontend.
- ✅ Conferido `docs/qa/QA_USER_DIRECTORY_GLOBAL_v2.md` — view canônica é `v_bu_active_profiles`, coluna correta é `work_email` (não `email`).

### Causa raiz (real, confirmada no DB)

A função `public.search_bu_users_for_mention(uuid, text, integer)` referencia uma coluna **inexistente** na view canônica:

```sql
SELECT v.id, v.user_id, v.display_name,
       v.email,         -- ❌ NÃO EXISTE em v_bu_active_profiles
       v.photo_url, v.team_name, v.user_type
FROM v_bu_active_profiles v
```

A view expõe `work_email` (canônico do diretório), não `email`. Resultado em runtime:
```
ERROR: column v.email does not exist (SQLSTATE 42703)
```
PostgREST devolve esse erro, o TanStack Query coloca em `error`, `data` fica `undefined → []`, e o `MentionInput` mostra **"Nenhum usuário encontrado"**.

**Por que tickets funcionam**: usam `search_mention_candidates`, que vai direto na tabela `profiles` e faz `p.work_email AS email`. Função correta. Apenas a função "internal-only" tinha o bug.

**Por que só apareceu agora**: a correção anterior (`currentBuId` síncrono) liberou a query a chegar ao banco — antes ela nem disparava (`enabled` era `false`). O bug SQL sempre existiu, estava encoberto.

### Correção (mínima — 1 migration)

Recriar `public.search_bu_users_for_mention` usando o alias correto. Mantém:
- `SECURITY DEFINER`, `STABLE`, `search_path = public`
- Checagem `is_profile_bu_member(my_profile_id(), p_bu_id)` → `RAISE 'not authorized'`
- Filtro `user_type = 'internal'`, ordenação por `display_name`, `LIMIT` clamp [1, 20]
- Mesma assinatura de retorno (sem mudança de tipo gerado em `types.ts`): `id, user_id, display_name, email, photo_url, team_name, user_type`

Único delta:
```sql
- v.email
+ v.work_email AS email
```

Migration completa via tool de DB:
```sql
CREATE OR REPLACE FUNCTION public.search_bu_users_for_mention(
  p_bu_id uuid,
  p_search_term text DEFAULT NULL,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid, user_id uuid, display_name text, email text,
  photo_url text, team_name text, user_type text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_limit integer;
BEGIN
  v_profile_id := public.my_profile_id();
  IF NOT public.is_profile_bu_member(v_profile_id, p_bu_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));

  RETURN QUERY
  SELECT
    v.id,
    v.user_id,
    v.display_name,
    v.work_email AS email,           -- ✅ coluna correta da view canônica
    v.photo_url,
    v.team_name,
    v.user_type
  FROM v_bu_active_profiles v
  WHERE v.bu_id = p_bu_id
    AND v.user_type = 'internal'
    AND (
      p_search_term IS NULL
      OR p_search_term = ''
      OR public.f_unaccent(lower(v.display_name)) ILIKE '%' || public.f_unaccent(lower(p_search_term)) || '%'
    )
  ORDER BY v.display_name
  LIMIT v_limit;
END;
$$;
```

### Por que essa abordagem
- **Zero mudança no frontend**: `MentionInput`, `useMentionableUsers` e `ProjectCommentsSection` continuam intactos. Centralização preservada (Tickets e Projetos seguem compartilhando o mesmo componente).
- **Zero mudança no contrato**: assinatura e tipo de retorno idênticos — `types.ts` continua válido sem regenerar.
- **Conformidade canônica**: usa `work_email` que é a coluna oficial do diretório (`docs/qa/QA_USER_DIRECTORY_GLOBAL_v2.md`).
- **Sem RLS, sem nova tabela, sem novo componente, sem novo hook**.

### Validação pós-correção
1. `/projects/98074a55-...` → seção Comentários → digitar `@th` → dropdown lista usuários internos do BU `a0000000-...001` (Thomas, Thiago, Thaise, etc.).
2. Selecionar → chip azul de menção interna criado corretamente.
3. Enviar comentário → registro em `mentions` com `entity_type='project_comment'` e `mentioned_user_id` preenchido.
4. Sanity-check `/tickets/<id>` → menções continuam funcionando (não foi alterado).
5. Sanity-check check-in OKR (`InternalMentionInput`) → também passa a funcionar (mesma RPC compartilhada — bug existia em silêncio aqui também, mas a query nunca disparava por causa do `enabled` antes da correção anterior).

### Arquivos afetados
- **Migration SQL** (1): `CREATE OR REPLACE FUNCTION public.search_bu_users_for_mention` (única alteração: `v.email` → `v.work_email AS email`)
- Nenhum arquivo TS alterado.

### Documentação canônica
- Nota no changelog do TCR: "hotfix RPC `search_bu_users_for_mention` — coluna `v.email` (inexistente) → `v.work_email AS email`. Habilitou menções internas em Projetos e OKRs (Tickets já funcionavam via outra RPC)."

### Princípios respeitados
- BU Isolation (filtro por `bu_id` mantido + checagem `is_profile_bu_member`)
- Sem `select('*')` (colunas explícitas)
- Sem CHECK constraint, sem mudança de RLS
- Componente centralizado: `MentionInput` permanece SSOT — bug era só no banco
- Reuso máximo: zero duplicação, Projetos e Tickets continuam usando o mesmo componente

