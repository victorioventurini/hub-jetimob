# Status da Documentação Técnica — Hub da Jet

**Data:** 2026-01-09  
**Versão:** 1.1.0

---

## Doc Governance

### Objetivo

Garantir que a documentação seja reflexo fiel do sistema real, não opinião ou estado desejado.  
Evitar regressões conceituais (V1, práticas legadas, arquiteturas removidas).

### Fonte Única de Verdade

O **TECHNICAL_CONTEXT_REGISTRY.md (TCR)** é a autoridade máxima da documentação técnica.

```
⚠️ REGRA INQUEBRÁVEL: Nenhuma documentação pode contradizer o TCR.
```

| Documento | Papel |
|-----------|-------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | Fonte de verdade |
| `engineering/DEVELOPMENT_STANDARDS.md` | Padrões normativos |
| `engineering/DOCS_CONSISTENCY_RULES.md` | Regras de consistência |

### PR Gate Ativo

PRs que alteram `docs/**` são automaticamente auditados:

| Componente | Arquivo |
|------------|---------|
| Script de auditoria | `scripts/audit-docs-vs-tcr.ts` |
| Workflow CI | `.github/workflows/docs-consistency.yml` |
| Regras | `docs/engineering/DOCS_CONSISTENCY_RULES.md` |

**Comportamento:**
- PRs são **bloqueados** se introduzirem termos, conceitos ou afirmações incompatíveis com o TCR
- O audit verifica termos proibidos e afirmações que contradizem regras canônicas
- Arquivos em `docs/qa/` e `*REPORT*.md` têm tratamento especial para contexto histórico

### Audits Obrigatórios

| Quando | Comando |
|--------|---------|
| PR com alteração em `docs/**` | `npx tsx scripts/audit-docs-vs-tcr.ts` |
| Localmente | `npx tsx scripts/audit-docs-vs-tcr.ts --changed-only` |

Exit codes:
- `0` — Nenhuma contradição
- `1` — Contradições encontradas (bloqueia PR)

### Tratamento de Histórico / Legado

Para documentar decisões históricas sem reativar conceitos deprecated:

```markdown
<!-- ✅ CORRETO: Marcador histórico explícito -->
> Historical Note: O sistema V1 (removido na Wave 9) usava groups customizados.
> O sistema atual usa templates pré-definidos.

<!-- ❌ ERRADO: Sem contexto histórico -->
O sistema V1 permite criar groups customizados.
```

**Marcadores históricos aceitos:**
- `> Historical Note:`
- `> Legacy:`
- `## Histórico`
- `### Contexto Histórico`
- Arquivos com `*SUNSET*` ou `*REPORT*` no nome

### Referências

- [DOCS_CONSISTENCY_RULES.md](./engineering/DOCS_CONSISTENCY_RULES.md) — Regras detalhadas
- [DOCS_PR_GATE_REPORT.md](./engineering/DOCS_PR_GATE_REPORT.md) — Report de implementação

---

## 1. Documentos Canônicos (Fonte de Verdade)

| Documento | Versão | Descrição |
|-----------|--------|-----------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | v2.13.0 | TCR — Visão completa do sistema |
| `engineering/DEVELOPMENT_STANDARDS.md` | v1.1.0 | Padrões de desenvolvimento |
| `IDENTITY_CONVENTION.md` | v2.0 | Convenção auth.users.id vs profiles.id |
| `RBAC_TEMPLATES_V3.md` | v3.0 | Sistema de permissões V2-only |
| `URL_STATE_STANDARD.md` | v1.0 | Padrão de URL state |
| `engineering/QUERY_KEYS_STANDARD.md` | v1.0 | Padrão de query keys centralizadas |
| `engineering/BU_SCOPED_SUPABASE_RULES.md` | v1.0 | Regras de cliente Supabase |

---

## 2. Operações

| Documento | Descrição | Status |
|-----------|-----------|--------|
| `ops/BACKUP_RESTORE_PLAYBOOK.md` | Playbook de backup e restore | ✅ Ativo |
| `ops/GO_LIVE_CHECKLIST.md` | Checklist de go-live | ✅ Ativo |

---

## 3. Permissões (Wave 6-10)

| Documento | Descrição | Status |
|-----------|-----------|--------|
| `permissions/WAVE9_SUNSET_V1_FINAL_REPORT.md` | Remoção definitiva V1 | ✅ Histórico (V1 removido) |
| `WAVE10_PERMISSION_UX_GOVERNANCE_REPORT.md` | Governance Gate | ✅ Ativo |
| `qa/QA_PERMISSIONS_TEMPLATES.md` | Checklist de templates | ✅ Ativo |
| `qa/QA_WAVE10_PERMISSION_UX.md` | QA Wave 10 | ✅ Ativo |
| `permissions/WAVE7_SUNSET_V1_REPORT.md` | Congelamento V1 | 📁 Histórico |
| `permissions/WAVE6_*.md` | Documentos Wave 6 | 📁 Histórico |

---

## 4. QA Checklists

### Ativos

