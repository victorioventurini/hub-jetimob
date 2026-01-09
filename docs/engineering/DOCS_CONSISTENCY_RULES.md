# Regras de Consistência de Documentação

**Versão:** 1.0.0  
**Última atualização:** 2026-01-09  
**Status:** Normativo

---

## Objetivo

Este documento define as regras canônicas que toda documentação do Hub deve respeitar.
O script `scripts/audit-docs-vs-tcr.ts` valida automaticamente a conformidade.

---

## 1. Termos Proibidos (Erro Imediato)

Estes termos indicam contradição direta com o TCR e **sempre bloqueiam PR**:

| Termo Proibido | Motivo | Correto |
|----------------|--------|---------|
| `permission_groups` | Tabela V1 removida | `permission_templates_v2` |
| `user_permission_groups` | Tabela V1 removida | `bu_user_permission_templates_v2` |
| `V1 templates` | Sistema removido Wave 9 | `V2 templates` |
| `V1 permissions` | Sistema removido Wave 9 | `V2 permissions` |
| `profiles.email` | Campo inexistente | `profiles.work_email` |
| `/bu/:buId/` | URL pattern removido | `/module/entity/:id` ou `/go/:entity/:id` |
| `buId na URL` | Pattern removido | URL sem buId |
| `send_test_notification` (sem v2) | RPC deprecated | `send_test_notification_v2` |
| `net.http_post` cron | Pattern removido | Edge Function cron |
| `pg_cron com net.http_post` | Pattern removido | Edge Function cron |
| `WhatsApp channel` | Canal não implementado | Canais: `in_app`, `email`, `slack`, `webhook` |
| `SMS channel` | Canal não implementado | Canais: `in_app`, `email`, `slack`, `webhook` |
| `telegram channel` | Canal não implementado | Canais: `in_app`, `email`, `slack`, `webhook` |

---

## 2. Afirmações Incompatíveis (Erro Imediato)

Afirmações que contradizem regras canônicas:

| Afirmação Proibida | Regra Correta |
|--------------------|---------------|
| "User directory filtra por membership" | User Directory v2: `v_bu_active_profiles` lista todos com `profiles.bu_id`, sem depender de `bu_user_memberships` |
| "UI envia auth_user_id" | UI passa `profile.id`; backend resolve `auth_user_id` via RPC |
| "comparar auth.uid() com owner_user_id" | Usar `my_profile_id()` para comparações de ownership |
| "usar supabase global para dados operacionais" | Usar `useBuScopedSupabase()` para dados POST-BU |
| "líder pode gerenciar time pai" | Líder gerencia apenas próprio time + filhos diretos |
| "select('*')" como recomendação | Sempre listar campos explícitos |
| "permission keys hardcoded" | Usar `usePermissions()` + catálogo |

---

## 3. Termos Permitidos APENAS em Contexto Histórico

Estes termos podem aparecer **apenas** se precedidos de marcador histórico:

| Termo | Marcadores Aceitos |
|-------|-------------------|
| `V1` (quando se referindo a sistema removido) | `> Historical Note:`, `> Legacy:`, `## Histórico`, `### Contexto Histórico`, `WAVE*_REPORT`, `_SUNSET_` no filename |
| `permission_groups` (como referência histórica) | Idem |
| `pg_cron http` | Idem |

### Marcadores Históricos Válidos

```markdown
> Historical Note: O sistema V1 foi removido na Wave 9.

> Legacy: Antes da migração, usávamos permission_groups.

## Histórico
Até 2025, o sistema usava V1 templates.

### Contexto Histórico
Esta seção documenta o estado anterior à Wave 9.
```

---

## 4. Tabelas Removidas (Referências Proibidas)

Estas tabelas foram removidas e não podem ser referenciadas como existentes:

| Tabela | Status | Substituída por |
|--------|--------|-----------------|
| `permission_groups` | Removida Wave 9 | `permission_templates_v2` |
| `permission_group_permissions` | Removida Wave 9 | `permission_template_permissions_v2` |
| `user_permission_groups` | Removida Wave 9 | `bu_user_permission_templates_v2` |

---

## 5. Regras Canônicas (Resumo)

### 5.1 Identity

