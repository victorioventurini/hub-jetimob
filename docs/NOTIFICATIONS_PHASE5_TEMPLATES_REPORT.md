# Notifications Phase 5: Templates Report

> Data: 2026-01-09
> Versão: 1.0.0
> Status: **Completo**

---

## 1. Objetivo

Implementar sistema completo de templates de notificação para o Hub da Jet, permitindo:
- Gerenciamento visual de templates por evento + canal
- Versionamento com histórico completo
- Rollback para versões anteriores
- Validação de variáveis client e server-side
- Auditoria de todas as ações

**Meta atingida:** Eliminar necessidade de alterar código para mudar conteúdo de notificações.

---

## 2. Arquitetura

### 2.1 Modelo de Dados

```
notification_templates
├── id (UUID)
├── event_slug (TEXT)
├── channel (TEXT: in_app|email|slack|webhook)
├── subject_template (TEXT, nullable)
├── body_template (TEXT)
├── version (INTEGER)
├── is_active (BOOLEAN)
├── bu_id (UUID, nullable - null = global)
├── current_version_id (UUID FK)
├── created_at, updated_at

notification_template_versions
├── id (UUID)
├── template_id (UUID FK)
├── version (INTEGER)
├── subject (TEXT, nullable)
├── body (TEXT)
├── variables_used (TEXT[])
├── created_by (UUID FK auth.users)
├── created_at
├── is_approved (BOOLEAN)
├── approved_by, approved_at

notification_template_variables
├── id (UUID)
├── event_slug (TEXT)
├── variable_key (TEXT)
├── variable_label (TEXT)
├── variable_type (TEXT)
├── example_value (TEXT)
├── is_required (BOOLEAN)
├── description (TEXT)

notification_template_audit_log
├── id (UUID)
├── template_id (UUID)
├── version_id (UUID)
├── action (TEXT: create|update|activate|deactivate|rollback)
├── actor_id (UUID)
├── changes (JSONB)
├── created_at
```

### 2.2 RPCs

| RPC | Descrição |
|-----|-----------|
| `create_template_version(p_template_id, p_subject, p_body, p_reason)` | Cria nova versão, valida variáveis, ativa automaticamente |
| `activate_template_version(p_template_id, p_version_id, p_reason)` | Ativa versão específica (usado para rollback) |
| `create_bu_template(p_bu_id, p_event_slug, p_channel, p_subject, p_body, p_reason)` | Cria template customizado para BU |
| `validate_template_variables(p_event_slug, p_body, p_subject)` | Valida variáveis contra catálogo |
| `resolve_notification_template(p_event_slug, p_channel, p_bu_id)` | Resolve template ativo (BU > Global) |

### 2.3 Permission Keys

| Key | Descrição |
|-----|-----------|
| `notifications.templates.read:bu` | Visualizar templates |
| `notifications.templates.edit:bu` | Editar e salvar versões |
| `notifications.templates.activate:bu` | Ativar versões |
| `notifications.templates.rollback:bu` | Fazer rollback |

Atribuídas automaticamente ao template `bu_admin`.

---

## 3. Componentes Frontend

### 3.1 Arquivos Criados

```
src/
├── hooks/
│   └── useNotificationTemplates.ts      # Hooks + mutations + utilities
├── components/notifications/templates/
│   ├── index.ts                         # Barrel export
│   ├── TemplatesList.tsx                # Lista com filtros
│   ├── TemplateEditorSheet.tsx          # Editor + preview
│   └── TemplateHistorySheet.tsx         # Histórico + rollback
└── lib/queryKeys.ts                     # QueryKeys atualizadas
```

### 3.2 Hooks

| Hook | Descrição |
|------|-----------|
| `useNotificationTemplates(buId, filters)` | Lista templates (BU + global) |
| `useNotificationTemplateVersions(templateId)` | Versões de um template |
| `useNotificationTemplateVariables(eventSlug)` | Variáveis disponíveis |
| `useNotificationTemplateAudit(templateId)` | Audit log |
| `useSaveTemplateVersion()` | Mutation: criar versão |
| `useActivateTemplateVersion()` | Mutation: ativar versão |
| `useCreateBuTemplate()` | Mutation: criar template BU |

### 3.3 QueryKeys

```typescript
notifications.templates.list(buId, filters)
notifications.templates.detail(templateId)
notifications.templates.versions(templateId)
notifications.templates.variables(eventSlug)
notifications.templates.audit(templateId)
```

---

## 4. Fluxo End-to-End

