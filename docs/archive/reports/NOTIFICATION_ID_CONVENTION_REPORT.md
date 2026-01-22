# Notification ID Convention - Report Final

**Data:** 2026-01-09  
**Versão:** 1.0  
**Status:** ✅ COMPLETO

---

## 1. Problema Original

Bug recorrente onde UI passava `profiles.id` para campos que esperavam `auth.users.id`:
- `notifications.user_id` tem FK para `auth.users.id`
- Frontend passava `profile.id` no select de destinatário
- Resultado: violação de FK ao criar notificação

---

## 2. Decisão Canônica

**UI trabalha com ProfileId; backend resolve AuthUserId.**

| Camada | ID Usado | Justificativa |
|--------|----------|---------------|
| UI/Frontend | `profiles.id` | Representa pessoa no contexto de negócio |
| RPC/Backend | Aceita `profile_id` | Resolve `user_id` internamente |
| DB Storage | `auth.users.id` | FKs apontam para auth.users |

---

## 3. Mudanças Implementadas

### 3.1 Database

| Artefato | Mudança |
|----------|---------|
| `send_test_notification_v2` | Nova RPC que aceita `profile_id` e resolve `auth_user_id` |
| `send_test_notification` | Marcada como `@deprecated` |

### 3.2 Frontend

| Arquivo | Mudança |
|---------|---------|
| `useNotificationCenter.ts` | Hook usa v2 RPC com `targetProfileId` |
| `SettingsNotifications.tsx` | Select usa `profile.id`, filtra profiles sem `user_id` |
| `useNotificationAdmin.ts` | `useBuProfiles` retorna `user_id` para validação |

### 3.3 TypeSafe

| Arquivo | Conteúdo |
|---------|----------|
| `src/lib/idTypes.ts` | Tipos branded `ProfileId`, `AuthUserId` + helpers |

### 3.4 Auditoria

| Arquivo | Função |
|---------|--------|
| `scripts/audit-auth-vs-profile-id.ts` | Detecta padrões incorretos no código |

---

## 4. Evidências

### RPC v2 Criada

```sql
CREATE OR REPLACE FUNCTION send_test_notification_v2(
  p_bu_id UUID,
  p_target_profile_id UUID,  -- Aceita ProfileId
  p_channels TEXT[]
) ...

-- Resolve internamente:
SELECT user_id INTO v_auth_user_id FROM profiles WHERE id = p_target_profile_id;
```

### Frontend Atualizado

```tsx
// Antes (ERRADO):
sendTest.mutate({ targetUserId: profile.id, ... })

// Depois (CORRETO):
sendTest.mutate({ targetProfileId: profile.id, ... })
// RPC v2 resolve auth_user_id internamente
```

### Filtro de Profiles

```tsx
// Mostra apenas quem pode receber notificações
profiles.filter(p => p.user_id)
```

---

## 5. Prevenção de Regressão

1. **Tipos Branded**: `ProfileId` vs `AuthUserId` previnem mistura em tempo de compilação
2. **Audit Script**: `scripts/audit-auth-vs-profile-id.ts` detecta padrões incorretos
3. **RPC Canônica**: v2 aceita profile_id, eliminando responsabilidade do frontend
4. **Documentação**: QA e TCR documentam convenção

---

## 6. Checklist Final

| Item | Status |
|------|--------|
| RPC v2 criada | ✅ |
| RPC v1 deprecated | ✅ |
| Frontend refatorado | ✅ |
| Tipos TypeSafe | ✅ |
| Audit script | ✅ |
| QA documento | ✅ |
| Build passing | ✅ |

---

## 7. Regras para Futuras Implementações

1. **NUNCA** passar `profile.id` para `notifications.user_id` diretamente
2. **SEMPRE** usar RPCs que aceitem `profile_id` e resolvam internamente
3. **SEMPRE** filtrar profiles por `user_id IS NOT NULL` antes de notificações
4. **USAR** tipos `ProfileId`/`AuthUserId` para clareza
5. **EXECUTAR** audit script após mudanças em notificações

---

**Aprovado por:** Sistema  
**Data de Aprovação:** 2026-01-09