| Regra | Descrição |
|-------|-----------|
| UI passa `profile.id` | Selects, hooks, UI usam `profiles.id` |
| Backend resolve `auth_user_id` | RPCs que precisam de `auth.users.id` resolvem internamente |
| `notifications.user_id` é `auth.users.id` | FK para `auth.users`, não para `profiles` |
| Branded types obrigatórios | `ProfileId`, `AuthUserId` com cast explícito |

### 5.2 Supabase Client

| Contexto | Cliente |
|----------|---------|
| PRE-BU (auth, bootstrap) | `supabase` global ou `useOptionalBuClient()` |
| POST-BU (operacional) | `useBuScopedSupabase()` obrigatório |
| Realtime | `supabase` global com gating por `buId` |

### 5.3 User Directory

| Regra | Descrição |
|-------|-----------|
| View canônica | `v_bu_active_profiles` |
| Filtro | `bu_id = current_bu_id()` |
| NÃO depende de membership | Usuários aparecem mesmo sem login/membership |
| Hook padrão | `useBuUsersDirectory()` |
| Componentes | `BuUserSelect`, `BuUserMultiSelect` |

### 5.4 Permissões

| Regra | Descrição |
|-------|-----------|
| Sistema único | V2 Templates |
| Catálogo | `permission_catalog` (160 keys) |
| Templates | `permission_templates_v2` (27 templates) |
| Presets | `permission_presets_v2` (12 presets) |
| Governance | Diff visual + reason obrigatórios |

### 5.5 Notificações

| Regra | Descrição |
|-------|-----------|
| Canais ativos | `in_app`, `email`, `slack`, `webhook` |
| Canais NÃO ativos | `whatsapp`, `sms`, `telegram` |
| Outbox pattern | Processamento assíncrono |
| Health monitoring | Alertas automáticos |

### 5.6 OKRs

| Regra | Descrição |
|-------|-----------|
| Scope de times | Líder vê próprio time + descendentes |
| Limites | 3 objectives por time, 3 KRs por objective |
| Check-ins | Modal + página de ciclo (`/okrs/checkins`) |
| RPC consolidada | `get_cycle_checkins` |

### 5.7 URLs

| Regra | Descrição |
|-------|-----------|
| Links compartilháveis | `/go/:entity/:id` |
| Sem buId na URL | BU vem do contexto, não da URL |
| URL State | Filtros, busca, paginação VÃO para URL |

---

## 6. Arquivos Isentos de Validação

Estes patterns de arquivo podem conter termos históricos sem erro:

| Pattern | Motivo |
|---------|--------|
| `docs/qa/*.md` | Checklists podem referenciar histórico |
| `docs/*REPORT*.md` | Reports de Waves documentam transições |
| `docs/*SUNSET*.md` | Documentos de sunset são históricos por natureza |
| `docs/deprecated/*.md` | Pasta de documentação deprecated (se existir) |

---

## 7. Como Corrigir Findings

### 7.1 Termo Proibido

```markdown
<!-- ❌ ERRO -->
O sistema usa permission_groups para gerenciar acessos.

<!-- ✅ CORRETO -->
O sistema usa permission_templates_v2 para gerenciar acessos.
```

### 7.2 Afirmação Incompatível

```markdown
<!-- ❌ ERRO -->
O User Directory filtra usuários que têm membership na BU.

<!-- ✅ CORRETO -->
O User Directory usa a view v_bu_active_profiles, que lista todos os profiles 
com bu_id correspondente, independente de membership.
```

### 7.3 Contexto Histórico

```markdown
<!-- ❌ ERRO: V1 sem contexto -->
O sistema V1 permitia criação de grupos customizados.

<!-- ✅ CORRETO: Com marcador histórico -->
> Historical Note: O sistema V1 (removido na Wave 9) permitia criação de 
> grupos customizados. O sistema atual usa templates pré-definidos.
```

---

## 8. Execução do Audit

```bash
# Rodar localmente
npx tsx scripts/audit-docs-vs-tcr.ts

# Saída esperada (sucesso)
✅ PASS: Nenhuma contradição encontrada em docs/**

# Saída esperada (erro)
❌ FAIL: 2 contradições encontradas

docs/example.md:15
  Termo proibido: "permission_groups"
  Regra: Tabela V1 removida na Wave 9
  Correto: Use "permission_templates_v2"

docs/another.md:42
  Afirmação incompatível: "UI envia auth_user_id"
  Regra: UI passa profile.id; backend resolve auth_user_id
```

---

## Changelog

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0.0 | 2026-01-09 | Versão inicial |