| Documento | Módulo | Descrição |
|-----------|--------|-----------|
| `qa/QA_BU_SCOPE.md` | Core | Validação BU scope |
| `qa/QA_IDENTITY_CONVENTION.md` | Core | Validação identity |
| `qa/QA_PREBU_POSTBU.md` | Core | PRE-BU vs POST-BU |
| `qa/QA_URL_STATE.md` | Core | URL state geral |
| `qa/QA_USER_DIRECTORY_GLOBAL_v2.md` | Core | User Directory Global |
| `qa/QA_PERMISSIONS_TEMPLATES.md` | Permissions | Templates V2 |
| `qa/QA_OKR_TEAM_SCOPE.md` | OKRs | Escopo de times |
| `qa/QA_OKR_CYCLE_CHECKINS_PAGE.md` | OKRs | Página de check-ins |
| `qa/QA_NOTIFICATIONS_PHASE*.md` | Notifications | Fases 1-5 |
| `qa/QA_SQUADS_WAVE5.md` | Teams | Squads |

### Obsoletos (Removíveis)

| Documento | Razão |
|-----------|-------|
| `qa/QA_WAVE3.md` | Substituído por QA_URL_STATE.md |
| `qa/QA_URL_STATE_WAVE4.md` | Consolidado em QA_URL_STATE.md |
| `qa/QA_WAVE6_*.md` | Consolidado em QA_PERMISSIONS_TEMPLATES.md |
| `qa/QA_WAVE7_SUNSET_V1.md` | V1 removido, histórico |
| `qa/QA_WAVE9_SUNSET_V1.md` | V1 removido, histórico |

---

## 5. Reports de Implementação

### Ativos (Referência)

| Documento | Descrição |
|-----------|-----------|
| `USER_DIRECTORY_GLOBAL_V2_REPORT.md` | Migração para v_bu_active_profiles |
| `OKR_CYCLE_CHECKINS_REPORT.md` | Implementação página de check-ins |
| `OKR_TEAM_SCOPE_HARDENING_REPORT.md` | Hardening de escopo de times |
| `NOTIFICATIONS_PHASE5_TEMPLATES_REPORT.md` | Templates de notificação |

### Históricos (Manter para Referência)

| Documento | Wave/Feature |
|-----------|--------------|
| `CODEBASE_HYGIENE_WAVE*.md` | Waves 2-5 |
| `IDENTITY_*.md` | Migração de identity |
| `NOTIFICATIONS_PHASE*.md` | Phases 1-5 |

---

## 6. Documentos Obsoletos (Candidatos a Remoção)

| Documento | Razão | Ação |
|-----------|-------|------|
| `DEPRECATION_SEND_MAGIC_LINK.md` | Já deprecado | 🗑️ Remover |
| `DEPRECATION_SEND_MAGIC_LINK_REPORT.md` | Já deprecado | 🗑️ Remover |
| `DB_LEGACY_AUDIT_REPORT.md` | Legado resolvido | 🗑️ Remover |
| `FRONTEND_LEGACY_AUDIT_REPORT.md` | Legado resolvido | 🗑️ Remover |
| `LEGACY_CLASSIFICATION_MATRIX.md` | Legado resolvido | 🗑️ Remover |

---

## 7. Scripts de Auditoria

| Script | Comando | Descrição |
|--------|---------|-----------|
| `audit-bu-scope.ts` | `npx tsx scripts/audit-bu-scope.ts` | Valida BU scope |
| `audit-identity-usage.ts` | `npx tsx scripts/audit-identity-usage.ts` | Valida identity |
| `audit-overfetch.ts` | `npx tsx scripts/audit-overfetch.ts` | Detecta select(*) |
| `audit-querykeys.ts` | `npx tsx scripts/audit-querykeys.ts` | Valida query keys |
| `audit-rbac.ts` | `npx tsx scripts/audit-rbac.ts` | Valida RBAC |
| `audit-supabase-client.ts` | `npx tsx scripts/audit-supabase-client.ts` | Cliente Supabase |
| `audit-url-state.ts` | `npx tsx scripts/audit-url-state.ts` | URL state |
| `audit-user-directory.ts` | `npx tsx scripts/audit-user-directory.ts` | User directory |
| `audit-prebu-buscoped.ts` | `npx tsx scripts/audit-prebu-buscoped.ts` | PRE-BU/POST-BU |
| `audit-permissions-v1-usage.ts` | `npx tsx scripts/audit-permissions-v1-usage.ts` | Uso residual V1 |

---

## 8. Estado Oficial do Sistema

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ESTADO TÉCNICO OFICIAL — HUB JETIMOB                           ║
║                                                                  ║
║   Data: 2026-01-09                                               ║
║   TCR: v2.13.0                                                   ║
║   DEVELOPMENT_STANDARDS: v1.1.0                                  ║
║                                                                  ║
║   ✅ V2-Only Mode Ativo (Permissões)                             ║
║   ✅ V1 Permissions Completamente Removido (Wave 9)              ║
║   ✅ Governance Gate Enforced (Wave 10)                          ║
║   ✅ User Directory Global v2 Consolidado                        ║
║   ✅ Identity Convention Enforced                                ║
║   ✅ BU Scope Enforcement Ativo                                  ║
║   ✅ URL State Migrado para @/shared/url                         ║
║                                                                  ║
║   Métricas:                                                      ║
║   - Permission Keys: 160                                         ║
║   - Permission Templates V2: 27                                  ║
║   - Permission Presets: 12                                       ║
║   - Módulos Ativos: 10                                           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 9. Próximos Passos (Opcional)

1. **Remover docs obsoletos** listados na seção 6
2. **Consolidar QA checklists** em menos arquivos
3. **Atualizar RBAC_TEMPLATES_V3.md** com lista completa de 160 keys
4. **Criar índice de busca** para documentação
