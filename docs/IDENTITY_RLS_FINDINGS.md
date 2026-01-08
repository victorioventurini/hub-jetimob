# Identity RLS Findings

**Data:** 2026-01-08  
**Status:** ✅ **TODAS AS CORREÇÕES APLICADAS**

---

## Resumo Executivo

Auditoria completa de policies RLS que comparavam `auth.uid()` com colunas que armazenam `profiles.id`.

**Resultado:** 15 policies corrigidas, 0 pendentes.

---

## Findings por Módulo

### OKRs (7 policies)

| Tabela | Policy | Expressão Anterior | Correção |
|--------|--------|-------------------|----------|
| `okr_checkins` | KR owners can create checkins | `kr.owner_user_id = auth.uid()` | `kr.owner_user_id = my_profile_id()` |
| `okr_dependencies` | KR owners can manage dependencies | `kr.owner_user_id = auth.uid()` | `kr.owner_user_id = my_profile_id()` |
| `okr_initiatives` | Users can update their own initiatives | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |
| `okr_initiatives` | Users can delete their own initiatives | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |
| `okr_org_key_results` | Users can cancel org key results | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |
| `okr_team_key_results` | KR owners can update their KRs | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |
| `okr_team_key_results` | Team leaders can manage their team KRs | `t.leader_user_id = auth.uid()` | `t.leader_user_id = my_profile_id()` |
| `okr_team_key_results` | Users can cancel team key results | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |
| `okr_team_objectives` | Team leaders can manage their team objectives | `t.leader_user_id = auth.uid()` | `t.leader_user_id = my_profile_id()` |
| `okr_team_objectives` | Users can cancel team objectives | `owner_user_id = auth.uid()` | `owner_user_id = my_profile_id()` |

### Tickets (5 policies)

| Tabela | Policy | Expressão Anterior | Correção |
|--------|--------|-------------------|----------|
| `tickets` | BU users can create tickets | `created_by_user_id = auth.uid()` | `created_by_user_id = my_profile_id()` |
| `tickets` | Ticket owners and admins can update | `created_by_user_id = auth.uid() OR owner_user_id = auth.uid()` | `= my_profile_id()` |
| `ticket_participants` | Ticket owners can manage participants | `t.created_by_user_id = auth.uid()` | `= my_profile_id()` |
| `ticket_messages` | Participants can create messages | `author_user_id = auth.uid()` | `author_user_id = my_profile_id()` |
| `ticket_messages` | Authors can edit their messages | `author_user_id = auth.uid()` | `author_user_id = my_profile_id()` |
| `ticket_attachments` | Participants can upload attachments | `uploaded_by_user_id = auth.uid()` | `uploaded_by_user_id = my_profile_id()` |

### KPIs (2 policies)

| Tabela | Policy | Expressão Anterior | Correção |
|--------|--------|-------------------|----------|
| `kpi_metrics` | Team leaders can manage their team KPIs | `t.leader_user_id = auth.uid()` | `t.leader_user_id = my_profile_id()` |
| `kpi_values` | KPI owners can insert values | `km.owner_user_id = auth.uid()` | `km.owner_user_id = my_profile_id()` |

### Teams (1 policy)

| Tabela | Policy | Expressão Anterior | Correção |
|--------|--------|-------------------|----------|
| `user_team_memberships` | Team leaders can manage memberships | `t.leader_user_id = auth.uid()` | `t.leader_user_id = my_profile_id()` |

---

## Policies Corretas (não alteradas)

As seguintes policies usam `auth.uid()` corretamente porque comparam com colunas que armazenam `auth.users.id`:

| Tabela | Policy | Justificativa |
|--------|--------|---------------|
| `profiles` | Users can update own profile | `profiles.user_id` é auth.users.id ✓ |
| `user_roles` | Users can view own role | `user_roles.user_id` é auth.users.id ✓ |
| `bu_user_memberships` | Users can view their own memberships | `bu_user_memberships.user_id` é auth.users.id ✓ |
| `user_preferences` | Users can manage own preferences | `user_preferences.user_id` é auth.users.id ✓ |
| `okr_coaching_events` | Select/Insert own events | `okr_coaching_events.user_id` é auth.users.id (auditável) ✓ |
| `user_notification_preferences_v2` | Users can manage preferences | `user_id` é auth.users.id ✓ |
| `notification_outbox` | Users can read own entries | `user_id` é auth.users.id ✓ |
| `partner_contacts` | Partner contacts can view themselves | `profile_user_id` é auth.users.id ✓ |

---

## Funções Canônicas Utilizadas

| Função | Retorno | Uso |
|--------|---------|-----|
| `my_profile_id()` | `profiles.id` | Converter auth.uid() → profiles.id em policies |
| `profile_id_from_user_id(uuid)` | `profiles.id` | Converter qualquer user_id para profile_id |
| `is_team_leader(user_id, team_id)` | `boolean` | Verificar liderança com conversão interna |
| `user_can_manage_team(user_id, team_id)` | `boolean` | Verificar permissão de gestão |

---

## Convenção Estabelecida

### Colunas que armazenam `profiles.id`:
- `owner_user_id` (OKRs, KPIs)
- `leader_user_id` (Teams)
- `created_by_user_id` (Tickets)
- `author_user_id` (Ticket messages)
- `current_user_id` (Assets)
- `performed_by_user_id` (Movements)

### Colunas que armazenam `auth.users.id`:
- `user_id` em `bu_user_memberships`
- `user_id` em `user_roles`
- `user_id` em `profiles`
- `user_id` em `okr_coaching_events` (auditável)
- `user_id` em tabelas de preferências

---

*Documento gerado em 2026-01-08*
