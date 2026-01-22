# 📚 Índice de Documentação Técnica — Hub da Jet

**Última atualização:** 2026-01-22  
**TCR Version:** 2.53.0

---

## 🎯 Documento Principal

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | **Fonte única de verdade** para arquitetura, entidades, regras de negócio e padrões | ✅ v2.51.0 |

---

## 📐 Padrões de Desenvolvimento (Canônicos)

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | **Padrões obrigatórios:** PRE-BU/POST-BU, Identity, RBAC, Queries, URL State, Edge Functions, Hooks, Limites de Código | ✅ v1.13.0 |
| [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) | Padrão de query keys centralizadas | ✅ Normativo |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase (global vs bu-scoped) | ✅ Normativo |
| [SHARED_COMPONENTS_REGISTRY.md](./SHARED_COMPONENTS_REGISTRY.md) | Registro de componentes compartilhados | ✅ v1.2.0 |
| [HOOKS_CONSOLIDATION_REPORT.md](./HOOKS_CONSOLIDATION_REPORT.md) | Relatório de consolidação de hooks | ✅ v1.0.0 |

---

## 🗄️ Modelo de Dados

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) | **Fonte única de verdade** para schema (tabelas, views, funções, enums) | ✅ Canônico |
| [DATA_MODEL_REGISTRY.json](./DATA_MODEL_REGISTRY.json) | Versão JSON para automação e scripts | ✅ Gerado |

---

## 🔐 Identidade e Permissões

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md) | Convenção `user_id` (auth) vs `profile_id` (domínio) | ✅ v2.1 |
| [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md) | Modelo completo de permissões V2 | ✅ v1.2.0 |
| [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md) | Sistema de templates de permissão | ✅ v3.0 |
| [IMPERSONATION_AWARE_COMPONENTS.md](./IMPERSONATION_AWARE_COMPONENTS.md) | Componentes que suportam impersonação | ✅ Ativo |
| [RLS_V2_MIGRATION_FINAL_REPORT.md](./RLS_V2_MIGRATION_FINAL_REPORT.md) | Migração completa para RLS V2 | ✅ v2.48.0 |
| [RLS_SECURITY_AUDIT_2026-01-21.md](./RLS_SECURITY_AUDIT_2026-01-21.md) | **Auditoria de segurança RLS (6 fixes)** | ✅ NOVO |

---

## 📊 Relatórios de Saúde (Atuais)

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [HEALTH_REPORT_2026-01-13.md](./HEALTH_REPORT_2026-01-13.md) | **Relatório atual de saúde técnica** | ✅ Atual |
| [SYSTEM_HEALTH_AUDIT_2026-01-13.md](./SYSTEM_HEALTH_AUDIT_2026-01-13.md) | **Auditoria sistêmica completa** | ✅ Atual |
| [BACKEND_AUDIT_2026-01-13.md](./BACKEND_AUDIT_2026-01-13.md) | Auditoria de backend (Edge Functions, RPCs) | ✅ Atual |
| [FRONTEND_UX_AUDIT_2026-01-13.md](./FRONTEND_UX_AUDIT_2026-01-13.md) | Auditoria de frontend e UX | ✅ Atual |
| [TECHNICAL_DEBT_ANALYSIS_2026-01-13.md](./TECHNICAL_DEBT_ANALYSIS_2026-01-13.md) | Análise de débitos técnicos | ✅ Atual |
| [COMPLIANCE_BASELINE.md](./COMPLIANCE_BASELINE.md) | Baseline de compliance e scripts | ✅ Normativo |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | **Guia completo de testes automatizados** (inclui Teams/Areas) | ✅ v1.1.0 |
| [RFC_AREAS_IMPLEMENTATION.md](./RFC_AREAS_IMPLEMENTATION.md) | **RFC: Implementação de Áreas** (estratégicas) | ✅ Implementado |
| [SLOW_QUERIES_ACTION_PLAN.md](./SLOW_QUERIES_ACTION_PLAN.md) | **Plano de otimização de queries lentas** (P3.x) | 📋 Planejado |

---

## 🚀 Operações

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [BACKUP_RESTORE_PLAYBOOK.md](../ops/BACKUP_RESTORE_PLAYBOOK.md) | Playbook de backup e restore | ✅ Normativo |
| [GO_LIVE_CHECKLIST.md](../ops/GO_LIVE_CHECKLIST.md) | Checklist de go-live | ✅ Normativo |

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
| `run-compliance-checks.ts` | `npx tsx scripts/run-compliance-checks.ts` | Todos os audits |

---

## 🧪 Testes Automatizados

| Comando | Descrição |
|---------|-----------|
| `npm run test` | Executa testes unitários (Vitest) em watch mode |
| `npm run test -- --run` | Executa testes unitários uma vez |
| `npm run test -- --coverage` | Executa testes com relatório de cobertura |
| `npx playwright test` | Executa testes E2E (Playwright) |
| `npx playwright test --ui` | Executa testes E2E em modo interativo |
| `npx playwright show-report` | Exibe relatório HTML dos testes E2E |

