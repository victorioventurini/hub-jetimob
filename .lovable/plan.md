
# Plano: Correção de Permission Keys nas RLS Policies

## Resumo do Problema

A usuária Luiza (e qualquer outro usuário com permissões de gestão de usuários) não consegue cadastrar novos usuários porque existe uma **inconsistência entre as permission keys** usadas nas RLS policies e as cadastradas no catálogo de permissões.

### Diagnóstico

| Camada | Key Usada | Existe no Catálogo? |
|--------|-----------|---------------------|
| RLS INSERT | `people.profile.create:bu` | ❌ NÃO |
| RLS UPDATE | `people.profile.update:bu` | ❌ NÃO |
| RLS DELETE | `people.profile.delete:bu` | ❌ NÃO |
| Catálogo | `users.profile.create` | ✅ SIM |
| Catálogo | `users.profile.manage:bu` | ✅ SIM |
| Catálogo | `users.profile.delete` | ✅ SIM |

### Templates de Luiza (Confirmados)

Luiza possui:
- `users_admin_v2` com: `users.profile.create`, `users.profile.manage:bu`, `users.profile.delete`

Porém a RLS não reconhece essas keys porque busca por `people.profile.*`.

---

## Solução

Atualizar as RLS policies da tabela `profiles` para usar as permission keys corretas do catálogo.

### Migração SQL

```sql
-- Drop policies com keys incorretas
DROP POLICY IF EXISTS "profiles_insert_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_v2" ON public.profiles;

-- Recriar INSERT com keys corretas
CREATE POLICY "profiles_insert_v2" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR has_permission(my_profile_id(), bu_id, 'users.profile.create')
    OR has_permission(my_profile_id(), bu_id, 'users.profile.manage:bu')
  );

-- Recriar UPDATE admin com keys corretas  
CREATE POLICY "profiles_update_admin_v2" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'users.profile.manage:bu')
  );

-- Recriar DELETE com keys corretas
CREATE POLICY "profiles_delete_v2" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'users.profile.delete')
    OR has_permission(my_profile_id(), bu_id, 'users.profile.manage:bu')
  );
```

### Ajuste no Frontend

Atualizar `JetimoberDialog.tsx` para usar a key sem sufixo `:bu` (conforme catálogo):

**De:**
```typescript
const canManageUsers = isWildcard || has('users.profile.manage:bu') || has('users.profile.create:bu');
```

**Para:**
```typescript
const canManageUsers = isWildcard || has('users.profile.manage:bu') || has('users.profile.create');
```

---

## Arquivos Impactados

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Corrigir 3 RLS policies |
| `src/components/users/JetimoberDialog.tsx` | Ajustar key de `users.profile.create:bu` para `users.profile.create` |

## Impacto

- **Afeta todos os usuários** com templates de gestão de usuários
- **Zero breaking changes** para funcionalidades existentes
- **Correção imediata** após aplicação da migração

## Detalhes Técnicos

### Mapeamento Final de Keys

| Operação | Permission Key Correta |
|----------|------------------------|
| Criar usuário | `users.profile.create` ou `users.profile.manage:bu` |
| Editar próprio perfil | `users.profile.update:self` (já funciona via policy `profiles_update_own_v2`) |
| Editar qualquer perfil | `users.profile.manage:bu` |
| Deletar usuário | `users.profile.delete` ou `users.profile.manage:bu` |

### Validação Pós-Correção

1. Luiza conseguirá cadastrar novos usuários
2. Qualquer usuário com `users_admin_v2` terá acesso completo
3. RLS continua segura (apenas keys válidas do catálogo)
