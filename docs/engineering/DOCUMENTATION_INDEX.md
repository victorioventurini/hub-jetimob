# 📚 Índice de Documentação Técnica — Hub da Jet

**Última atualização:** 2026-01-11  
**TCR Version:** 2.15.0

---

## 🎯 Documento Principal

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | **Fonte única de verdade** para arquitetura, entidades, regras de negócio e padrões | ✅ v2.15.0 |

---

## 📐 Padrões de Desenvolvimento

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | Padrões obrigatórios: PRE-BU/POST-BU, Identity, RBAC, Queries, URL State, Edge Functions | ✅ v1.2.0 |
| [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) | Padrão de query keys centralizadas (`src/lib/queryKeys.ts`) | ✅ Normativo |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase (global vs bu-scoped) | ✅ Normativo |
| [URL_STATE_STANDARD.md](../URL_STATE_STANDARD.md) | Padrão de URL state para filtros, busca e paginação | ✅ Normativo |
| [SHARED_COMPONENTS_REGISTRY.md](./SHARED_COMPONENTS_REGISTRY.md) | Registro de componentes compartilhados | ✅ Ativo |

---

## 🗄️ Modelo de Dados

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) | **Fonte única de verdade** para schema (tabelas, views, funções, enums) | ✅ Canônico |
| [DATA_MODEL_REGISTRY.json](./DATA_MODEL_REGISTRY.json) | Versão JSON para automação e scripts | ✅ Gerado |
| [DATA_MODEL_REGISTRY_AUDIT.md](./DATA_MODEL_REGISTRY_AUDIT.md) | Auditoria do registry vs banco real | ✅ Ativo |

---

## 🔐 Identidade e Permissões

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md) | Convenção `user_id` (auth) vs `profile_id` (domínio) | ✅ v2.0 |
| [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md) | Modelo completo de permissões V2 | ✅ v1.1.0 |
| [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md) | Sistema de templates de permissão (collaborator_base, bu_admin, etc.) | ✅ v3.0 |

---

## 📊 Relatórios de Saúde e Compliance

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [HEALTH_REPORT_2026-01-11.md](./HEALTH_REPORT_2026-01-11.md) | **Relatório atual de saúde técnica** | ✅ Atual |
| [AUDIT_REPORT_2026-01-11_v3.md](./AUDIT_REPORT_2026-01-11_v3.md) | Último relatório de auditoria completa | ✅ Atual |
| [COMPLIANCE_BASELINE.md](./COMPLIANCE_BASELINE.md) | Baseline de compliance e scripts de audit | ✅ Normativo |
| [FINAL_COMPLIANCE_CHECKLIST.md](./FINAL_COMPLIANCE_CHECKLIST.md) | Checklist final de conformidade | ✅ Ativo |
| [SYSTEM_STATE_FINAL_REPORT.md](./SYSTEM_STATE_FINAL_REPORT.md) | Estado final do sistema após consolidação | ✅ Ativo |

---

## 🚀 Operações

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [BACKUP_RESTORE_PLAYBOOK.md](../ops/BACKUP_RESTORE_PLAYBOOK.md) | Playbook de backup e restore | ✅ Normativo |
| [GO_LIVE_CHECKLIST.md](../ops/GO_LIVE_CHECKLIST.md) | Checklist de go-live | ✅ Normativo |

---

## 🧹 Auditoria e Higienização

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [CODEBASE_HYGIENE_ROADMAP.md](../CODEBASE_HYGIENE_ROADMAP.md) | Roadmap de limpeza de código (3 waves) | ✅ Wave 5 completo |
| [LEGACY_CLASSIFICATION_MATRIX.md](../LEGACY_CLASSIFICATION_MATRIX.md) | Matriz de classificação de código legado | ✅ Atualizado |
| [HYGIENE_AUDIT_2026-01-08.md](../HYGIENE_AUDIT_2026-01-08.md) | Auditoria de higiene do codebase | ✅ Histórico |

---

## 📈 Performance

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [PERFORMANCE_SWEEP_FINAL_SUMMARY.md](./PERFORMANCE_SWEEP_FINAL_SUMMARY.md) | Resumo final do sweep de performance | ✅ Completo |
| [PERFORMANCE_WAVE_P2_PLAN.md](./PERFORMANCE_WAVE_P2_PLAN.md) | Plano de performance wave P2 | ✅ Histórico |
| [PERF_PLAYBOOK.md](../PERF_PLAYBOOK.md) | Playbook de performance | ✅ Normativo |

---

## 🔄 Migrações e Reports Históricos

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [BU_SCOPED_MIGRATION_REPORT.md](../BU_SCOPED_MIGRATION_REPORT.md) | Migração para BU-scoped | ✅ Histórico |
| [IDENTITY_MIGRATION_FINAL_REPORT.md](../IDENTITY_MIGRATION_FINAL_REPORT.md) | Migração de identity convention | ✅ Histórico |
| [NOTIFICATIONS_PHASE5_TEMPLATES_REPORT.md](../NOTIFICATIONS_PHASE5_TEMPLATES_REPORT.md) | Templates de notificações | ✅ Histórico |

---

## 📝 Scripts de Auditoria

| Script | Comando | Verifica |
|--------|---------|----------|
| `audit-bu-scope.ts` | `npx tsx scripts/audit-bu-scope.ts` | Inserts/updates sem bu_id |
| `audit-overfetch.ts` | `npx tsx scripts/audit-overfetch.ts` | select("*") |
| `audit-querykeys.ts` | `npx tsx scripts/audit-querykeys.ts` | QueryKeys hardcoded |
| `audit-identity-usage.ts` | `npx tsx scripts/audit-identity-usage.ts` | Violações de identity |
| `audit-url-state.ts` | `npx tsx scripts/audit-url-state.ts` | useState para filtros |
| `audit-rbac.ts` | `npx tsx scripts/audit-rbac.ts` | Hardcode de roles |
| `audit-supabase-client.ts` | `npx tsx scripts/audit-supabase-client.ts` | Cliente global indevido |
| `audit-prebu-buscoped.ts` | `npx tsx scripts/audit-prebu-buscoped.ts` | useBuScopedSupabase em PRE-BU |
| `run-compliance-checks.ts` | `npx tsx scripts/run-compliance-checks.ts` | Todos os audits |

---

## 📋 Regras de Manutenção

### Ao Criar Novos Documentos

1. **Localização**: Colocar em `docs/engineering/` para docs técnicos
2. **Header**: Incluir versão, data e referência ao TCR
3. **Índice**: Adicionar ao `DOCUMENTATION_INDEX.md`
4. **TCR**: Se for padrão normativo, referenciar no TCR

### Ao Modificar Schema

1. Rodar migration via Lovable
2. Executar `npx tsx scripts/generate-data-model-registry.ts`
3. Atualizar `DATA_MODEL_REGISTRY.md` se necessário
4. Atualizar TCR changelog

### Ao Modificar Padrões

1. Atualizar o documento de padrão
2. Incrementar versão
3. Adicionar entrada no changelog do TCR
4. Rodar scripts de audit para verificar compliance

---

*Documento mantido automaticamente. Última verificação: 2026-01-11*
