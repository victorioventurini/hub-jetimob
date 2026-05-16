# Pré-Checklist Obrigatório — Hub da Jet

**Versão:** 2.0.0
**Última atualização:** 2026-05-16
**Categoria:** NORMATIVO
**Referência:** TCR v3.31.1 · `DEVELOPMENT_STANDARDS.md` §P

---

> ⚠️ **Regra inquebrável:** se o pré-checklist não for executado, qualquer proposta de implementação, correção ou debugging está **automaticamente incorreta**.

## Princípio (v2)

**Carregar o mínimo necessário, não o máximo possível.** O TCR não deve ser lido inteiro — ele é índice + regras globais. Cada loop carrega apenas o(s) módulo(s) afetado(s).

## Fluxo (executar nesta ordem)

1. [ ] **Regras Core (sempre):** as regras inquebráveis em `mem://index.md` (seção **Core**) já estão em contexto. Aplicar sem ler nada.
2. [ ] **Identificar módulo(s)** afetado(s) a partir do pedido do usuário.
3. [ ] **Ler o módulo-master correspondente** em `mem://` (lista em `mem://index.md` § **Masters**) — ex.: OKRs → `mem://features/okrs/okrs-master-standard`; Rituais → `mem://features/rituals/rituals-master-standard`.
4. [ ] **Se envolver schema/RLS de tabelas:** consultar `docs/canonical/DATA_MODEL_REGISTRY.md` (lista mestre) e, se houver dúvida sobre colunas, `src/integrations/supabase/types.ts` (fonte da verdade).
5. [ ] **Se envolver permissões:** consultar `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` + `RBAC_TEMPLATES_V3.md`.
6. [ ] **Se envolver identidade (usuário/perfil/impersonation):** consultar `docs/canonical/IDENTITY_CONVENTION.md`.
7. [ ] **Reutilização:** antes de criar novo hook/component/edge function, buscar similar com `rg` no projeto.
8. [ ] **TCR** (`TECHNICAL_CONTEXT_REGISTRY.md`): só ler quando o pedido for **arquitetural transversal** (multi-BU, ciclos, eventos cross-módulo). Para mudanças dentro de um módulo, NÃO carregar o TCR.

## Anti-padrões proibidos

- ❌ Carregar `TECHNICAL_CONTEXT_REGISTRY.md` para uma mudança de 1 módulo.
- ❌ Listar colunas em docs `.md` quando `types.ts` já é fonte da verdade.
- ❌ Hardcode de role (`role === 'admin'`); usar permission keys.
- ❌ Comparar `auth.uid()` com colunas de domínio (use `my_profile_id()` quando RLS exigir profile).
- ❌ `select("*")`.

## Onde está registrado

- Regras Core: `mem://index.md` (sempre em contexto).
- Masters por módulo: `mem://index.md` § Masters.
- Detalhe arquitetural transversal: `TECHNICAL_CONTEXT_REGISTRY.md` (carregamento sob demanda).
- Espelho deste fluxo no system prompt: bloco `<project-knowledge>`.