### 4.1 Editar Template

```
1. Usuário acessa /settings/notifications?tab=templates
2. Seleciona template na lista
3. Clica "Editar" → TemplateEditorSheet abre
4. Edita subject/body, insere variáveis da sidebar
5. Valida variáveis em tempo real (client-side)
6. Informa motivo (mín. 10 chars)
7. Clica "Salvar Nova Versão"
8. RPC create_template_version:
   - Valida variáveis (server-side)
   - Cria nova versão
   - Atualiza current_version_id
   - Registra audit log
9. Lista atualiza com nova versão
```

### 4.2 Rollback

```
1. Usuário clica "Histórico" no template
2. TemplateHistorySheet abre com lista de versões
3. Seleciona versão anterior
4. Clica "Ativar esta versão"
5. Dialog pede motivo (mín. 10 chars)
6. RPC activate_template_version:
   - Atualiza current_version_id
   - Registra audit log com action "rollback"
7. Lista atualiza mostrando versão ativada
```

### 4.3 Envio de Notificação

```
1. Evento dispara (ex: tickets.created)
2. process-notification-outbox Edge Function:
   - Chama resolve_notification_template(event_slug, channel, bu_id)
   - Prioriza template BU > global
   - Busca versão ativa (current_version_id)
   - Renderiza variáveis no body/subject
   - Envia via canal configurado
3. Outbox registra template_version_id usado
```

---

## 5. Segurança

### 5.1 RLS

- Templates: Leitura permitida para membros da BU + templates globais
- Versões: Mesma política do template pai
- Audit Log: Leitura somente para admins da BU
- Variáveis: Leitura pública (catálogo)

### 5.2 Validação

- **Client-side:** `validateTemplateVariables()` antes de salvar
- **Server-side:** `validate_template_variables()` no RPC
- **Resultado:** Dupla validação previne variáveis inválidas

### 5.3 Governança

- Motivo obrigatório (mín. 10 chars) para:
  - Criar versão
  - Ativar versão
  - Rollback
- Audit log imutável com actor_id e timestamp

---

## 6. UI Integrada

### 6.1 SettingsNotifications.tsx

Nova tab "Templates" adicionada:
- Position: Entre "Eventos" e "Outbox"
- Guard: `notifications.templates.read:bu`
- Grid: 6 colunas (era 5)

### 6.2 Features

- **Filtros URL State:** `tq` (busca), `tchannel` (canal)
- **Agrupamento:** Templates agrupados por módulo
- **Badges:** Canal, versão ativa, status (Global/Ativo)
- **Ações:** Editar, Histórico
- **Empty State:** Mensagem quando sem templates

---

## 7. QA

**Status: ✅ PASS**

Ver `docs/qa/QA_NOTIFICATIONS_PHASE5_TEMPLATES.md` para detalhes.

| Categoria | Pass | Fail |
|-----------|------|------|
| Acesso | 3 | 0 |
| Listagem | 6 | 0 |
| Editor | 7 | 0 |
| Histórico | 6 | 0 |
| Auditoria | 4 | 0 |
| Permissões | 5 | 0 |
| E2E | 3 | 0 |
| Server-Side | 3 | 0 |
| **TOTAL** | **37** | **0** |

---

## 8. Próximos Passos (Phase 5.1)

1. **Preview com dados reais:** Selecionar ticket/asset/okr existente para preview
2. **Diff visual:** Comparar versões lado a lado
3. **Bulk actions:** Ativar templates padrão para múltiplos eventos
4. **Templates obrigatórios:** Alertar se evento mandatory sem template ativo
5. **Diagnostics integration:** Mostrar templates com erro de renderização

---

## 9. Decisões Técnicas

| Decisão | Justificativa |
|---------|---------------|
| Auto-approve | Simplifica fluxo inicial; aprovação pode ser adicionada depois |
| Markdown simples | Menor complexidade; TipTap pode ser adicionado depois |
| Template global fallback | Garante que sempre existe um template para renderizar |
| Versão ativa no template | Evita JOIN extra no outbox para resolver versão |
| Audit log separado | Permite histórico completo sem poluir tabela de versões |

---

## 10. Conclusão

Phase 5 entrega sistema completo de templates com:
- ✅ Gerenciamento visual
- ✅ Versionamento
- ✅ Rollback
- ✅ Validação client + server
- ✅ Auditoria
- ✅ Permissões granulares
- ✅ Integração com outbox

**Build: PASS**
**QA: PASS**
**Pronto para produção.**
