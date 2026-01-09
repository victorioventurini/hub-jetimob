# Report: Correção Profile Self-Access

**Data:** 2026-01-09  
**Versão:** 1.0.0  
**Autor:** Sistema  
**Ticket:** Correção global de acesso ao próprio profile

---

## 1. Problema Identificado

### Descrição
Usuários com `profiles.bu_id` divergente do `bu_user_memberships.bu_id` default não conseguiam ler o próprio perfil devido à policy RLS `profiles_select` que exigia que o `bu_id` do profile estivesse dentro das memberships do usuário.

### Impacto
- ❌ Login/onboarding quebrado
- ❌ Preferências inacessíveis
- ❌ Notificações não funcionavam
- ❌ Qualquer tela dependente do profile falhava

### Caso Real
- **Usuário:** guilherme@jetimob.com
- **Profile bu_id:** Jetimob (`a0000000-0000-0000-0000-000000000001`)
- **Membership bu_id:** Jet Experience (`f3d2d8a5-2143-42f0-8738-9b51fb74b49f`)
- **Erro:** "Erro ao carregar perfil. Por favor, faça login novamente."

---

## 2. Solução Implementada

### 2.1 Policies RLS Adicionadas/Alteradas

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `profiles_select_own` | SELECT | Permite usuário ler próprio profile (`user_id = auth.uid()`) |
| `profiles_update_own` | UPDATE | Permite usuário atualizar próprio profile com WITH CHECK |

**SQL:**
```sql
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2.2 Funções Criadas

| Função | Tipo | Descrição |
|--------|------|-----------|
| `sync_profile_bu_to_default_membership(uuid)` | SECURITY DEFINER | Sincroniza `profiles.bu_id` com a BU default do membership |
| `trg_sync_profile_bu_on_membership_change()` | TRIGGER FUNCTION | Dispara sync ao alterar membership default |
| `trg_protect_profile_critical_fields()` | TRIGGER FUNCTION | Protege `user_id` e `bu_id` contra alterações indevidas |

### 2.3 Triggers Criados

| Trigger | Tabela | Evento | Descrição |
|---------|--------|--------|-----------|
| `trg_membership_sync_profile_bu` | `bu_user_memberships` | AFTER INSERT/UPDATE | Sincroniza profile.bu_id quando membership default muda |
| `trg_profile_protect_critical` | `profiles` | BEFORE UPDATE | Bloqueia alteração de user_id e bu_id |

---

## 3. Backfill/Correção de Dados

### Estatísticas

| Métrica | Valor |
|---------|-------|
| Total profiles com user_id | 4 |
| Inconsistentes antes da correção manual | 1 |
| Corrigidos manualmente | 1 |
| Inconsistentes após correção | 0 |

### Correção Manual Realizada
```sql
UPDATE bu_user_memberships 
SET bu_id = 'a0000000-0000-0000-0000-000000000001'
WHERE user_id = '742b2a06-e1cb-4e67-ba22-27c867e30ed9';
```

---

## 4. Prevenção Implementada

### 4.1 Sync Automático
Quando um membership é criado/alterado com `is_default = true`:
1. Trigger `trg_membership_sync_profile_bu` é disparado
2. Função `sync_profile_bu_to_default_membership()` é chamada
3. `profiles.bu_id` é atualizado automaticamente para a nova BU default

### 4.2 Proteção de Campos Críticos
Trigger `trg_profile_protect_critical` impede:
- **user_id:** Sempre bloqueado para alteração
- **bu_id:** Bloqueado exceto para:
  - Platform admins (`is_platform_admin()`)
  - Chamadas internas via `set_config('app.internal_call', 'true', true)`

---

## 5. Documentação Atualizada

### TCR (Technical Context Registry)
Adicionar regras:
- `profiles.bu_id` deve sempre refletir o membership default do usuário
- Self-access policy garante leitura do próprio profile independente de bu_id
- Alterações em `user_id` e `bu_id` só podem ser feitas via funções internas

---

## 6. QA

| Cenário | Status |
|---------|--------|
| Usuário com bu_id divergente consegue ler próprio profile | ✅ PASS |
| Isolamento multi-tenant mantido | ✅ PASS |
| Backfill corrigiu inconsistências | ✅ PASS |
| Trocar BU default atualiza profiles.bu_id | ✅ PASS |
| Proteção de campos críticos funciona | ✅ PASS |

**Resultado:** ✅ **TODOS OS TESTES PASSARAM**

---

## 7. Risco Residual

| Risco | Mitigação | Status |
|-------|-----------|--------|
| Profile sem membership (user_id != null mas sem bu_user_memberships) | Sync function usa fallback para primeira membership por created_at | ⚠️ Monitorar |
| Platform admin altera bu_id incorretamente | Auditoria via audit_logs | ✅ Aceitável |

---

## 8. Conclusão

A correção foi implementada com sucesso, garantindo:
1. ✅ Usuários sempre conseguem ler/atualizar seu próprio profile
2. ✅ Isolamento multi-tenant mantido para profiles de outros usuários
3. ✅ Prevenção automática de inconsistências futuras
4. ✅ Proteção contra alterações indevidas de campos críticos
