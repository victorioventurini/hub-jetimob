# Identity Convention Cheat Sheet

> **REGRA DE OURO:** Colunas com `*_user_id` podem armazenar `profiles.id` ou `auth.users.id`. **SEMPRE verifique o comentário da coluna ou esta lista antes de fazer JOINs.**

---

## 🔴 COLUNAS LEGADAS (armazenam `profiles.id`)

Estas colunas têm nomes enganosos mas **NÃO armazenam `auth.users.id`**:

### Tickets
| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `tickets` | `owner_user_id` | `ON p.id = t.owner_user_id` |
| `tickets` | `created_by_user_id` | `ON p.id = t.created_by_user_id` |
| `ticket_messages` | `author_user_id` | `ON p.id = tm.author_user_id` |
| `ticket_participants` | `profile_id` ✅ | `ON p.id = tp.profile_id` |
| `ticket_attachments` | `uploaded_by_user_id` | `ON p.id = ta.uploaded_by_user_id` |

### OKRs
| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `okr_org_objectives` | `owner_user_id` | `ON p.id = o.owner_user_id` |
| `okr_org_key_results` | `owner_user_id` | `ON p.id = kr.owner_user_id` |
| `okr_team_objectives` | `owner_user_id` | `ON p.id = o.owner_user_id` |
| `okr_team_key_results` | `owner_user_id` | `ON p.id = kr.owner_user_id` |
| `okr_checkins` | `user_id` | `ON p.id = c.user_id` |
| `okr_initiatives` | `owner_user_id` | `ON p.id = i.owner_user_id` |

### Assets
| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `asset_inventory` | `current_user_id` | `ON p.id = a.current_user_id` |
| `asset_movements` | `from_user_id` | `ON p.id = m.from_user_id` |
| `asset_movements` | `to_user_id` | `ON p.id = m.to_user_id` |
| `asset_movements` | `performed_by_user_id` | `ON p.id = m.performed_by_user_id` |

### Teams
| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `teams` | `leader_user_id` | `ON p.id = t.leader_user_id` |
| `user_team_memberships` | `user_id` | `ON p.id = utm.user_id` |
| `squad_memberships` | `user_id` | `ON p.id = sm.user_id` |

### Outros
| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `kpi_metrics` | `owner_user_id` | `ON p.id = k.owner_user_id` |
| `mentions` | `mentioned_user_id` | `ON p.id = m.mentioned_user_id` |
| `user_saved_links` | `user_id` | `ON p.id = usl.user_id` |

---

## 🟢 COLUNAS QUE USAM `auth.users.id`

Estas colunas **realmente armazenam** `auth.users.id`:

| Tabela | Coluna | JOIN correto |
|--------|--------|--------------|
| `bu_user_memberships` | `user_id` | `ON au.id = bum.user_id` |
| `profiles` | `user_id` | `ON au.id = p.user_id` |
| `user_roles` | `user_id` | `ON au.id = ur.user_id` |
| `notifications` | `user_id` | `ON au.id = n.user_id` |
| `notification_outbox` | `user_id` | `ON au.id = no.user_id` |
| `partner_contacts` | `user_id` | `ON au.id = pc.user_id` |

---

## 🔧 FUNÇÕES SQL CANÔNICAS

| Função | Retorna | Uso |
|--------|---------|-----|
| `auth.uid()` | `auth.users.id` | Sessão de autenticação |
| `my_profile_id()` | `profiles.id` | **USE PARA COLUNAS LEGADAS** |
| `my_profile_id_strict()` | `profiles.id` | Idem, mas lança exceção se não existir |

---

## 📋 REGRAS PARA NOVOS DESENVOLVIMENTOS

1. **Ao criar nova tabela:** Use `profile_id` (não `user_id`) para ownership
2. **Em RLS policies:** Compare colunas legadas com `my_profile_id()`, nunca `auth.uid()`
3. **No frontend:** Use `useIdentity().profileId` para ownership
4. **Em triggers:** Sempre verificar o comentário da coluna antes de fazer JOINs

---

## 🧪 VALIDAÇÃO

```bash
# Rodar audit de convenção de identidade
npx tsx scripts/audit-identity-convention.ts
```

---

*Documento gerado em 2026-01-21. Mantenha sincronizado com IDENTITY_CONVENTION.md*
