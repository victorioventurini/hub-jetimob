# QA Checklist - Consistência de Identidade

**Data:** 2026-01-08  
**Status:** ✅ PASS

## Objetivo

Validar que o sistema respeita a convenção de identidade em todos os módulos:
- **Domínio** (ownership/liderança): `profiles.id`
- **Autenticação**: `auth.users.id`

---

## Cenários de Teste

### 1. Liderança de Time ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| Líder reconhecido via `is_team_leader(auth.uid(), team_id)` | TRUE | ✅ PASS |
| `user_can_manage_team(auth.uid(), team_id)` para líder | TRUE | ✅ PASS |
| Não-líder não gerencia time | FALSE | ✅ PASS |

**Evidência SQL:**
```sql
SELECT is_team_leader('0519fa0e-e130-4707-b05e-6debc0fbeb27', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe');
-- Result: TRUE (Vitor é líder do Marketing)
```

### 2. OKRs - Owner Permissions ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| Owner consegue fazer check-in | Sim | ✅ PASS |
| Não-owner não consegue fazer check-in (mesmo auth.uid) | Não | ✅ PASS |
| Líder de time pode ver OKRs do time | Sim | ✅ PASS |
| Líder não edita OKRs de time pai | Correto | ✅ PASS |

**Validação RLS:**
```sql
-- Policy correta usa my_profile_id()
-- owner_user_id = my_profile_id()
```

### 3. Assets - Holder ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `current_user_id` armazena `profiles.id` | Sim | ✅ PASS |
| Frontend envia `profileId` para atribuição | Sim | ✅ PASS |
| RLS compara com `my_profile_id()` | Sim | ✅ PASS |

### 4. Tickets ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `created_by_user_id` = `profiles.id` | Sim | ✅ PASS |
| `owner_user_id` = `profiles.id` | Sim | ✅ PASS |
| Frontend usa `profileId` | Sim | ✅ PASS |

### 5. Permission Groups ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `bu_user_permission_groups.user_id` = `profiles.id` | Sim | ✅ PASS |
| RLS policy usa `my_profile_id()` | Sim | ✅ PASS |

---

## Auditorias Automáticas

### View `identity_rls_violations`

```sql
SELECT COUNT(*) FROM identity_rls_violations;
-- Esperado: 0
-- Resultado: 0 ✅
```

### Script `npm run audit:identity`

```bash
npm run audit:identity
# Esperado: PASS (0 violations)
# Resultado: ✅ PASS
```

---

## Funções Canônicas Validadas

| Função | Descrição | Status |
|--------|-----------|--------|
| `my_profile_id()` | Retorna `profiles.id` do auth.uid() | ✅ OK |
| `my_profile_id_strict()` | Versão com RAISE EXCEPTION | ✅ OK |
| `profile_id_from_user_id(uuid)` | Converte auth→profile | ✅ OK |
| `user_id_from_profile_id(uuid)` | Converte profile→auth | ✅ OK |
| `is_team_leader(user_id, team_id)` | Converte internamente | ✅ OK |
| `user_can_manage_team(user_id, team_id)` | Converte internamente | ✅ OK |
| `assert_profile_identity(uuid)` | Guard de runtime | ✅ OK |

---

## Frontend Hooks Validados

| Hook | Uso | Status |
|------|-----|--------|
| `useIdentity()` | Retorna `userId` e `profileId` | ✅ OK |
| `useProfileId()` | Retorna apenas `profileId` | ✅ OK |

### Padrão Correto

```tsx
const { profileId } = useIdentity();

// Para ownership de domínio:
await supabase.from("okr_initiatives").insert({
  owner_user_id: profileId // ✅ Correto
});
```

---

## Módulos Auditados

| Módulo | RLS Policies | Frontend | Status |
|--------|--------------|----------|--------|
| OKRs | ✅ my_profile_id() | ✅ useIdentity | PASS |
| Tickets | ✅ my_profile_id() | ✅ useIdentity | PASS |
| Assets | ✅ my_profile_id() | ✅ useIdentity | PASS |
| KPIs | ✅ my_profile_id() | ✅ useIdentity | PASS |
| Teams | ✅ is_team_leader() | ✅ N/A | PASS |
| Permissions | ✅ my_profile_id() | ✅ useIdentity | PASS |

---

## Resultado Final

| Área | Status |
|------|--------|
| Funções SQL | ✅ PASS |
| RLS Policies | ✅ PASS |
| View de Auditoria | ✅ PASS (0 violations) |
| Frontend Hooks | ✅ PASS |
| Audit Script | ✅ PASS |

**Status Geral: ✅ PASS**

---

## Prevenção de Regressão

1. **View `identity_rls_violations`** - Monitora policies incorretas
2. **Script `npm run audit:identity`** - Varredura de código
3. **Lint gate** - Bloqueia `useAuth` em módulos OKRs/Tickets
4. **Documentação** - `docs/IDENTITY_CONVENTION.md`

Qualquer nova policy ou código que viole a convenção será detectado automaticamente.
