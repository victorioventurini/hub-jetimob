# QA Checklist — Wave 7: Sunset V1

**Data:** 2026-01-08  
**Versão:** 1.1.0  
**Status:** ✅ VALIDADO

---

## 1. Freeze de Tabelas V1

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU tenta criar permission_group via UI | Botão não disponível / ação bloqueada | ✅ PASS | UI removida - apenas Eye icon |
| Admin BU tenta editar permission_group via SQL | Trigger bloqueia: V1_DEPRECATED_READ_ONLY | ✅ PASS | Trigger ativo |
| Admin BU tenta atribuir grupo V1 a usuário | Ação bloqueada | ✅ PASS | Switch removido |
| super_admin tenta editar V1 (emergência) | Permitido (bypass do trigger) | ✅ PASS | is_platform_admin bypass |
| Leitura de V1 continua funcionando | SELECT permitido | ✅ PASS | Apenas triggers em write |

---

## 2. Templates V2 (Edição Funcional)

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU aplica template V2 a usuário | bu_user_permission_templates_v2 inserido | ✅ PASS | Sheet V2 funcional |
| Admin BU remove template V2 de usuário | Registro removido | ✅ PASS | removeTemplate.mutate |
| Preview mode='v1' mostra permissões V1 | Lista correta | ✅ PASS | Tab V1 read-only |
| Preview mode='v2' mostra permissões V2 | Lista correta | ✅ PASS | Tab V2 |
| Preview mode='both' mostra união | Lista correta | ✅ PASS | Tab Preview |
| Diff mostra permissões ganhas/perdidas | Cálculo correto | ✅ PASS | gained/lost arrays |

---

## 3. Compatibilidade V1 (Usuários Não Migrados)

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Usuário apenas com V1 acessa recurso | has_permission retorna TRUE | ✅ PASS | V1 ainda verificado |
| RLS policy com has_permission funciona | Acesso permitido/negado corretamente | ✅ PASS | RLS OK |
| Aliases resolvem old_key para canonical | resolve_permission_key funciona | ✅ PASS | RPC testada |
| get_my_permissions retorna keys canônicas | Aliases aplicados | ✅ PASS | Normalização OK |

---

## 4. Migração Controlada

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| Admin BU vê status de migração da BU | Dashboard com percentuais | ✅ PASS | MigrationDashboard |
| Tab Migração visível em /hub/permissions | Nova tab implementada | ✅ PASS | Badge v2 |
| Admin BU migra usuário para V2 | permission_migrations atualizado | ✅ PASS | mark_user_migrated RPC |
| Admin BU verifica migração | status='verified' | ✅ PASS | verify_user_migration RPC |
| Snapshot V1 salvo na migração | v1_groups_snapshot preenchido | ✅ PASS | Para rollback |
| Progress bar mostra % migração | Cálculo correto | ✅ PASS | migration_percentage |

---

## 5. Restrições de Usuários

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| External user recebe apenas external_contact_base_v2 | Outros templates bloqueados | ✅ PASS | EXTERNAL_ALLOWED_SLUGS |
| Somente super_admin edita admin | Admin BU não pode editar outro admin | ✅ PASS | canEdit check |
| Alert visual para usuário externo | Alert amarelo exibido | ✅ PASS | AlertTriangle icon |

---

## 6. Sem Hardcode de Role no Frontend

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| audit-rbac.ts passa | Zero violações novas | ✅ PASS | Audit limpo |
| Nenhum uso de `role === "admin"` fora de useAuth | Apenas hooks de auth | ✅ PASS | Padrão seguido |
| isSuperAdmin vem de useAuth().role | Não de profile.is_super_admin | ✅ PASS | Corrigido Wave 6 |

---

## 7. UI Consistente

| Cenário | Esperado | Status | Notas |
|---------|----------|--------|-------|
| /settings/permissions mostra V1 como read-only | Alert de deprecação + badge legado | ✅ PASS | opacity-70 |
| /settings/permissions tab templates-v2 funciona | CRUD V2 ativo | ✅ PASS | TemplatesV2Tab |
| /hub/permissions sheet mostra tabs v1/v2/preview | Navegação funcional | ✅ PASS | 3 tabs |
| Botão "Aplicar v2" salva corretamente | bu_user_permission_templates_v2 | ✅ PASS | handleApplyV2 |
| Tab grupos renomeada para "Grupos v1" | Label atualizado | ✅ PASS | UI clara |

---

## Resultado Final

| Categoria | Total | Pass | Fail | Pendente |
|-----------|-------|------|------|----------|
| Freeze V1 | 5 | 5 | 0 | 0 |
| Templates V2 | 6 | 6 | 0 | 0 |
| Compatibilidade | 4 | 4 | 0 | 0 |
| Migração | 6 | 6 | 0 | 0 |
| Restrições | 3 | 3 | 0 | 0 |
| Hardcode | 3 | 3 | 0 | 0 |
| UI | 5 | 5 | 0 | 0 |
| **TOTAL** | **32** | **32** | **0** | **0** |

**Status Geral:** ✅ APROVADO

---

## Instruções de Teste

1. Login como admin BU
2. Navegar para /settings/permissions
3. Verificar que tab "Templates v1" mostra alert de deprecação e não tem switch
4. Navegar para /hub/permissions
5. Verificar tab "Migração" com dashboard
6. Selecionar usuário e testar sheet V2
7. Aplicar templates V2 e verificar preview
8. Verificar que permissões funcionam corretamente

---

*Documento validado para Wave 7: Sunset V1*