### Estrutura de Testes

| Diretório | Conteúdo |
|-----------|----------|
| `src/test/` | Setup, mocks e fixtures para Vitest |
| `src/**/*.test.ts` | Testes unitários e de integração |
| `e2e/` | Testes E2E com Playwright |
| `.github/workflows/test.yml` | CI/CD para testes automatizados |

---

## 🗃️ Arquivados (Histórico)

> Documentos abaixo são **históricos** e NÃO devem ser usados como referência para novas implementações.

| Documento | Descrição | Status |
|-----------|-----------|--------|
| `AUDIT_REPORT_2026-01-11.md` | Relatório de auditoria anterior | 📦 Histórico |
| `AUDIT_REPORT_2026-01-11_v3.md` | Versão v3 do relatório | 📦 Histórico |
| `HEALTH_REPORT_2026-01-11.md` | Health report anterior | 📦 Histórico |
| `HEALTH_REPORT_2026-01-12.md` | Health report anterior | 📦 Histórico |
| `TECHNICAL_DEBT_ANALYSIS_2026-01-12.md` | Análise anterior | 📦 Histórico |
| `TECHNICAL_DEBT_ANALYSIS_2026-01-12_v2.md` | Versão v2 anterior | 📦 Histórico |
| `FRONTEND_UX_AUDIT_2026-01.md` | Auditoria UX anterior | 📦 Histórico |
| `HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md` | Plano de higienização anterior | 📦 Histórico |
| `HYGIENE_ANALYSIS_2026-01-13.md` | Análise de higienização | 📦 Histórico |
| `DATABASE_OPTIMIZATION_PLAN_2026-01.md` | Plano de otimização DB | 📦 Histórico |
| `PERFORMANCE_SWEEP_REPORT.md` | Relatório de performance | 📦 Histórico |
| `PERFORMANCE_SWEEP_FINAL_SUMMARY.md` | Resumo final performance | 📦 Histórico |
| `PERFORMANCE_WAVE_P2_PLAN.md` | Plano P2 de performance | 📦 Histórico |
| `PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md` | Relatório de índices | 📦 Histórico |
| `RLS_V2_MIGRATION_FINAL_REPORT.md` | Migração RLS V2 | 📦 Histórico |
| `ENUM_MIGRATION_PLAN.md` | Plano de migração de enums | 📦 Histórico |
| `DATA_MODEL_REGISTRY_AUDIT.md` | Auditoria do registry | 📦 Histórico |
| `DATA_MODEL_REGISTRY_REPORT.md` | Relatório do registry | 📦 Histórico |
| `BACKEND_ARCHITECTURE_REVIEW_2026-01.md` | Review de arquitetura | 📦 Histórico |
| `CONSOLIDATION_AUDIT_REPORT.md` | Relatório de consolidação | 📦 Histórico |
| `CONSISTENCY_REPORT.md` | Relatório de consistência | 📦 Histórico |
| `COMPONENT_STANDARDIZATION_REPORT.md` | Padronização de componentes | 📦 Histórico |
| `DOCS_CONSISTENCY_RULES.md` | Regras de consistência de docs | 📦 Histórico |
| `DOCS_PR_GATE_REPORT.md` | Relatório de PR gate | 📦 Histórico |
| `DOCS_REFRESH_FINAL_REPORT.md` | Relatório final de refresh | 📦 Histórico |
| `FINAL_COMPLIANCE_CHECKLIST.md` | Checklist final | 📦 Histórico |
| `MODULE_HEALTH_AUDIT_REPORT.md` | Auditoria de módulos | 📦 Histórico |
| `SYSTEM_STATE_FINAL_REPORT.md` | Estado final do sistema | 📦 Histórico |

---

## 📋 Regras de Manutenção

### Ao Criar Novos Documentos

1. **Localização**: Colocar em `docs/engineering/` para docs técnicos
2. **Nomenclatura**: `<TIPO>_<ASSUNTO>_<DATA>.md` (ex: `AUDIT_SECURITY_2026-01-15.md`)
3. **Header**: Incluir versão, data e referência ao TCR
4. **Índice**: Adicionar ao `DOCUMENTATION_INDEX.md`
5. **TCR**: Se for padrão normativo, referenciar no TCR

### Regras de Retenção

| Tipo | Retenção | Ação |
|------|----------|------|
| Padrões normativos | Permanente | Manter e versionar |
| Health reports | 7 dias | Arquivar após novo relatório |
| Audits pontuais | 30 dias | Arquivar após consolidação |
| Planos executados | 30 dias | Arquivar após conclusão |

### Ao Arquivar

1. Mover para seção "Arquivados" deste índice
2. **NÃO deletar** (manter histórico)
3. Marcar como 📦 Histórico

---

*Documento mantido automaticamente. Última verificação: 2026-01-13*
