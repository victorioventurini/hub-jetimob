# System State Final Report — Hub da Jet

**Data:** 2026-01-10  
**Versão:** 1.0.0  
**Status:** Estado da Arte pós Identity Cutover v3.0  
**Referência:** TCR v2.13.0

---

## Resumo Executivo

Este documento consolida o estado técnico final do Hub da Jet após o **Identity Cutover v3.0**, representando o snapshot definitivo do sistema. Serve como:

- ✅ Histórico oficial de decisões arquiteturais
- ✅ Referência para auditorias técnicas
- ✅ Base para onboarding de novos engenheiros
- ✅ Prova de conformidade para stakeholders

---

## 1. Visão Geral do Sistema Pós-Cutover

### 1.1 Arquitetura Identity v3.0

O Hub opera em **profile-first architecture**, onde:

| Conceito | Implementação |
|----------|---------------|
| **Identidade de Autenticação** | `auth.users.id` via Supabase Auth |
| **Identidade de Domínio** | `profiles.id` (canônico) |
| **Conversão** | `my_profile_id()` retorna `profiles.id` do `auth.uid()` |
| **Escopo** | Dados operacionais escopados por `bu_id` via RLS |

### 1.2 Estado do Sistema

| Componente | Status | Versão |
|------------|--------|--------|
| Identity Convention | ✅ V3.0 Ativo | profile-first completo |
| RBAC | ✅ V2-only | Templates + permission keys |
| BU Scope | ✅ Enforced | RLS + triggers + headers |
| Canary Gates | ✅ Ativos | `identity_cutover_strict = false` (fallback) |
| CI Gates | ✅ Ativos | 14 audits blocking |
| V1 Legacy | ❌ Removido | Sunset completo |

---

## 2. O Que Foi Removido Definitivamente

### 2.1 Tabelas e Estruturas V1 (REMOVIDAS)

| Artefato | Status | Data Remoção |
|----------|--------|--------------|
| `permission_groups` | ❌ REMOVIDO | 2026-01-09 |
| `bu_user_permission_groups` | ❌ REMOVIDO | 2026-01-09 |
| `group_permissions` | ❌ REMOVIDO | 2026-01-09 |
| `permission_group_*` (triggers) | ❌ REMOVIDO | 2026-01-09 |
| Funções V1 de permissão | ❌ REMOVIDO | 2026-01-09 |

### 2.2 Padrões Legados (PROIBIDOS)

| Padrão | Status | Substituto |
|--------|--------|------------|
| `auth.uid() = owner_user_id` | ❌ PROIBIDO | `my_profile_id() = owner_user_id` |
| `is_bu_member(user_id, bu_id)` | ⚠️ DEPRECATED | `is_profile_bu_member(profile_id, bu_id)` |
| `is_bu_admin(user_id, bu_id)` | ⚠️ DEPRECATED | `is_profile_bu_admin(profile_id, bu_id)` |
| `user_has_bu_access(user_id, bu_id)` | ⚠️ DEPRECATED | `is_profile_bu_member(...)` |
| `useAuth().user.id` para ownership | ❌ PROIBIDO | `useIdentity().profileId` |
| `supabase` global em módulos | ❌ PROIBIDO | `useBuScopedSupabase()` |
| `select('*')` | ❌ PROIBIDO | Campos explícitos |
| Query keys inline | ❌ PROIBIDO | `src/lib/queryKeys.ts` |
| Hardcode de roles | ❌ PROIBIDO | Permission keys |

### 2.3 Features Removidas

| Feature | Motivo | Data |
|---------|--------|------|
| Global Search (frontend + backend) | Arquitetura inadequada (38+ instâncias Supabase) | 2026-01-10 |
| Permission Groups V1 | Substituído por Templates V2 | 2026-01-09 |
| send_magic_link Edge Function | Deprecado por Supabase Auth nativo | 2026-01-08 |

---

## 3. Padrões Canônicos (Fonte de Verdade)

