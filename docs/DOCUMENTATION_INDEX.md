# 📚 Índice de Documentação Técnica — Hub da Jet

**Última atualização:** 2026-02-10  
**TCR Version:** 3.6.0  
**System Health:** 10/10 ✅

---

## 🎯 Estrutura de Documentação

```
docs/
├── canonical/     → Padrões normativos (fonte de verdade)
├── audits/        → Relatórios de auditoria atuais
├── guides/        → Playbooks e guias operacionais
├── archive/       → Documentos históricos
│   ├── reports/
│   ├── migrations/
│   ├── waves/
│   ├── fixes/
│   └── perf/
├── qa/            → Checklists de QA (por feature)
└── permissions/   → Relatórios de waves de permissões
```

---

## 📐 Documentos Canônicos (`docs/canonical/`)

| Documento | Descrição | Versão |
|-----------|-----------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | **Fonte única de verdade** — arquitetura, entidades, regras | v3.6.0 |
| `DEVELOPMENT_STANDARDS.md` | Padrões obrigatórios de desenvolvimento | v1.24.0 |
| `DATA_MODEL_REGISTRY.md` | Schema canônico (tabelas, views, funções) | v1.2.2 |
| `IDENTITY_CONVENTION.md` | Convenção user_id vs profile_id | v2.1 |
| `PERMISSIONS_AND_RBAC_MODEL.md` | Modelo completo de permissões V2 | v1.2.0 |
| `RBAC_TEMPLATES_V3.md` | Sistema de templates de permissão | v3.0 |
| `QUERY_KEYS_STANDARD.md` | Padrão de query keys centralizadas | Normativo |
| `BU_SCOPED_SUPABASE_RULES.md` | Regras PRE-BU/POST-BU + **Filtragem Frontend** | v4.1.0 |
| `UI_COMPONENTS_REGISTRY.md` | Registro de componentes UI canônicos | v1.4.0 |
| `SCHEMA_QUICK_REFERENCE.md` | Referência rápida de schema | v1.0.0 |
| `RESPONSIBILITY_MIGRATION_POLICY.md` | Política de migração de responsabilidades | v1.0.0 |

---

## 📊 Relatórios de Auditoria Atuais (`docs/audits/`)

| Documento | Descrição | Data |
|-----------|-----------|------|
| `COMPREHENSIVE_HYGIENE_AUDIT_2026-02-07.md` | **Auditoria de higienização completa** | 2026-02-07 |
| `SYSTEMIC_HEALTH_AUDIT_2026-02-07.md` | **Auditoria sistêmica de saúde** | 2026-02-07 |
| `BACKEND_ROBUSTNESS_AUDIT_2026-02-07.md` | **Auditoria de robustez backend** | 2026-02-07 |
| `HEALTH_REPORT_2026-01-22.md` | Relatório de saúde (10/10) | 2026-01-23 |
| `SYSTEMIC_ANALYSIS_2026-01-22.md` | Análise sistêmica completa | 2026-01-23 |
| `COMPREHENSIVE_TECHNICAL_AUDIT_2026-01-22.md` | Auditoria técnica abrangente | 2026-01-23 |
| `RLS_SECURITY_AUDIT_2026-01-21.md` | Auditoria de segurança RLS | 2026-01-21 |
| `BACKEND_AUDIT_2026-01-22.md` | Auditoria de Edge Functions | 2026-01-23 |
| `DATABASE_OPTIMIZATION_AUDIT_2026-01-22.md` | Otimização de banco | 2026-01-23 |
| `FRONTEND_UX_AUDIT_2026-01-22.md` | Auditoria de UX | 2026-01-22 |
| `SQL_FUNCTIONS_AUDIT_2026-01-22.md` | Auditoria de 175 funções SQL | 2026-01-22 |
| `EDGE_FUNCTIONS_JSDOC_AUDIT_2026-01-22.md` | Auditoria JSDoc de 18 Edge Functions | 2026-01-23 |

---

## 📘 Guias Operacionais (`docs/guides/`)

| Documento | Descrição |
|-----------|-----------|
| `BACKUP_RESTORE_PLAYBOOK.md` | Playbook de backup e restore |
| `GO_LIVE_CHECKLIST.md` | Checklist de go-live |
| `TESTING_GUIDE.md` | Guia completo de testes |
| `EXTERNAL_USER_IDENTITY_PATTERN.md` | Padrão para usuários externos |
| `IMPERSONATION_AWARE_COMPONENTS.md` | Componentes com impersonação |
| `SLOW_QUERIES_ACTION_PLAN.md` | Otimização de queries |
| `PERF_PLAYBOOK.md` | Playbook de performance |
| `SHARED_COMPONENTS_REGISTRY.md` | Registro de componentes |
| `HOOKS_CONSOLIDATION_REPORT.md` | Padrão de hooks |

---

## 🗃️ Arquivo Histórico (`docs/archive/`)

Documentos históricos organizados por tipo:
- `reports/` — Relatórios de auditoria antigos
- `migrations/` — Relatórios de migração concluídas
- `waves/` — Relatórios de waves de implementação
- `fixes/` — Relatórios de correções históricas
- `perf/` — Auditorias de performance antigas

> ⚠️ **ATENÇÃO**: Documentos em `archive/` são apenas para referência histórica.

---

## 🔒 Linter Warnings Conhecidos (Intencionais)

| Warning | Tabela | Justificativa |
|---------|--------|---------------|
| RLS `USING (true)` | `app_error_logs` | Log de erro pre-auth (qualquer usuário pode submeter) |
| RLS `USING (true)` | `audit_logs` | Log de auditoria (insert pré-contexto BU) |
| Leaked Password | N/A | Sistema usa **Magic Link**, não senhas |

---

*Atualizado em 2026-02-10 — TCR v3.6.0 — Health Score 10/10*
