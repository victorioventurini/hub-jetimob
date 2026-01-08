# Wave 7 — Sunset V1 Implementation Report

**Data:** 2026-01-08  
**Versão:** 1.1.0  
**Status:** ✅ COMPLETO  
**Build:** PASS

---

## Resumo Executivo

Wave 7 implementa o "sunset" do sistema de permissões V1:

1. **✅ Freeze de tabelas V1** — Triggers bloqueiam INSERT/UPDATE/DELETE
2. **✅ UI V1 read-only** — Ações de edição V1 removidas
3. **✅ Migration tracking** — Tabela e RPCs para rastrear migração por usuário
4. **✅ Migration Dashboard** — UI para acompanhar progresso por BU
5. **✅ Audit script** — Detecta uso residual de V1 no frontend

---

## 1. Migrations Executadas

### 1.1 Tabela permission_migrations
```sql
CREATE TABLE public.permission_migrations (
  id uuid PRIMARY KEY,
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  status text CHECK (status IN ('not_started', 'migrated', 'verified')),
  v1_groups_snapshot jsonb,
  v2_templates_applied jsonb,
  migrated_at timestamptz,
  migrated_by uuid,
  verified_at timestamptz,
  verified_by uuid,
  notes text,
  UNIQUE(bu_id, user_id)
);
```

### 1.2 Triggers de Freeze V1
```sql
-- Aplicados a:
-- - permission_groups
-- - permission_group_permissions
-- - bu_permission_group_configs
-- - bu_user_permission_groups

CREATE TRIGGER trg_block_*_write
  BEFORE INSERT OR UPDATE OR DELETE
  EXECUTE FUNCTION block_v1_writes();
```

### 1.3 RPCs Criadas

| RPC | Descrição |
|-----|-----------|
| `get_bu_migration_status(p_bu_id)` | Retorna estatísticas de migração da BU |
| `mark_user_migrated(...)` | Marca usuário como migrado |
| `verify_user_migration(...)` | Marca migração como verificada |
| `log_legacy_key_usage(...)` | Loga uso de keys antigas (auditoria) |

---

## 2. Mapa V1 vs V2

Ver: [WAVE7_V1_V2_MAP.md](./WAVE7_V1_V2_MAP.md)

### Resumo:
| Componente | V1 (Legado) | V2 (Canônico) |
|------------|-------------|---------------|
| Templates | permission_groups | permission_templates_v2 |
| Items | permission_group_permissions | permission_template_items_v2 |
| BU Config | bu_permission_group_configs | — |
| Assignments | bu_user_permission_groups | bu_user_permission_templates_v2 |

---

## 3. V1 Freeze (Como Implementado)

### 3.1 Triggers
Cada tabela V1 tem trigger `BEFORE INSERT OR UPDATE OR DELETE`:
- Verifica `is_platform_admin(auth.uid())`
- Se não for platform_admin, RAISE EXCEPTION
- super_admin mantém bypass para emergências

### 3.2 Comentários de Deprecação
```sql
COMMENT ON TABLE permission_groups IS '@deprecated — READ-ONLY since Wave 7';
```

### 3.3 Efeito
- Frontend não consegue mais escrever em V1 (hooks falham)
- RLS continua permitindo SELECT
- Compatibilidade mantida para usuários não migrados

---

## 4. UI Atualizada

| Path | Alteração |
|------|-----------|
| /settings/permissions?tab=templates | Alert de deprecação + badge "v1 (legado)" + opacity-70 |
| /settings/permissions?tab=templates | Switch removido, apenas Badge de status |
| /settings/permissions?tab=templates | Ícone Eye (view-only) substituiu Settings |
| /hub/permissions | Tab renomeada "Grupos v1" |
| /hub/permissions | Nova tab "Migração" com badge v2 |
| /hub/permissions | MigrationDashboard com stats e progress |
| /hub/permissions (sheet) | Tabs v1 (read-only) / v2 (editable) / Preview |

---

## 5. Componentes Criados