### 3.1 Identidade

| Função SQL | Retorno | Uso |
|------------|---------|-----|
| `my_profile_id()` | `profiles.id` | Ownership, RLS policies |
| `my_profile_id_strict()` | `profiles.id` (throws) | Quando profile é obrigatório |
| `profile_id_from_user_id(uuid)` | `profiles.id` | Conversão explícita |
| `user_id_from_profile_id(uuid)` | `auth.users.id` | Conversão reversa (raro) |

### 3.2 BU Scope

| Função SQL | Retorno | Uso |
|------------|---------|-----|
| `current_bu_id()` | `uuid` | Retorna BU do header (nunca NULL) |
| `is_current_bu(bu_id)` | `boolean` | Helper para RLS |
| `assert_bu_scope(bu_id)` | `boolean` | Trigger validation |

### 3.3 Autorização Profile-First

| Função SQL | Uso |
|------------|-----|
| `is_profile_bu_member(profile_id, bu_id)` | Verifica membership |
| `is_profile_bu_admin(profile_id, bu_id)` | Verifica admin role |
| `get_profile_bus(profile_id)` | Lista BUs do profile |
| `has_permission(user_id, bu_id, permission_key)` | Verifica permissão específica |
| `get_my_permissions(bu_id)` | Lista todas permissions do usuário |

### 3.4 Hierarquia de Times

| Função SQL | Uso |
|------------|-----|
| `is_team_leader(user_id, team_id)` | Líder direto |
| `user_can_manage_team(user_id, team_id)` | Regra final de gestão |
| `get_manageable_teams(user_id, bu_id)` | Times gerenciáveis |
| `can_manage_team_okr(user_id, team_id)` | Pode gerenciar OKRs do time |

### 3.5 Views Canônicas

| View | Propósito | Escopo |
|------|-----------|--------|
| `v_bu_active_profiles` | Perfis ativos por BU | BU-scoped |
| `v_bu_memberships_active` | Memberships ativos | BU-scoped |
| `v_profiles_directory` | Diretório global de perfis | Global |
| `v_bu_all_profiles_admin` | Admin view completa | BU-scoped |
| `v_objective_health` | Saúde de OKRs | BU-scoped |
| `v_pending_checkins` | Check-ins pendentes | BU-scoped |

---

## 4. Decisões Irreversíveis

As seguintes decisões são **FINAIS e IRREVERSÍVEIS**:

### 4.1 Arquiteturais

| Decisão | Justificativa | Impacto |
|---------|---------------|---------|
| Profile-first identity | Suporta pré-registro, multi-BU, soft delete | Todas as colunas de domínio referenciam `profiles.id` |
| V2-only RBAC | Simplicidade, permission keys como primitivo | Templates V2 são o único mecanismo |
| BU scope enforcement | Segurança multi-tenant | Toda tabela operacional tem `bu_id` |
| Header-based BU context | Permite RLS sem session variables | `x-current-bu-id` em toda requisição |

### 4.2 Operacionais

| Decisão | Status |
|---------|--------|
| Magic Link como único método de auth | ✅ Definitivo |
| SendGrid como provider de email | ✅ Definitivo |
| Soft delete via `deleted_at` | ✅ Padrão obrigatório |
| Lovable Cloud como backend | ✅ Definitivo |

---

## 5. Decisões que Admitem Evolução Futura

| Área | Estado Atual | Evolução Possível |
|------|--------------|-------------------|
| Canary gates | Fallback ativo (`identity_cutover_strict = false`) | Ativar strict mode após deadline (2026-02-15) |
| Funções legadas | Deprecated com fallback | Remoção total após strict mode |
| Notificações por email | Cron cada 1 min | Event-driven com queue |
| Realtime | Polling + channel subscription | Optimistic updates |
| Storage | Supabase Storage | CDN + edge caching |

---

## 6. Métricas de Conformidade

### 6.1 Cobertura de Migrations

