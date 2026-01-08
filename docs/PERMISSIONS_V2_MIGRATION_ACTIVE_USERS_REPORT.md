# Relatório de Migração V2 - Usuários Ativos

**Data:** 2025-01-08  
**BU:** a0000000-0000-0000-0000-000000000001  
**Status Final:** ✅ PASS

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de Profiles na BU | 63 |
| Total de Memberships Ativas | 3 |
| Usuários Ativos Identificados | 3 |
| Usuários que receberam `collaborator_base_v2` | 2 |
| Usuários que já tinham templates V2 | 1 |
| Templates Órfãos Removidos | 1 |
| Migration Records Órfãos Removidos | 1 |
| **Status Final** | **PASS** |

---

## Detalhamento por Usuário

### Usuários Ativos Migrados

| Profile ID | Nome | Role na BU | Templates V2 | Ação |
|------------|------|------------|--------------|------|
| `110f72b1-ea51-4d31-8235-43aff585022e` | Vitor Severo de Carvalho | collaborator | 6 templates | Já tinha templates V2 |
| `f375b494-5edf-463e-97c1-c39206692759` | Victorio Venturini | admin | 1 template | Atribuído `collaborator_base_v2` |
| `f8afaa82-416d-4a29-86a2-65ebc4ec4b76` | Uriel Canfield | admin | 1 template | Atribuído `collaborator_base_v2` |

### Templates V2 Atuais (pós-migração)

| Usuário | Template | Slug |
|---------|----------|------|
| Uriel Canfield | Colaborador Base v2 | `collaborator_base_v2` |
| Victorio Venturini | Colaborador Base v2 | `collaborator_base_v2` |
| Vitor Severo de Carvalho | Colaborador Base v2 | `collaborator_base_v2` |
| Vitor Severo de Carvalho | OKRs: Visualização v2 | `okrs_view_v2` |
| Vitor Severo de Carvalho | OKRs: Operador v2 | `okrs_operate_v2` |
| Vitor Severo de Carvalho | KPIs: Visualização v2 | `kpis_view_v2` |
| Vitor Severo de Carvalho | KPIs: Operador v2 | `kpis_operate_v2` |
| Vitor Severo de Carvalho | Tickets: Operador v2 | `tickets_operate_v2` |

### Registros Órfãos Removidos

| Tipo | Profile | Nome | Motivo |
|------|---------|------|--------|
| Template Assignment | `e91b5a29-e01d-4b25-aa81-0633ebf3e6b0` | Verônica Bonotto Crestani | Sem membership ativa |
| Migration Record | `e91b5a29-e01d-4b25-aa81-0633ebf3e6b0` | Verônica Bonotto Crestani | Sem membership ativa |

---

## Critérios de Migração

1. **Usuário Ativo** = Profile com `deleted_at IS NULL` + Membership ativa na BU
2. **Template Base** = `collaborator_base_v2` (ID: `8623dcc6-8e83-4bfd-80e1-26d659570c55`)
3. **Órfão** = Assignment/Migration para profile sem membership ativa

---

## Queries Utilizadas

### 1. Identificar Usuários Ativos

```sql
SELECT 
  p.id as profile_id,
  p.user_id as auth_user_id,
  p.display_name,
  m.role_in_bu
FROM profiles p
INNER JOIN bu_user_memberships m 
  ON m.user_id = p.user_id AND m.bu_id = p.bu_id
WHERE p.bu_id = 'a0000000-0000-0000-0000-000000000001'
  AND p.deleted_at IS NULL;
```

### 2. Atribuir Templates Base

```sql
INSERT INTO bu_user_permission_templates_v2 (bu_id, user_id, template_id)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'f375b494-5edf-463e-97c1-c39206692759', '8623dcc6-8e83-4bfd-80e1-26d659570c55'),
  ('a0000000-0000-0000-0000-000000000001', 'f8afaa82-416d-4a29-86a2-65ebc4ec4b76', '8623dcc6-8e83-4bfd-80e1-26d659570c55')
ON CONFLICT DO NOTHING;
```

### 3. Remover Assignments Órfãos

```sql
DELETE FROM bu_user_permission_templates_v2 
WHERE id = '0653946a-d035-4870-a13c-67198cbfc955';
```

### 4. Atualizar Migration Records

```sql
INSERT INTO permission_migrations (bu_id, user_id, status, migrated_at, notes)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'f375b494-5edf-463e-97c1-c39206692759', 'migrated', now(), 'Auto-migrated: admin user'),
  ('a0000000-0000-0000-0000-000000000001', 'f8afaa82-416d-4a29-86a2-65ebc4ec4b76', 'migrated', now(), 'Auto-migrated: admin user')
ON CONFLICT (bu_id, user_id) DO UPDATE SET 
  status = 'migrated',
  migrated_at = now(),
  notes = EXCLUDED.notes;
```

### 5. Remover Migration Records Órfãos

```sql
DELETE FROM permission_migrations 
WHERE bu_id = 'a0000000-0000-0000-0000-000000000001' 
  AND user_id = 'e91b5a29-e01d-4b25-aa81-0633ebf3e6b0';
```

### 6. Verificação Final

```sql
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE bu_id = '...' AND deleted_at IS NULL) as total_profiles,
  (SELECT COUNT(*) FROM bu_user_memberships WHERE bu_id = '...') as total_memberships,
  (SELECT COUNT(*) FROM permission_migrations WHERE bu_id = '...' AND status = 'migrated') as migrated_count,
  (SELECT COUNT(DISTINCT user_id) FROM bu_user_permission_templates_v2 WHERE bu_id = '...') as users_with_v2;
```

---

## Verificação de Integridade

| Check | Resultado |
|-------|-----------|
| Todos usuários ativos têm template base | ✅ PASS |
| Nenhum órfão em `bu_user_permission_templates_v2` | ✅ PASS |
| Nenhum órfão em `permission_migrations` | ✅ PASS |
| `migrated_count` == `total_memberships` | ✅ PASS (3 == 3) |

---

## Próximos Passos

1. ✅ Tabelas V1 já removidas (Wave 8)
2. ✅ Frontend V1 hooks/components removidos
3. ⏳ Atribuir templates específicos para admins (BU Admin, etc.) se necessário
4. ⏳ Configurar auto-assignment de templates para novos usuários

---

*Relatório gerado automaticamente pelo sistema de migração V2*
