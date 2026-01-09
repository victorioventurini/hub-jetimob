# Membership Recovery Report — BU Jetimob

**Data:** 2026-01-09  
**Executor:** Lovable AI  
**Status:** ✅ CONCLUÍDO

---

## 1. Contexto

Os registros de `bu_user_memberships` para a BU Jetimob foram acidentalmente removidos, quebrando o acesso/login de usuários a essa BU.

**Ação necessária:** Recriar memberships para profiles que possuem `user_id` (auth existente).

---

## 2. Diagnóstico (ANTES)

### 2.1 BUs no Sistema

| BU ID | Nome | Status |
|-------|------|--------|
| `a0000000-0000-0000-0000-000000000001` | Jetimob | active |
| `f3d2d8a5-2143-42f0-8738-9b51fb74b49f` | Jet Experience | active |

### 2.2 Profiles por BU

| BU | Total Profiles | Com Auth (`user_id`) | Sem Auth |
|----|----------------|----------------------|----------|
| Jetimob | 61 | 5 | 56 |
| Jet Experience | 3 | 2 | 1 |

### 2.3 Memberships por BU (ANTES)

| BU | Total Memberships |
|----|-------------------|
| Jetimob | **0** ❌ |
| Jet Experience | 4 |

---

## 3. Schema Verificado

### 3.1 Tabela `bu_user_memberships`

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | - |
| `bu_id` | uuid | NO | - |
| `role_in_bu` | app_role | NO | `'collaborator'` |
| `is_default` | boolean | NO | `false` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### 3.2 Enum `app_role`

- `super_admin`
- `admin`
- `collaborator`

### 3.3 Constraints

- `bu_user_memberships_pkey`: PRIMARY KEY (id)
- `bu_user_memberships_user_id_bu_id_key`: UNIQUE (user_id, bu_id)
- `bu_user_memberships_bu_user_unique`: UNIQUE (bu_id, user_id)
- FK para `auth.users(id)` ON DELETE CASCADE
- FK para `bu_units(id)` ON DELETE CASCADE

---

## 4. Backfill Executado

### 4.1 Query Aplicada

```sql
INSERT INTO public.bu_user_memberships (id, user_id, bu_id, role_in_bu, is_default, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.user_id,
  p.bu_id,
  'collaborator'::app_role,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.bu_user_memberships existing
      WHERE existing.user_id = p.user_id AND existing.is_default = true
    )
    THEN true
    ELSE false
  END,
  now(),
  now()
FROM public.profiles p
WHERE p.bu_id = 'a0000000-0000-0000-0000-000000000001'  -- Jetimob
  AND p.user_id IS NOT NULL
  AND p.deleted_at IS NULL
  AND p.employment_status = 'active'
ON CONFLICT (user_id, bu_id) DO NOTHING;
```

### 4.2 Resultado

**5 memberships criados:**

| user_id | role_in_bu | is_default |
|---------|------------|------------|
| `4d0f4358-7bc2-4613-bf60-dac52747ed65` | collaborator | true |
| `dcb85e6f-7d50-4390-b815-5790429f1be6` | collaborator | true |
| `0519fa0e-e130-4707-b05e-6debc0fbeb27` | collaborator | true |
| `549aab89-bc9c-439e-bfb5-80486493cc6c` | collaborator | true |
| `742b2a06-e1cb-4e67-ba22-27c867e30ed9` | collaborator | true |

---

## 5. Validação (DEPOIS)

### 5.1 Memberships por BU

| BU | Total Memberships |
|----|-------------------|
| Jetimob | **5** ✅ |
| Jet Experience | 4 |

### 5.2 Verificação `is_default`

✅ Nenhum usuário com múltiplos `is_default = true`

### 5.3 Profiles sem Membership

| BU | Profiles sem auth (não logaram) |
|----|--------------------------------|
| Jetimob | 56 |

**Nota:** Esses 56 profiles não possuem `user_id` (nunca fizeram login). Quando fizerem o primeiro login via magic link, o trigger `handle_new_user` criará o membership automaticamente.

---

## 6. Resumo de Contagens

| Métrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Memberships Jetimob | 0 | 5 | +5 |
| Profiles com auth e sem membership | 5 | 0 | -5 ✅ |
| Profiles sem auth (aguardando login) | 56 | 56 | 0 |

---

## 7. Próximos Passos (Opcional)

### 7.1 Profiles sem `user_id` (56 usuários)

Esses usuários foram cadastrados mas nunca fizeram login. Para ativá-los:

1. **Opção A (Manual):** Enviar email com magic link para cada usuário
2. **Opção B (Self-service):** Usuário acessa `/auth`, insere email com domínio `@jetimob.com`, recebe magic link

### 7.2 Melhoria Sugerida na UI

Na tela de Users (`/users`):
- Mostrar badge "Sem acesso" para profiles com `user_id IS NULL`
- Botão "Convidar" para disparar magic link (implementação futura)

---

## 8. Conclusão

✅ **Recuperação concluída com sucesso**

- 5 memberships recriados para a BU Jetimob
- Login por domínio `@jetimob.com` restaurado
- Nenhuma duplicação ou inconsistência detectada
- 56 profiles aguardam primeiro login para obter membership automaticamente

---

## Referências

- [TCR v2.13.0 - User Directory](docs/TECHNICAL_CONTEXT_REGISTRY.md)
- [Development Standards - BU Scope](docs/engineering/DEVELOPMENT_STANDARDS.md)
