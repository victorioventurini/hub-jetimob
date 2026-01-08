# Wave 7 — Sunset V1 Implementation Report

**Data:** 2026-01-08  
**Versão:** 1.0.0  
**Status:** ✅ IMPLEMENTADO

---

## Resumo Executivo

Wave 7 implementa o "sunset" do sistema de permissões V1:

1. **Freeze de tabelas V1** — Triggers bloqueiam INSERT/UPDATE/DELETE
2. **UI V1 read-only** — Ações de edição V1 removidas
3. **Migration tracking** — Tabela e RPCs para rastrear migração por usuário
4. **Audit script** — Detecta uso residual de V1 no frontend

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
| /settings/permissions?tab=groups | Botões criar/editar removidos (ou desabilitados) |
| /settings/permissions?tab=templates | Marcado como "(v1 - legado)" |
| /hub/permissions | Sheet usa V2 por padrão |
| /hub/permissions (sheet) | V1 aparece read-only para comparação |

---

## 5. Hooks Criados

| Hook | Arquivo | Função |
|------|---------|--------|
| `useBuMigrationStatus` | useMigrationTracking.ts | Status geral da BU |
| `useUserMigrationStatus` | useMigrationTracking.ts | Status de um usuário |
| `useMigrationActions` | useMigrationTracking.ts | Marcar migrado/verificado |

---

## 6. Estado de Migração por BU

*(A ser preenchido após testes)*

| BU | Total Users | Migrated | Verified | % |
|----|-------------|----------|----------|---|
| — | — | — | — | — |

---

## 7. Resultados dos Audits

### 7.1 audit-permissions-v1-usage.ts
```
Status: ✅ CRIADO
Execução: Aguardando
Esperado: 0 write operations
```

### 7.2 audit-rbac.ts
```
Status: PENDENTE
```

### 7.3 audit-identity-usage.ts
```
Status: PENDENTE
```

### 7.4 audit-bu-scope.ts
```
Status: PENDENTE
```

---

## 8. QA Status

Ver: [QA_WAVE7_SUNSET_V1.md](../qa/QA_WAVE7_SUNSET_V1.md)

**Status:** 🟡 AGUARDANDO VALIDAÇÃO

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

## Conclusão

Wave 7 está **implementada**:
- ✅ Tabelas V1 congeladas (read-only)
- ✅ Migration tracking criado
- ✅ RPCs de migração funcionais
- ✅ Audit script criado
- ⏳ QA aguardando validação manual
- ⏳ UI updates em progresso

Próximos passos:
1. Validar QA checklist
2. Rodar audit scripts
3. Comunicar stakeholders sobre migração
4. Monitorar logs de legacy key usage

---

*Relatório gerado para Wave 7: Sunset V1*
