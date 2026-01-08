# QA Checklist — Wave 7: Sunset V1

**Data:** 2026-01-08  
**Versão:** 1.0.0  
**Status:** 🟡 EM VALIDAÇÃO

---

## 1. Freeze de Tabelas V1

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU tenta criar permission_group via UI | Botão não disponível / ação bloqueada | ⏳ PENDENTE | UI removida |
| Admin BU tenta editar permission_group via SQL | Trigger bloqueia: V1_DEPRECATED_READ_ONLY | ⏳ PENDENTE | Trigger ativo |
| Admin BU tenta atribuir grupo V1 a usuário | Ação bloqueada | ⏳ PENDENTE | setUserGroups bloqueado |
| super_admin tenta editar V1 (emergência) | Permitido (bypass do trigger) | ⏳ PENDENTE | is_platform_admin bypass |
| Leitura de V1 continua funcionando | SELECT permitido | ⏳ PENDENTE | Apenas triggers em write |

---

## 2. Templates V2 (Edição Funcional)

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU aplica template V2 a usuário | bu_user_permission_templates_v2 inserido | ⏳ PENDENTE | Sheet V2 |
| Admin BU remove template V2 de usuário | Registro removido | ⏳ PENDENTE | |
| Preview mode='v1' mostra permissões V1 | Lista correta | ⏳ PENDENTE | |
| Preview mode='v2' mostra permissões V2 | Lista correta | ⏳ PENDENTE | |
| Preview mode='both' mostra união | Lista correta | ⏳ PENDENTE | |
| Diff mostra permissões ganhas/perdidas | Cálculo correto | ⏳ PENDENTE | |

---

## 3. Compatibilidade V1 (Usuários Não Migrados)

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Usuário apenas com V1 acessa recurso | has_permission retorna TRUE | ⏳ PENDENTE | V1 ainda verificado |
| RLS policy com has_permission funciona | Acesso permitido/negado corretamente | ⏳ PENDENTE | |
| Aliases resolvem old_key para canonical | resolve_permission_key funciona | ⏳ PENDENTE | |
| get_my_permissions retorna keys canônicas | Aliases aplicados | ⏳ PENDENTE | |

---

## 4. Migração Controlada

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU vê status de migração da BU | Dashboard com percentuais | ⏳ PENDENTE | get_bu_migration_status |
| Admin BU migra usuário para V2 | permission_migrations atualizado | ⏳ PENDENTE | mark_user_migrated RPC |
| Admin BU verifica migração | status='verified' | ⏳ PENDENTE | verify_user_migration RPC |
| Snapshot V1 salvo na migração | v1_groups_snapshot preenchido | ⏳ PENDENTE | Para rollback se necessário |

---

## 5. Restrições de Usuários

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| External user recebe apenas external_contact_base_v2 | Outros templates bloqueados | ⏳ PENDENTE | EXTERNAL_ALLOWED_SLUGS |
| Somente super_admin edita admin | Admin BU não pode editar outro admin | ⏳ PENDENTE | canEdit check |
| Leader com okrs_team_manager_v2 mantém escopo | user_can_manage_team funciona | ⏳ PENDENTE | Escopo via hierarquia |

---

## 6. Sem Hardcode de Role no Frontend

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| audit-rbac.ts passa | Zero violações novas | ⏳ PENDENTE | |
| Nenhum uso de `role === "admin"` fora de useAuth | Apenas hooks de auth | ⏳ PENDENTE | |
| isSuperAdmin vem de useAuth().role | Não de profile.is_super_admin | ✅ PASS | Corrigido Wave 6 |

---

## 7. UI Consistente

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| /settings/permissions mostra V1 como read-only | Sem botões de edição V1 | ⏳ PENDENTE | |
| /settings/permissions tab templates-v2 funciona | CRUD V2 ativo | ⏳ PENDENTE | |
| /hub/permissions sheet mostra tabs v1/v2/preview | Navegação funcional | ⏳ PENDENTE | |
| Botão "Aplicar v2" salva corretamente | bu_user_permission_templates_v2 | ⏳ PENDENTE | |

---

## Resultado Final

| Categoria | Total | Pass | Fail | Pendente |
|-----------|-------|------|------|----------|
| Freeze V1 | 5 | 0 | 0 | 5 |
| Templates V2 | 6 | 0 | 0 | 6 |
| Compatibilidade | 4 | 0 | 0 | 4 |
| Migração | 4 | 0 | 0 | 4 |
| Restrições | 3 | 0 | 0 | 3 |
| Hardcode | 3 | 1 | 0 | 2 |
| UI | 4 | 0 | 0 | 4 |
| **TOTAL** | **29** | **1** | **0** | **28** |

**Status Geral:** 🟡 AGUARDANDO TESTES MANUAIS

---

## Instruções de Teste

1. Login como admin BU
2. Navegar para /settings/permissions
3. Verificar que tab "groups" não tem ações de criar/editar
4. Navegar para /hub/permissions
5. Selecionar usuário e testar sheet V2
6. Aplicar templates V2 e verificar preview
7. Verificar que permissões funcionam corretamente

---

*Documento gerado para Wave 7: Sunset V1*
