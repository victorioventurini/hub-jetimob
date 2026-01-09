# Compliance Baseline — Hub da Jet

**Versão:** 1.0.0  
**Última atualização:** 2026-01-09  
**Status:** Normativo  
**Referência:** TCR v2.13.0

---

## Visão Geral

Este documento define **TODOS** os audits obrigatórios do Hub da Jet. É a fonte única de verdade para governança técnica.

```
⚠️ REGRAS INVIOLÁVEIS:
1. Nenhum audit novo pode ser criado sem entrar neste Baseline
2. PR não pode ser mergeada se qualquer audit falhar
3. Novos módulos devem passar em TODOS os audits antes do merge
```

---

## Índice de Audits

| # | Audit | Script | Categoria | Severidade |
|---|-------|--------|-----------|------------|
| 1 | [BU Scope](#1-bu-scope) | `audit-bu-scope.ts` | Segurança | BLOCKING |
| 2 | [Identity Convention](#2-identity-convention) | `audit-identity-usage.ts` | Segurança | BLOCKING |
| 3 | [User Directory](#3-user-directory) | `audit-user-directory.ts` | Segurança | BLOCKING |
| 4 | [RBAC V2](#4-rbac-v2) | `audit-rbac.ts` | Segurança | BLOCKING |
| 5 | [Supabase Client](#5-supabase-client) | `audit-supabase-client.ts` | Segurança | BLOCKING |
| 6 | [Query Keys](#6-query-keys) | `audit-querykeys.ts` | DX/Cache | BLOCKING |
| 7 | [Data Model Registry](#7-data-model-registry) | `audit-sql-against-registry.ts` | Integridade | BLOCKING |
| 8 | [Docs vs TCR](#8-docs-vs-tcr) | `audit-docs-vs-tcr.ts` | Documentação | BLOCKING |
| 9 | [Overfetch](#9-overfetch) | `audit-overfetch.ts` | Performance | WARNING |
| 10 | [URL State](#10-url-state) | `audit-url-state.ts` | DX/UX | WARNING |
| 11 | [Permission Keys](#11-permission-keys) | `audit-permission-keys.ts` | Segurança | BLOCKING |
| 12 | [PRE-BU vs POST-BU](#12-pre-bu-vs-post-bu) | `audit-prebu-buscoped.ts` | Segurança | BLOCKING |

---

## Detalhes dos Audits

### 1. BU Scope

**Objetivo:** Garantir que toda operação de dados está escopada por Business Unit.

**O que verifica:**
- Inserts em tabelas operacionais têm `bu_id` explícito
- Updates não removem `bu_id`
- Queries usam cliente BU-scoped
- Tabelas dinâmicas são sinalizadas

**Script:** `scripts/audit-bu-scope.ts`

**Comando:**
```bash
npx tsx scripts/audit-bu-scope.ts
```

**Resultado esperado:** `0 critical findings`

**Referência:** TCR v2.13.0 §2.1 - BU Scope Enforcement

---

### 2. Identity Convention

**Objetivo:** Garantir que `auth.uid()` nunca é comparado diretamente com colunas de domínio.

**O que verifica:**
- SQL: Comparações de `auth.uid()` com colunas `*_user_id`
- Frontend: Uso de `user.id` onde `profileId` deveria ser usado
- RLS policies: Uso de funções canônicas (`my_profile_id()`)

**Script:** `scripts/audit-identity-usage.ts`

**Comando:**
```bash
npx tsx scripts/audit-identity-usage.ts
```

**Resultado esperado:** `0 violations`

**Referência:** TCR v2.13.0 §4 - Identity Convention

---

### 3. User Directory

**Objetivo:** Garantir que listagens de usuários incluem profiles sem primeiro login.

**O que verifica:**
- Uso de `INNER JOIN bu_user_memberships` para listar pessoas
- Queries com filtro `user_id IS NOT NULL`
- Uso correto de `v_bu_active_profiles` e `useBuUsersDirectory`

**Script:** `scripts/audit-user-directory.ts`

**Comando:**
```bash
npx tsx scripts/audit-user-directory.ts
```

**Resultado esperado:** `0 findings`

**Referência:** TCR v2.13.0 §9 - User Directory Global

---

### 4. RBAC V2

**Objetivo:** Garantir uso correto do sistema de permissões V2-only.

**O que verifica:**
- Não há referências a tabelas V1 (`permission_groups`, etc.)
- Uso de `usePermissions()` em vez de hardcode de roles
- Permission keys seguem padrão `<module>.<entity>.<action>`

**Script:** `scripts/audit-rbac.ts`

**Comando:**
```bash
npx tsx scripts/audit-rbac.ts
```

**Resultado esperado:** `0 errors`

**Referência:** TCR v2.13.0 §3 - Permissions (RBAC V2-only)

---

### 5. Supabase Client

**Objetivo:** Garantir uso correto do cliente Supabase por contexto.

**O que verifica:**
- Módulos operacionais usam `useBuScopedSupabase()`
- Cliente global usado apenas em contextos autorizados
- Exceções estão documentadas

**Script:** `scripts/audit-supabase-client.ts`

**Comando:**
```bash
npx tsx scripts/audit-supabase-client.ts
```

**Resultado esperado:** `0 errors`

**Referência:** BU_SCOPED_SUPABASE_RULES.md

---

### 6. Query Keys

**Objetivo:** Garantir que todas as query keys vêm de `src/lib/queryKeys.ts`.

**O que verifica:**
- Não há query keys hardcoded (`["tickets", buId]`)
- Uso correto de `queryKeys.*`
- Keys incluem `buId` quando necessário

**Script:** `scripts/audit-querykeys.ts`

**Comando:**
```bash
npx tsx scripts/audit-querykeys.ts
```

**Resultado esperado:** `0 violations`

**Referência:** QUERY_KEYS_STANDARD.md

---

### 7. Data Model Registry

**Objetivo:** Impedir referências a tabelas/views/funções inexistentes ou removidas.

**O que verifica:**
- Migrations SQL referenciam apenas objetos do registry
- Edge Functions usam tabelas existentes
- Objetos marcados como DEPRECATED/REMOVED são reportados

**Script:** `scripts/audit-sql-against-registry.ts`

**Comando:**
```bash
npx tsx scripts/audit-sql-against-registry.ts
```

**Resultado esperado:** `0 blocking violations`

**Referência:** DATA_MODEL_REGISTRY_AUDIT.md

---

### 8. Docs vs TCR

**Objetivo:** Garantir que documentação não contradiz o TCR.

**O que verifica:**
- Termos proibidos (tabelas V1, padrões deprecados)
- Assertivas incompatíveis com arquitetura atual
- Referências a sistemas removidos

**Script:** `scripts/audit-docs-vs-tcr.ts`

**Comando:**
```bash
npx tsx scripts/audit-docs-vs-tcr.ts
```

**Resultado esperado:** `0 critical findings`

**Referência:** TECHNICAL_CONTEXT_REGISTRY.md

---

### 9. Overfetch

**Objetivo:** Prevenir `select("*")` que causa overfetch de dados.

**O que verifica:**
- Queries com `select("*")`
- Campos explícitos em todas as queries
- Novos arquivos não introduzem overfetch

**Script:** `scripts/audit-overfetch.ts`

**Comando:**
```bash
npx tsx scripts/audit-overfetch.ts
```

**Resultado esperado:** `0 new select(*)`

**Severidade:** WARNING (não bloqueia, mas deve ser corrigido)

---

### 10. URL State

**Objetivo:** Garantir que filtros/paginação usam URL state.

**O que verifica:**
- Filtros em `useState` que deveriam estar na URL
- Uso do hook `useUrlState` canônico
- Não uso do wrapper legado

**Script:** `scripts/audit-url-state.ts`

**Comando:**
```bash
npx tsx scripts/audit-url-state.ts
```

**Resultado esperado:** `0 new violations`

**Severidade:** WARNING (não bloqueia, mas deve ser corrigido)

---

### 11. Permission Keys

**Objetivo:** Garantir que permission keys seguem o padrão.

**O que verifica:**
- Formato `<module>.<entity>.<action>`
- Keys definidas em `permission_keys_catalog`
- Não há hardcode de roles no frontend

**Script:** `scripts/audit-permission-keys.ts`

**Comando:**
```bash
npx tsx scripts/audit-permission-keys.ts
```

**Resultado esperado:** `0 violations`

**Referência:** TCR v2.13.0 §3.2 - Permission Keys

---

### 12. PRE-BU vs POST-BU

**Objetivo:** Garantir uso correto do cliente por fase do ciclo de vida.

**O que verifica:**
- Componentes PRE-BU não usam `useBuScopedSupabase()`
- Componentes POST-BU não usam cliente global
- `useOptionalBuClient` usado corretamente

**Script:** `scripts/audit-prebu-buscoped.ts`

**Comando:**
```bash
npx tsx scripts/audit-prebu-buscoped.ts
```

**Resultado esperado:** `0 violations`

**Referência:** DEVELOPMENT_STANDARDS.md §A.1

---

## Executando Todos os Audits

### Comando Agregado

```bash
npx tsx scripts/run-compliance-checks.ts
```

### Output Esperado (Sucesso)

```
╔══════════════════════════════════════════════════════════════════╗
║                    COMPLIANCE BASELINE CHECK                      ║
╠══════════════════════════════════════════════════════════════════╣
║ [1/12] BU Scope.......................... ✅ PASS (0 findings)   ║
║ [2/12] Identity Convention............... ✅ PASS (0 violations) ║
║ [3/12] User Directory.................... ✅ PASS (0 findings)   ║
║ [4/12] RBAC V2........................... ✅ PASS (0 errors)     ║
║ [5/12] Supabase Client................... ✅ PASS (0 errors)     ║
║ [6/12] Query Keys........................ ✅ PASS (0 violations) ║
║ [7/12] Data Model Registry............... ✅ PASS (0 blocking)   ║
║ [8/12] Docs vs TCR....................... ✅ PASS (0 critical)   ║
║ [9/12] Overfetch......................... ⚠️  WARN (2 findings)  ║
║ [10/12] URL State........................ ⚠️  WARN (1 finding)   ║
║ [11/12] Permission Keys.................. ✅ PASS (0 violations) ║
║ [12/12] PRE-BU vs POST-BU................ ✅ PASS (0 violations) ║
╠══════════════════════════════════════════════════════════════════╣
║ RESULT: ✅ COMPLIANT (10 passed, 2 warnings, 0 failed)           ║
╚══════════════════════════════════════════════════════════════════╝
```

### Output Esperado (Falha)

```
╔══════════════════════════════════════════════════════════════════╗
║                    COMPLIANCE BASELINE CHECK                      ║
╠══════════════════════════════════════════════════════════════════╣
║ [1/12] BU Scope.......................... ❌ FAIL (3 findings)   ║
╠══════════════════════════════════════════════════════════════════╣
║ RESULT: ❌ NON-COMPLIANT - Stopping at first failure             ║
║                                                                   ║
║ Run 'npx tsx scripts/audit-bu-scope.ts' for details              ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## CI Gate

### Workflow

O workflow `.github/workflows/compliance-all.yml` executa automaticamente em PRs que tocam:
- `supabase/migrations/**`
- `supabase/functions/**`
- `docs/engineering/**`
- `docs/TECHNICAL_CONTEXT_REGISTRY.md`

### Comportamento

| Resultado | Ação |
|-----------|------|
| Todos PASS ou apenas WARNING | PR pode ser mergeada |
| Qualquer FAIL | PR **BLOQUEADA** |

---

## Adicionando Novos Audits

Para adicionar um novo audit ao Baseline:

1. **Criar o script** em `scripts/audit-<nome>.ts`
2. **Documentar neste arquivo** seguindo o template
3. **Adicionar ao agregador** `scripts/run-compliance-checks.ts`
4. **Atualizar CI** se necessário
5. **Atualizar DEVELOPMENT_STANDARDS.md** na seção H.1

```
⚠️ REGRA: Audit fora deste Baseline não é oficial e não bloqueia PR.
```

---

## Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0.0 | 2026-01-09 | Versão inicial com 12 audits |

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | Fonte de verdade do sistema |
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | Padrões de desenvolvimento |
| [DATA_MODEL_REGISTRY_AUDIT.md](./DATA_MODEL_REGISTRY_AUDIT.md) | Detalhes do audit de registry |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase |
