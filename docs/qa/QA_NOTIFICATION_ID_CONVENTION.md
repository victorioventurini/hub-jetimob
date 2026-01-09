# QA - Notification ID Convention (ProfileId vs AuthUserId)

**Data:** 2026-01-09  
**Versão:** 1.0

## Convenção Canônica

| Contexto | ID Usado | Tabela Fonte |
|----------|----------|--------------|
| UI (selects, diretórios) | ProfileId | profiles.id |
| notifications.user_id | AuthUserId | auth.users.id |
| notifications.actor_id | AuthUserId | auth.users.id |
| notification_outbox.user_id | AuthUserId | auth.users.id |
| RPCs de notificação | Aceita ProfileId | Resolve internamente |

---

## Cenários de Teste

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Selecionar profile sem login → UI mostra somente profiles com user_id | ✅ PASS |
| 2 | Tentar enviar para profile sem auth user → RPC retorna erro claro | ✅ PASS |
| 3 | Enviar teste para profile válido → in_app criado com auth_user_id | ✅ PASS |
| 4 | Enviar teste para profile válido → outbox criado com auth_user_id | ✅ PASS |
| 5 | Frontend usa send_test_notification_v2 | ✅ PASS |
| 6 | Frontend passa profile.id (não user_id) para RPC | ✅ PASS |
| 7 | Audit script retorna 0 findings críticos | ✅ PASS |

---

## Detalhes

### 1. Filtro de Profiles no Select

```tsx
{profiles
  .filter(profile => profile.user_id) // Só mostra quem já logou
  .map(profile => (
    <SelectItem value={profile.id} ... />
  ))}
```

### 2-4. RPC v2 Resolve Internamente

```sql
-- send_test_notification_v2 aceita profile_id
SELECT p.user_id INTO v_auth_user_id
FROM profiles p
WHERE p.id = p_target_profile_id;

-- Valida antes de inserir
IF v_auth_user_id IS NULL THEN
  RETURN 'PROFILE_HAS_NO_AUTH_USER'
END IF;

-- Insere com auth_user_id correto
INSERT INTO notifications (user_id, ...) VALUES (v_auth_user_id, ...)
```

### 5-6. Frontend Atualizado

```tsx
// Hook usa v2 e aceita profileId
sendTest.mutate({
  targetProfileId: profile.id,  // ProfileId
  channels: ['in_app', 'email']
})

// RPC chamada
supabase.rpc('send_test_notification_v2', {
  p_target_profile_id: targetProfileId,
  ...
})
```

### 7. Audit Script

```bash
npx ts-node scripts/audit-auth-vs-profile-id.ts

# Output esperado:
# ✅ AUDIT PASSED: No critical issues
```

---

## Tipos TypeSafe

```typescript
// src/lib/idTypes.ts

export type ProfileId = string & { readonly [ProfileIdBrand]: never };
export type AuthUserId = string & { readonly [AuthUserIdBrand]: never };

export function asProfileId(id: string): ProfileId;
export function asAuthUserId(id: string): AuthUserId;
export function canReceiveNotifications(profile: TypedProfile): boolean;
```

---

## Validação SQL

```sql
-- Verificar que v2 existe e v1 está marcada como deprecated
SELECT proname, obj_description(oid) 
FROM pg_proc 
WHERE proname LIKE 'send_test_notification%';

-- v1: @deprecated
-- v2: Aceita profile_id e resolve auth_user_id internamente
```

---

## Resultado Final

**STATUS: ✅ PASS**

- UI filtra profiles sem auth user
- RPC v2 resolve IDs internamente
- Erros claros quando profile não tem auth user
- Frontend usa apenas ProfileId
- Audit script valida convenção
