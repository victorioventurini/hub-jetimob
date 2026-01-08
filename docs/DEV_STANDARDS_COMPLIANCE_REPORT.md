# Relatório de Compliance: Padrões de Desenvolvimento

**Data:** 2026-01-08  
**Versão TCR:** 2.10.0 → 2.11.0

---

## Resumo Executivo

Este relatório documenta a criação do documento `DEVELOPMENT_STANDARDS.md` e as atualizações no TCR para consolidar todos os padrões de desenvolvimento do Hub da Jet.

---

## O Que Foi Adicionado

### 1. Novo Documento: `docs/engineering/DEVELOPMENT_STANDARDS.md`

Documento normativo único contendo:

| Seção | Conteúdo |
|-------|----------|
| **A. Arquitetura e Contextos** | PRE-BU vs POST-BU, BU scope enforcement, exceções autorizadas |
| **B. Identidade** | Convenção auth.users.id vs profiles.id, funções canônicas, padrões |
| **C. Permissões (RBAC)** | usePermissions(), guards, templates somáveis, naming de keys |
| **D. Queries e Performance** | Query keys centralizadas, proibição select(*), paginação, RPCs |
| **E. URL State** | useUrlState, convenções de nomes, quando usar |
| **F. Edge Functions** | Estrutura padrão, validação JWT, BU, correlation ID, idempotência |
| **G. Banco de Dados** | RLS 100%, triggers, soft delete, migrations idempotentes |
| **H. Checklist de PR** | Audits obrigatórios, checklist manual, report de compliance |

### 2. Atualizações no TCR v2.11.0

| Alteração | Descrição |
|-----------|-----------|
| Header atualizado | Versão 2.10.0 → 2.11.0 |
| Documentação Complementar | Adicionados 5 novos links (DEVELOPMENT_STANDARDS, RBAC_TEMPLATES_V3, URL_STATE_STANDARD, QUERY_KEYS_STANDARD, BU_SCOPED_SUPABASE_RULES) |

---

## Seções do TCR Referenciadas

O novo documento consolida e referencia informações já presentes no TCR:

| Seção TCR | Seção DEVELOPMENT_STANDARDS |
|-----------|----------------------------|
| 1.5 Supabase Client Usage | A.1 PRE-BU vs POST-BU |
| 4.2.1 BU Scope Enforcement | A.2 BU Scope Enforcement |
| 4.10 Modelo de Identidade | B. Identidade |
| 1.4 Controle de Permissões | C. Permissões (RBAC) |
| 4.3 Padrão de Links e URLs | E. URL State |
| 8. Edge Functions | F. Edge Functions |
| 4.9 Histórico e Soft Delete | G.3 Soft Delete |

---

## Scripts de Auditoria Consolidados

O documento lista todos os scripts obrigatórios:

| Script | Arquivo | Propósito |
|--------|---------|-----------|
| BU Scope | `scripts/audit-bu-scope.ts` | Verifica inserts/updates sem bu_id |
| Query Keys | `scripts/audit-querykeys.ts` | Detecta queryKeys hardcoded |
| Identity | `scripts/audit-identity-usage.ts` | Detecta violações de identity convention |
| RBAC | `scripts/audit-rbac.ts` | Detecta hardcode de roles |
| URL State | `scripts/audit-url-state.ts` | Detecta useState para filtros/paginação |
| Overfetch | `scripts/audit-overfetch.ts` | Detecta select("*") |
| Supabase Client | `scripts/audit-supabase-client.ts` | Detecta cliente global em módulos operacionais |
| Pre-BU | `scripts/audit-prebu-buscoped.ts` | Detecta useBuScopedSupabase em contexto PRE-BU |

---

## Gaps Identificados

### Nenhum Gap Crítico

Todos os padrões já estavam implementados e documentados em documentos separados. O `DEVELOPMENT_STANDARDS.md` consolida e padroniza.

### Melhorias Futuras Sugeridas

| Item | Prioridade | Descrição |
|------|------------|-----------|
| CI/CD Integration | Baixa | Integrar audits como gates em pipeline CI |
| Testes Automatizados | Média | Criar testes para validar padrões |
| Linter Rules | Baixa | ESLint rules customizadas para detectar violações |

---

## Documentos Atualizados

| Documento | Alteração |
|-----------|-----------|
| `docs/TECHNICAL_CONTEXT_REGISTRY.md` | Versão 2.11.0, links para documentação complementar |
| `docs/engineering/DEVELOPMENT_STANDARDS.md` | **NOVO** - Padrões consolidados |

---

## Próximos Passos

1. ✅ Documento de padrões criado
2. ✅ TCR atualizado com links
3. [ ] Comunicar equipe sobre novo documento
4. [ ] Executar audits e verificar baseline
5. [ ] Adicionar ao onboarding de novos devs

---

## Conclusão

O documento `DEVELOPMENT_STANDARDS.md` agora serve como fonte única de verdade para padrões de desenvolvimento. Todos os padrões estão alinhados com o que já foi implementado (BU scope, RBAC, identity convention, URL state, etc.) sem contradições com o TCR existente.
