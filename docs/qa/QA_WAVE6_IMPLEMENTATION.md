# Wave 6 — Implementation QA Checklist

**Data:** 2026-01-08  
**Status:** READY FOR TESTING

---

## Pré-requisitos

- [ ] Migration Wave 6 aplicada (permission_key_aliases, permission_templates_v2, etc.)
- [ ] Tipos TypeScript atualizados (regenerar se necessário)
- [ ] Aplicação rodando sem erros de console

---

## 1. Compatibilidade v1 (NÃO QUEBRAR)

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 1.1 | Usuário com templates v1 continua funcionando normalmente | PENDING | Templates v1 devem permanecer ativos |
| 1.2 | has_permission() aceita old_key via alias | PENDING | Testar com key depreciada |
| 1.3 | get_my_permissions() retorna keys canônicas | PENDING | Verificar formato retornado |
| 1.4 | RLS policies existentes continuam funcionando | PENDING | Testar CRUD em tabelas protegidas |
| 1.5 | Templates v1 visíveis como read-only na UI | PENDING | Aba v1 no sheet |

---

## 2. Aliases de Permission Keys

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 2.1 | Aliases listados em /settings/permissions?tab=aliases | PENDING | |
| 2.2 | Criar novo alias funciona | PENDING | old_key → new_key |
| 2.3 | Toggle status active/deprecated funciona | PENDING | |
| 2.4 | Deletar alias funciona | PENDING | |
| 2.5 | Alias com old_key duplicada é rejeitado | PENDING | Constraint unique |

---

## 3. Templates v2

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 3.1 | Templates v2 listados em /settings/permissions?tab=templates-v2 | PENDING | |
| 3.2 | Templates organizados por módulo | PENDING | |
| 3.3 | Badge de surface (VIEW/OPERATE/ADMINISTER) exibido | PENDING | |
| 3.4 | Detalhes do template mostram permission keys | PENDING | Sheet lateral |
| 3.5 | Surfaces tab mostra organização por módulo | PENDING | |

---

## 4. Atribuição v2 por BU

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 4.1 | Listar usuários com busca (q na URL) | PENDING | /hub/permissions?q=... |
| 4.2 | Abrir sheet de usuário mostra tabs v1/v2/preview | PENDING | |
| 4.3 | Tab v1 mostra templates atuais (read-only) | PENDING | |
| 4.4 | Tab v2 permite selecionar templates | PENDING | Checkboxes |
| 4.5 | Botão "Aplicar v2" salva atribuições | PENDING | bu_user_permission_templates_v2 |
| 4.6 | Templates múltiplos podem ser atribuídos | PENDING | Somáveis |
| 4.7 | Atribuição persiste após refresh | PENDING | |

---

## 5. Preview de Permissões Efetivas

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 5.1 | Preview mostra modo v1 | PENDING | Apenas permissões v1 |
| 5.2 | Preview mostra modo v2 | PENDING | Apenas permissões v2 |
| 5.3 | Preview mostra modo both (v1+v2) | PENDING | União das permissões |
| 5.4 | Diff mostra permissões ganhas (verde) | PENDING | |
| 5.5 | Diff mostra permissões perdidas (vermelho) | PENDING | |
| 5.6 | Busca filtra permissões no preview | PENDING | |

---

## 6. Restrições de Acesso

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 6.1 | Usuário externo só vê templates permitidos | PENDING | external_contact_base_v2, tickets_view_v2 |
| 6.2 | Admin BU não pode editar outro admin | PENDING | Somente super_admin |
| 6.3 | super_admin pode editar qualquer usuário | PENDING | |
| 6.4 | /settings/permissions só acessível por super_admin | PENDING | Guard de rota |

---

## 7. Comportamento RBAC (RLS + Scopes)

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 7.1 | Líder edita OKR do próprio time | PENDING | Scope :team via user_can_manage_team |
| 7.2 | Líder NÃO edita time pai | PENDING | RLS bloqueia |
| 7.3 | Colaborador cria ticket interno | PENDING | collaborator_base inclui tickets.thread.create |
| 7.4 | External só vê tickets que participa | PENDING | RLS + self_or_owner |
| 7.5 | Asset manager opera submódulos | PENDING | OPERATE surface |
| 7.6 | BU admin acessa tudo da BU | PENDING | Wildcard * |
| 7.7 | Aliases resolvem corretamente | PENDING | read → view |
| 7.8 | Troca de BU reseta permissões | PENDING | Query key inclui buId |

---

## 8. UI/UX

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 8.1 | URL state funciona para tabs | PENDING | ?tab=aliases, ?tab=templates-v2 |
| 8.2 | URL state funciona para busca | PENDING | ?q=... |
| 8.3 | Loading states exibidos corretamente | PENDING | |
| 8.4 | Empty states com mensagens adequadas | PENDING | |
| 8.5 | Toast de sucesso/erro nas ações | PENDING | |
| 8.6 | Responsividade em mobile | PENDING | |

---

## 9. Audits Executados

| Audit | Status | Issues |
|-------|--------|--------|
| audit-rbac.ts | PENDING | |
| audit-identity-usage.ts | PENDING | |
| audit-bu-scope.ts | PENDING | |
| audit-permission-keys | PENDING | |

---

## Resultado Final

- **Total de Cenários:** 45
- **PASS:** 0
- **FAIL:** 0
- **PENDING:** 45

**Status:** 🟡 AGUARDANDO TESTES

---

*QA preparado para Wave 6 Implementation*
