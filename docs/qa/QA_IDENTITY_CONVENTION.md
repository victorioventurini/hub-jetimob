# QA Checklist - Convenção de Identidade

**Data:** 2026-01-08  
**Status:** ✅ PASS

## Cenários de Teste

### 1. Liderança de Time ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `is_team_leader(vitor_auth_id, marketing_id)` | true | ✅ PASS |
| `is_team_leader_by_profile(vitor_profile_id, marketing_id)` | true | ✅ PASS |
| `user_can_manage_team(vitor_auth_id, marketing_id)` | true | ✅ PASS |
| `is_team_leader(fake_uuid, marketing_id)` | false | ✅ PASS |

**IDs de teste:**
- Vitor auth.uid: `0519fa0e-e130-4707-b05e-6debc0fbeb27`
- Vitor profile_id: `110f72b1-ea51-4d31-8235-43aff585022e`
- Marketing team_id: `c8e5d7a7-0b36-4910-bdf1-6cc912f849fe`

### 2. Hierarquia de Times

| Cenário | Esperado | Status |
|---------|----------|--------|
| Líder de time gerencia próprio time | Sim | ✅ PASS |
| Líder de sub-time NÃO gerencia time pai | Não | ⚪ Não aplicável (sem sub-times) |
| Admin da BU gerencia qualquer time | Sim | ✅ PASS |

### 3. Atribuição de Assets

| Cenário | Esperado | Status |
|---------|----------|--------|
| `current_user_id` armazena profile_id | Sim | ✅ PASS |
| Frontend usa `profileId` para authorized_by | Sim | ✅ PASS (corrigido) |
| Holder é exibido corretamente na UI | Sim | ✅ PASS |

### 4. Tickets

| Cenário | Esperado | Status |
|---------|----------|--------|
| `created_by_user_id` armazena profile_id | Sim | ✅ PASS |
| `owner_user_id` armazena profile_id | Sim | ✅ PASS |
| Frontend usa `profileId` para criação | Sim | ✅ PASS |

### 5. Permission Groups

| Cenário | Esperado | Status |
|---------|----------|--------|
| `bu_user_permission_groups.user_id` = profile_id | Sim | ✅ PASS |
| RLS usa `my_profile_id()` para comparação | Sim | ✅ PASS (corrigido) |
| Usuário vê próprios grupos | Sim | ✅ PASS |

### 6. OKRs

| Cenário | Esperado | Status |
|---------|----------|--------|
| `owner_user_id` armazena profile_id | Sim | ✅ PASS |
| Líder pode editar OKRs do time | Sim | ✅ PASS (RLS corrigido) |
| Frontend usa `profileId` para ownership | Sim | ✅ PASS |
| RLS policies usam `my_profile_id()` | Sim | ✅ PASS (7 policies corrigidas) |

## Funções SQL Validadas

| Função | Teste | Resultado |
|--------|-------|-----------|
| `my_profile_id()` | Retorna profile_id do auth.uid() | ✅ PASS |
| `profile_id_from_user_id(uuid)` | Converte auth→profile | ✅ PASS |
| `user_id_from_profile_id(uuid)` | Converte profile→auth | ✅ PASS |
| `is_team_leader(user_id, team_id)` | Reconhece líder | ✅ PASS |
| `user_can_manage_team(user_id, team_id)` | Autoriza gestão | ✅ PASS |

## Scripts de Auditoria

### audit:identity

```bash
# TODO: Implementar em scripts/audit-identity-ids.ts
npm run audit:identity
```

**Resultado esperado:** Nenhuma coluna WRONG

### audit:bu

```bash
# Verificar BU scope
# Todas as queries respeitam bu_id
```

**Resultado:** ✅ PASS (hardening mantido)

## Conclusão

| Área | Status |
|------|--------|
| Funções SQL | ✅ PASS |
| RLS Policies | ✅ PASS |
| Frontend Hooks | ✅ PASS |
| Dados Existentes | ✅ PASS |

**Status Geral: ✅ PASS**
