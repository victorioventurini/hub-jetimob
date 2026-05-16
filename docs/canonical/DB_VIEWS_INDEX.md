# Database Views — Catálogo Canônico

> SSOT de navegação das 27 views públicas do banco. **Não renomear sem rito de migração coordenada** (RLS, hooks, edge functions, painéis admin).

## 📊 Por Domínio

### 🔐 Auth & Identity (4)
| View | Descrição |
|------|-----------|
| `v_bu_active_profiles` | Perfis ativos por BU (filtrado por employment_status) |
| `v_bu_all_profiles_admin` | Todos perfis (admin/global view) |
| `v_bu_memberships_active` | Memberships ativos por BU |
| `v_profiles_directory` | Diretório com privacy aplicada (RPC `get_profile_with_privacy`) |

### 🛡️ Health & Diagnostics (6)
| View | Descrição |
|------|-----------|
| `v_identity_health_check` | Diagnóstico de inconsistências de identidade |
| `identity_rls_violations` | Violações de RLS detectadas |
| `v_bu_id_null_report` | Linhas órfãs sem BU (auditoria multi-tenancy) |
| `v_perf_indexes_report` | Saúde de índices (uso/desuso) |
| `v_permission_risk_report` | Riscos de permissão por BU |
| `v_permissions_without_explanation` | Permissões sem texto de explanation |

### 📬 Notifications (5)
| View | Descrição |
|------|-----------|
| `v_notification_delivery_health` | Saúde geral de entregas |
| `v_notification_failures` | Falhas recentes |
| `v_notification_slo_by_channel_daily` | SLO por canal/dia |
| `v_notification_slo_by_event_daily` | SLO por evento/dia |
| `v_notification_slo_summary_7d` | Resumo SLO 7 dias |

### 🎯 OKRs (4)
| View | Descrição |
|------|-----------|
| `v_objective_health` | Saúde efetiva dos objetivos |
| `v_okr_insights_active` | Insights ativos do Vic |
| `v_pending_checkins` | Check-ins pendentes |
| `v_shared_okrs_summary` | Resumo de OKRs compartilhados |
| `v_team_contributed_okrs` | OKRs com contribuições cross-team |

### 🤝 Partners (2)
| View | Descrição |
|------|-----------|
| `v_partner_services` | Serviços de parceiros (global) |
| `v_partner_services_by_bu` | Serviços filtrados por BU |
| `v_all_participants` | Camada unificada (profiles + partner_contacts) |

### 👥 Teams (1)
| View | Descrição |
|------|-----------|
| `v_teams_clean` | Times sem soft-deleted |

### 🤖 AI (1)
| View | Descrição |
|------|-----------|
| `v_ai_agents_public` | Agentes AI visíveis publicamente |

### 🔧 Admin Operacional (2)
| View | Descrição |
|------|-----------|
| `users_without_v2_permissions` | Usuários sem template V2 |
| `v_users_without_templates` | Variante (legacy) |

## 🚦 Política de Renomeação

| Cenário | Ação |
|---------|------|
| Nova view | Usar prefixo `v_<dominio>_<nome>` (ex: `v_okr_health_summary`) |
| View legada (sem `v_`) | **Não renomear** — criar nova view + deprecar a antiga em ondas |
| Duplicação detectada (`v_users_without_templates` ≈ `users_without_v2_permissions`) | Marcar uma como deprecated em comment + plano para fundir |

## 🔄 Manutenção

- Atualizar este índice ao criar/alterar/dropar views
- `security_invoker = true` é o padrão (`docs/architecture/security-privilege-policy`)
- Toda view que retorna dados BU-scoped DEVE filtrar via RLS dos seus base tables

---

## 🔄 Auto-Generated Reference (do banco)

<!-- @generated:db-views:start -->

<!-- Gerado automaticamente por scripts/generate-db-views-index.ts — NÃO EDITAR -->
> **Gerado em:** 2026-05-16T21:56:26.436Z
> **Total:** 29 views no schema `public`

| View | Colunas | security_invoker |
|------|---------|------------------|
| `identity_rls_violations` | 6 | ✅ |
| `users_without_v2_permissions` | 6 | ✅ |
| `v_ai_agents_public` | 11 | ✅ |
| `v_all_participants` | 12 | ✅ |
| `v_bu_active_profiles` | 24 | ❌ |
| `v_bu_all_profiles_admin` | 23 | ✅ |
| `v_bu_id_null_report` | 3 | ❌ |
| `v_bu_memberships_active` | 26 | ✅ |
| `v_identity_health_check` | 6 | ❌ |
| `v_notification_delivery_health` | 8 | ✅ |
| `v_notification_failures` | 11 | ✅ |
| `v_notification_slo_by_channel_daily` | 9 | ✅ |
| `v_notification_slo_by_event_daily` | 7 | ✅ |
| `v_notification_slo_summary_7d` | 9 | ✅ |
| `v_objective_health` | 6 | ✅ |
| `v_okr_insights_active` | 13 | ✅ |
| `v_partner_services` | 14 | ✅ |
| `v_partner_services_by_bu` | 12 | ❌ |
| `v_pending_checkins` | 20 | ❌ |
| `v_perf_indexes_report` | 3 | ❌ |
| `v_permission_risk_report` | 8 | ❌ |
| `v_permissions_without_explanation` | 5 | ❌ |
| `v_profiles_directory` | 19 | ❌ |
| `v_ritual_attendance_summary` | 10 | ✅ |
| `v_ritual_evaluation_summary` | 15 | ✅ |
| `v_shared_okrs_summary` | 14 | ❌ |
| `v_team_contributed_okrs` | 11 | ❌ |
| `v_teams_clean` | 15 | ✅ |
| `v_users_without_templates` | 6 | ❌ |

<!-- @generated:db-views:end -->
