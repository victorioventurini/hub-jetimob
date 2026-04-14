

## Correção: Visibilidade cross-BU de perfis

### Problema
A policy RLS `profiles_select_bu_v2` verifica se o viewer é membro da BU **primária** do perfil alvo (`profiles.bu_id`). Quando um usuário tem BU primária diferente mas compartilha outra BU via `bu_user_memberships`, a linha é bloqueada. Afeta Gabriel Peixoto e João Victor na BU Jetimob.

### Pré-checklist ✅
- `is_profile_bu_member(profile_id, bu_id)` verifica `bu_user_memberships WHERE profile_id AND bu_id AND deleted_at IS NULL`
- Índices adequados existem em `bu_user_memberships` (profile_id, bu_id, user_id)
- `profiles_select_own_v2` já permite ver o próprio perfil via `user_id = auth.uid()`

### Solução
Adicionar condição OR na policy para permitir visibilidade quando viewer e target compartilham qualquer BU via memberships:

```sql
DROP POLICY profiles_select_bu_v2 ON profiles;

CREATE POLICY profiles_select_bu_v2 ON profiles
  FOR SELECT TO authenticated
  USING (
    -- Original: viewer é membro da BU primária do perfil
    is_profile_bu_member(my_profile_id(), bu_id)
    OR
    -- Novo: viewer e perfil compartilham qualquer BU via memberships
    EXISTS (
      SELECT 1
      FROM bu_user_memberships my_m
      JOIN bu_user_memberships their_m 
        ON their_m.bu_id = my_m.bu_id
      WHERE my_m.profile_id = my_profile_id()
        AND their_m.profile_id = profiles.id
        AND my_m.deleted_at IS NULL
        AND their_m.deleted_at IS NULL
    )
  );
```

**Nota:** Usa `their_m.profile_id = profiles.id` (não `user_id`) para cobrir inclusive perfis sem login (`user_id = NULL`), consistente com o padrão da `v_bu_active_profiles`.

### Segurança
- Condição original permanece (OR) — zero breaking change
- Isolamento mantido: só vê perfis com BU em comum
- Performance: EXISTS com JOIN em tabela pequena e indexada (`idx_bu_memberships_profile_id`, `idx_bu_memberships_bu`)

### Arquivo impactado
| Ação | Detalhe |
|------|---------|
| Migration SQL | DROP + CREATE policy `profiles_select_bu_v2` |

Zero mudança em código frontend.

