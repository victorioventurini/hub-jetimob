# Report: Documentation PR Gate

**Versão:** 1.0.0  
**Data:** 2026-01-09  
**Status:** ✅ Implementado

---

## Objetivo

Bloquear PRs que introduzam documentação contradizendo o TCR (Technical Context Registry).

---

## Componentes Implementados

| Componente | Arquivo | Função |
|------------|---------|--------|
| Audit Script | `scripts/audit-docs-vs-tcr.ts` | Valida docs vs TCR |
| Regras | `docs/engineering/DOCS_CONSISTENCY_RULES.md` | Define termos e assertions |
| CI Workflow | `.github/workflows/docs-consistency.yml` | Executa no PR |
| Standards Update | `docs/engineering/DEVELOPMENT_STANDARDS.md` | Referência ao audit |

---

## Como Funciona

### 1. Gatilho

O workflow é acionado em PRs que alteram arquivos em `docs/**`.

```yaml
on:
  pull_request:
    paths:
      - 'docs/**'
```

### 2. Validação

O script `audit-docs-vs-tcr.ts`:

1. Carrega lista de arquivos alterados no PR
2. Para cada arquivo `.md`:
   - Verifica **termos proibidos** (tabelas V1, campos inexistentes, etc.)
   - Verifica **afirmações incompatíveis** com regras canônicas
   - Respeita **contexto histórico** (marcadores como `> Historical Note:`)
   - Ignora arquivos isentos (QA, Reports, Sunset docs)
3. Produz relatório de findings
4. Exit code 1 se houver findings (bloqueia PR)

### 3. Termos Detectados

#### Termos Proibidos (Erro)

| Categoria | Exemplos |
|-----------|----------|
| Tabelas V1 | `permission_groups`, `user_permission_groups` |
| Sistema V1 | "V1 templates", "V1 permissions" |
| Campos inexistentes | `profiles.email` |
| URLs antigas | `/bu/:buId/...` |
| RPCs deprecated | `send_test_notification` (sem v2) |
| Patterns removidos | `net.http_post` com cron |
| Canais não implementados | WhatsApp, SMS, Telegram |

#### Afirmações Incompatíveis (Erro)

| Afirmação | Regra Correta |
|-----------|---------------|
| "User directory filtra por membership" | Usa `v_bu_active_profiles` |
| "UI envia auth_user_id" | UI passa `profile.id` |
| "comparar auth.uid() com owner_user_id" | Usar `my_profile_id()` |
| "líder pode gerenciar time pai" | Só time próprio + filhos |

---

## Como Rodar Localmente

```bash
# Auditar todos os docs
npx tsx scripts/audit-docs-vs-tcr.ts

# Auditar apenas arquivos alterados (simula CI)
npx tsx scripts/audit-docs-vs-tcr.ts --changed-only
```

---

## Exemplos de Findings

### Termo Proibido

```
📄 docs/example.md
  ❌ Line 15:
     "O sistema usa permission_groups para gerenciar..."
     Tipo: Termo proibido
     Regra: Tabela V1 removida na Wave 9
     Correto: permission_templates_v2
```

### Afirmação Incompatível

```
📄 docs/users.md
  ❌ Line 42:
     "O User Directory filtra por membership na BU"
     Tipo: Afirmação incompatível
     Regra: User Directory v2 usa v_bu_active_profiles (profiles.bu_id), não depende de membership
```

---

## Como Corrigir

### 1. Termo Proibido

**Antes:**
```markdown
O sistema usa permission_groups para gerenciar acessos.
```

**Depois:**
```markdown
O sistema usa permission_templates_v2 para gerenciar acessos.
```

### 2. Contexto Histórico Válido

Se precisar referenciar V1 por contexto histórico:

**Antes (erro):**
```markdown
O sistema V1 usava groups customizados.
```

**Depois (válido):**
```markdown
> Historical Note: O sistema V1 (removido na Wave 9) usava groups customizados.
> O sistema atual usa templates pré-definidos.
```

### 3. Afirmação Incompatível

**Antes:**
```markdown
O User Directory lista apenas usuários com membership ativa na BU.
```

**Depois:**
```markdown
O User Directory usa a view `v_bu_active_profiles`, que lista todos os 
profiles com `bu_id` correspondente, independente de membership.
```

---

## Arquivos Isentos

Estes arquivos podem conter termos históricos sem erro:

| Pattern | Motivo |
|---------|--------|
| `docs/qa/*.md` | Checklists QA |
| `*REPORT*.md` | Reports de Waves |
| `*SUNSET*.md` | Documentos de sunset |
| `DOCS_CONSISTENCY_RULES.md` | Define as próprias regras |
| `TECHNICAL_CONTEXT_REGISTRY.md` | TCR é fonte de verdade |

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Termos proibidos monitorados | 13 |
| Afirmações incompatíveis monitoradas | 7 |
| Patterns de arquivo isentos | 6 |
| Marcadores históricos reconhecidos | 6 |

---

## Manutenção

### Adicionar Nova Regra

1. Editar `scripts/audit-docs-vs-tcr.ts`
2. Adicionar ao array `PROHIBITED_TERMS` ou `INCOMPATIBLE_ASSERTIONS`
3. Documentar em `DOCS_CONSISTENCY_RULES.md`

### Adicionar Marcador Histórico

1. Adicionar regex ao array `HISTORICAL_MARKERS` em `audit-docs-vs-tcr.ts`
2. Documentar em `DOCS_CONSISTENCY_RULES.md`

---

## Checklist de Validação

- [x] Script executa sem erros
- [x] Detecta termos V1 proibidos
- [x] Respeita contexto histórico
- [x] Ignora arquivos isentos
- [x] Mensagens de erro são claras
- [x] Exit codes corretos (0 = pass, 1 = fail)
- [x] Workflow CI configurado
- [x] Documentação atualizada

---

## Changelog

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0.0 | 2026-01-09 | Implementação inicial |