| Módulo | Tabelas Migradas | RLS Completo | Profile-First |
|--------|------------------|--------------|---------------|
| OKRs | 12/12 | ✅ | ✅ |
| Teams | 4/4 | ✅ | ✅ |
| Tickets | 6/6 | ✅ | ✅ |
| Assets | 14/14 | ✅ | ✅ |
| KPIs | 2/2 | ✅ | ✅ |
| Notifications | 10/10 | ✅ | ✅ |
| Permissions | 7/7 | ✅ | ✅ |

### 6.2 CI Gates Ativos

| Gate | Status | Severidade |
|------|--------|------------|
| BU Scope | ✅ Ativo | BLOCKING |
| Identity Convention | ✅ Ativo | BLOCKING |
| User Directory | ✅ Ativo | BLOCKING |
| RBAC V2 | ✅ Ativo | BLOCKING |
| Supabase Client | ✅ Ativo | BLOCKING |
| Query Keys | ✅ Ativo | BLOCKING |
| Data Model Registry | ✅ Ativo | BLOCKING |
| Docs vs TCR | ✅ Ativo | BLOCKING |
| Overfetch | ✅ Ativo | WARNING |
| URL State | ✅ Ativo | WARNING |
| Permission Keys | ✅ Ativo | BLOCKING |
| PRE-BU vs POST-BU | ✅ Ativo | BLOCKING |
| Shared Components | ✅ Ativo | BLOCKING |
| Shared Utilities | ✅ Ativo | BLOCKING |

---

## 7. Referências de Documentação

| Documento | Propósito | Status |
|-----------|-----------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | TCR principal | ✅ v2.13.0 |
| `DEVELOPMENT_STANDARDS.md` | Padrões de desenvolvimento | ✅ v1.1.0 |
| `DATA_MODEL_REGISTRY.md` | Schema do banco | ✅ Atualizado |
| `IDENTITY_CONVENTION.md` | Convenção de identidade | ✅ v2.0.0 |
| `RBAC_TEMPLATES_V3.md` | Sistema de permissões | ✅ v3.0 |
| `COMPLIANCE_BASELINE.md` | Audits obrigatórios | ✅ v1.0.0 |
| `SHARED_COMPONENTS_REGISTRY.md` | Componentes canônicos | ✅ v1.0.0 |
| `BU_SCOPED_SUPABASE_RULES.md` | Regras de cliente Supabase | ✅ Normativo |
| `QUERY_KEYS_STANDARD.md` | Padrão de query keys | ✅ Normativo |
| `URL_STATE_STANDARD.md` | Padrão de URL state | ✅ Normativo |

---

## 8. Histórico de Cutover

| Data | Evento | Impacto |
|------|--------|---------|
| 2026-01-07 | Identity Unification v2.0 | Migração de FKs para profiles.id |
| 2026-01-08 | Identity Unification v2.2 | Funções profile-first, views canônicas |
| 2026-01-09 | Identity Cutover v3.0 | Canary gates, sunset V1, strict mode |
| 2026-01-10 | Consolidação Final | Este relatório, documentação completa |

---

## 9. Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| **Engenharia** | Manter conformidade com padrões |
| **QA** | Validar migrations e RLS |
| **Product** | Priorizar débito técnico quando necessário |
| **AI Assistant** | Seguir TCR como fonte de verdade |

---

## 10. Próximos Passos (Pós-Cutover)

| Ação | Deadline | Responsável |
|------|----------|-------------|
| Ativar `identity_cutover_strict = true` | 2026-02-15 | DBA |
| Remover funções legacy (`is_bu_member`, etc.) | 2026-03-01 | DBA |
| Audit de performance pós-profile-first | 2026-02-01 | Engenharia |
| Documentar runbooks de troubleshooting | 2026-02-15 | Engenharia |

---

*Este documento representa o estado oficial do sistema em 2026-01-10.*
*Qualquer divergência entre este documento e o código deve ser reportada.*
