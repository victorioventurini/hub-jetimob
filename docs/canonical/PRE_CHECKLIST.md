# Pré-Checklist Obrigatório — Hub da Jet

**Versão:** 1.0.0
**Última atualização:** 2026-05-04
**Categoria:** NORMATIVO
**Referência:** TCR v3.30.0 · `DEVELOPMENT_STANDARDS.md` §P

---

> ⚠️ **Regra inquebrável:** se o pré-checklist não for executado, qualquer proposta de implementação, correção ou debugging está **automaticamente incorreta**.

## Itens

Executar **antes** de propor implementações, correções ou debugging:

1. [ ] **Contexto geral** — consultar [`TECHNICAL_CONTEXT_REGISTRY.md`](./TECHNICAL_CONTEXT_REGISTRY.md)
2. [ ] **Identidade** — se envolver usuários/perfis, consultar [`IDENTITY_CONVENTION.md`](./IDENTITY_CONVENTION.md)
3. [ ] **Permissões** — se envolver permissões, consultar [`PERMISSIONS_AND_RBAC_MODEL.md`](./PERMISSIONS_AND_RBAC_MODEL.md)
4. [ ] **Modelo de dados** — se envolver tabelas/entidades, consultar [`DATA_MODEL_REGISTRY.md`](./DATA_MODEL_REGISTRY.md)
5. [ ] **Reutilização** — verificar se já existe implementação similar no codebase

## Por quê

Cada item bloqueia uma classe de erro:

| Item | Erro evitado |
|------|--------------|
| TCR | Reinventar conceito de domínio inexistente, conflitar versão atual |
| Identity | Confundir `auth.uid()` com `profile_id` → RLS quebrada / privilege escalation |
| RBAC | Hardcode de role, bypass de permission keys |
| Data Model | Inventar nome de tabela/view/função, conflitar com schema canônico |
| Reutilização | Duplicar código, divergir de SSOT existente |

## Em caso de dúvida

- Buscar memórias relevantes em `mem://` (índice em `mem://index.md`).
- Buscar implementação similar com `rg` no projeto.
- Não propor nada sem evidência documental.

## Onde está registrado

- Bloco fonte: `<project-knowledge>` no system prompt.
- Espelho legível: este documento + `DEVELOPMENT_STANDARDS.md` §P.