### MigrationDashboard.tsx
- 4 cards: Total, Migrados, Verificados, Pendentes
- Progress bar com % migração
- Alert informativo sobre o processo
- Instruções passo-a-passo
- Modo compact para exibição inline

### useMigrationTracking.ts
| Hook | Função |
|------|--------|
| `useBuMigrationStatus` | Status geral da BU |
| `useUserMigrationStatus` | Status de um usuário |
| `useMigrationActions` | Marcar migrado/verificado |

---

## 6. Estado de Migração por BU

Dashboard disponível em: `/hub/permissions?tab=migration`

| Métrica | Descrição |
|---------|-----------|
| total_users | Total de usuários na BU |
| migrated_users | Usuários com templates v2 |
| verified_users | Migrações confirmadas |
| not_started_users | Pendentes |
| migration_percentage | % completo |

---

## 7. Resultados dos Audits

### 7.1 audit-permissions-v1-usage.ts
```
Status: ✅ CRIADO E VALIDADO
Write operations: 0
Read operations: Apenas em hooks read-only (esperado)
```

### 7.2 audit-rbac.ts
```
Status: ✅ PASS
Hardcode de role: 0 violações
```

### 7.3 audit-bu-scope.ts
```
Status: ✅ PASS
Todas queries com BU scope
```

---

## 8. QA Status

Ver: [QA_WAVE7_SUNSET_V1.md](../qa/QA_WAVE7_SUNSET_V1.md)

**Status:** ✅ APROVADO (32/32 cenários)

| Categoria | Pass | Total |
|-----------|------|-------|
| Freeze V1 | 5 | 5 |
| Templates V2 | 6 | 6 |
| Compatibilidade | 4 | 4 |
| Migração | 6 | 6 |
| Restrições | 3 | 3 |
| Hardcode | 3 | 3 |
| UI | 5 | 5 |

---

## 9. Plano Wave 8

### 9.1 Após 30 dias de observação:
- [ ] Verificar logs de `LEGACY_KEY_USED`
- [ ] Confirmar 100% migração em todas as BUs
- [ ] Adicionar `sunset_at` nos aliases

### 9.2 Após 60 dias:
- [ ] Remover aliases deprecados
- [ ] DROP tabelas V1 (backup antes)
- [ ] Remover hooks V1 do frontend
- [ ] Limpar código legado

### 9.3 Critérios para DROP:
1. Zero escrita em V1 por 30 dias
2. 100% usuários migrados e verificados
3. Zero logs de legacy key usage
4. Aprovação de stakeholders

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Usuário perde acesso após migração | Preview/diff antes de aplicar |
| V1 ainda necessário | Trigger permite bypass para super_admin |
| Rollback necessário | v1_groups_snapshot salvo na migração |
| Aliases quebram | resolve_permission_key testado |

---

## 11. Arquivos Modificados

### Novos:
- `src/modules/permissions/components/MigrationDashboard.tsx`
- `src/modules/permissions/hooks/useMigrationTracking.ts`
- `scripts/audit-permissions-v1-usage.ts`
- `docs/permissions/WAVE7_V1_V2_MAP.md`

### Alterados:
- `src/modules/permissions/pages/GlobalPermissionsPage.tsx` (v1 read-only)
- `src/modules/permissions/pages/BuPermissionsPage.tsx` (tab migração)
- `src/lib/queryKeys.ts` (migration keys)

### Database:
- Migration com triggers de bloqueio v1
- Tabela permission_migrations
- RPCs de tracking

---

## Conclusão

Wave 7 está **completa**:
- ✅ Tabelas V1 congeladas (read-only)
- ✅ UI V1 mostra deprecação clara
- ✅ Migration tracking criado
- ✅ Migration Dashboard funcional
- ✅ RPCs de migração funcionais
- ✅ Audit scripts validados
- ✅ QA aprovado (32/32)

Próximos passos:
1. Comunicar stakeholders sobre migração
2. Monitorar dashboard de migração por BU
3. Acompanhar logs de legacy key usage
4. Preparar Wave 8 após período de observação

---

*Relatório finalizado para Wave 7: Sunset V1*
