# 📚 Índice de Documentação Técnica — Hub da Jet

**Última atualização:** 2026-04-22  
**TCR Version:** 3.28.0  
**System Health:** 10/10 ✅

---

## 🎯 Estrutura

```
docs/
├── canonical/     → Padrões normativos (fonte de verdade)
├── audits/        → Auditorias atuais (1 por categoria — ver retention policy)
├── guides/        → Playbooks e guias operacionais
├── archive/       → Documentos históricos (audits-2026-q1, waves, fixes, perf, ...)
├── perf/          → Políticas de performance e retenção de telemetria
├── qa/            → Checklists de QA por feature
└── permissions/   → Relatórios de waves de permissões
```

> 📋 Política de retenção: [`canonical/DOCS_RETENTION_POLICY.md`](./canonical/DOCS_RETENTION_POLICY.md)

---

## 📐 Documentos Canônicos (`docs/canonical/`)

| Documento | Versão |
|-----------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` — Fonte única de verdade | v3.28.0 |
| `AI_AGENTS_PHILOSOPHY.md` | v1.0.0 |
| `DEVELOPMENT_STANDARDS.md` | v1.28.0 |
| `DATA_MODEL_REGISTRY.md` | v1.3.0 |
| `IDENTITY_CONVENTION.md` | v2.2.0 |
| `PERMISSIONS_AND_RBAC_MODEL.md` | v1.5.0 |
| `RBAC_TEMPLATES_V3.md` | v3.0 |
| `QUERY_KEYS_STANDARD.md` | Normativo |
| `BU_SCOPED_SUPABASE_RULES.md` | v4.1.0 |
| `UI_COMPONENTS_REGISTRY.md` | v1.7.0 |
| `SCHEMA_QUICK_REFERENCE.md` | v1.0.0 |
| `RESPONSIBILITY_MIGRATION_POLICY.md` | v1.0.0 |
| `ANALYSIS_MODULE.md` | v1.0.0 |
| `HOOKS_BARREL_STANDARD.md` | v1.0.0 |
| `EDGE_PERFORMANCE_STANDARD.md` | v1.0.0 |
| `EDGE_ERROR_RESPONSE_STANDARD.md` | Normativo |
| `DOCS_RETENTION_POLICY.md` | v1.0.0 |

---

## 📊 Auditorias Atuais (`docs/audits/`)

| Documento | Categoria | Data |
|-----------|-----------|------|
| `SYSTEMIC_HEALTH_AUDIT_2026-02-08.md` | Sistêmico | 2026-02-08 |
| `COMPREHENSIVE_TECHNICAL_AUDIT_2026-02-08.md` | Técnico | 2026-02-08 |
| `BACKEND_ROBUSTNESS_AUDIT_2026-02-08.md` | Backend | 2026-02-08 |
| `DATABASE_OPTIMIZATION_AUDIT_2026-02-08.md` | Banco | 2026-02-08 |
| `FRONTEND_UX_AUDIT_2026-02-08.md` | Frontend | 2026-02-08 |
| `HOOKS_CONSOLIDATION_AUDIT_2026-02-08.md` | Hooks | 2026-02-08 |
| `HYGIENE_ANALYSIS_2026-03-14.md` | Higiene | 2026-03-14 |
| `REFACTORING_PLAN_2026-03-14.md` | Refator | 2026-03-14 |

> 17 auditorias antigas (Q1) movidas para `docs/archive/audits-2026-q1/` em 2026-04-22.

---

## 🔍 Deep Dives Técnicos (`docs/`)

| Documento | Data |
|-----------|------|
| `HUB_ADMIN_DEEP_DIVE.md` | 2026-03-30 |
| `BU_SETTINGS_DEEP_DIVE.md` | 2026-03-30 |
| `HUB_TECHNICAL_DEEP_DIVE.md` | 2026-03-25 |

---

## 📘 Guias Operacionais (`docs/guides/`)

| Documento |
|-----------|
| `BACKUP_RESTORE_PLAYBOOK.md` |
| `GO_LIVE_CHECKLIST.md` |
| `TESTING_GUIDE.md` |
| `WIZARD_DEVELOPMENT_GUIDE.md` |
| `EXTERNAL_USER_IDENTITY_PATTERN.md` |
| `IMPERSONATION_AWARE_COMPONENTS.md` |
| `PROGRESS_INTERPRETATION_CANON.md` |
| `SLOW_QUERIES_ACTION_PLAN.md` |
| `PERF_PLAYBOOK.md` |
| `SHARED_COMPONENTS_REGISTRY.md` |
| `HOOKS_CONSOLIDATION_REPORT.md` |
| `CHATGPT_CUSTOM_GPT_SETUP.md` |
| `UNIFIED_PARTICIPANT_LAYER.md` |

---

## 🗃️ Arquivo Histórico (`docs/archive/`)

- `audits-2026-q1/` — 17 auditorias de Q1 2026 (arquivadas 2026-04-22)
- `reports/`, `migrations/`, `waves/`, `fixes/`, `perf/` — históricos por tipo

> ⚠️ Apenas para referência. Não são fonte de verdade.

---

## 🔒 Linter Warnings Conhecidos (Intencionais)

| Warning | Tabela | Justificativa |
|---------|--------|---------------|
| RLS `USING (true)` | `app_error_logs` | Log pre-auth |
| RLS `USING (true)` | `audit_logs` | Insert pré-contexto BU |
| Leaked Password | N/A | Sistema usa Magic Link |

---

*Atualizado em 2026-04-22 — TCR v3.28.0 — Health Score 10/10*
