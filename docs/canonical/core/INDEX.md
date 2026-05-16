# Canonical Docs — Router

**Versão:** 1.0.0 · **Atualizado:** 2026-05-16
**Função:** mapear pedido do usuário → arquivos mínimos a carregar.

> ⚠️ **Não carregar `TECHNICAL_CONTEXT_REGISTRY.md` inteiro.** O TCR permanece como arquivo histórico transversal. Para mudanças por módulo, usar este router.

---

## Como decidir o que ler

```
pedido do usuário
   │
   ├─ regras inquebráveis  ─►  já em contexto via mem://index Core (não ler nada)
   │
   ├─ mudança dentro de 1 módulo
   │     ├─ ler: core/TCR_CORE.md (se ainda não foi consultado nesta sessão)
   │     ├─ ler: modules/<módulo>.md
   │     └─ ler: mem://features/<módulo>/... (Master correspondente)
   │
   ├─ mudança transversal (multi-BU, ciclos, eventos cross-módulo)
   │     ├─ ler: core/TCR_CORE.md
   │     └─ ler: modules/<cada módulo afetado>.md
   │
   ├─ envolve schema/RLS de tabela
   │     ├─ fonte da verdade: src/integrations/supabase/types.ts
   │     ├─ presença de tabelas e gatilhos não-óbvios: DATA_MODEL_REGISTRY.md
   │     └─ NUNCA listar colunas em .md quando types.ts já tem
   │
   ├─ envolve permissões
   │     ├─ PERMISSIONS_AND_RBAC_MODEL.md
   │     └─ RBAC_TEMPLATES_V3.md
   │
   ├─ envolve identidade/impersonation
   │     └─ IDENTITY_CONVENTION.md  +  mem://auth/identity-rbac-master
   │
   └─ envolve AI / Edge Functions / Wizards
         ├─ AI:        mem://standards/ai/ai-master-standard
         ├─ Edge:      mem://backend/edge-function-standard-v4
         └─ Wizards:   mem://architecture/wizards/wizards-master-standard
```

---

## core/ — sempre que houver contexto arquitetural

| Arquivo | Conteúdo | Quando carregar |
|---|---|---|
| `core/INDEX.md` | (este arquivo) router | Sempre que iniciar tarefa não trivial |
| `core/TCR_CORE.md` | Stack, arquitetura, regras transversais, convenções | Tarefa multi-módulo ou primeira tarefa da sessão |

---

## modules/ — um arquivo por módulo do Hub

| Módulo | Arquivo | Slug |
|---|---|---|
| OKRs | `modules/okrs.md` | `okrs` |
| KPIs | `modules/kpis.md` | `kpis` |
| Rituais | `modules/rituals.md` | `rituals` |
| Projetos | `modules/projects.md` | `projects` |
| Tickets | `modules/tickets.md` | `tickets` |
| Times | `modules/teams.md` | `teams` |
| Assets (Inventário/Chaves/Brindes) | `modules/assets.md` | `assets` |
| Integrações + Automações | `modules/integrations.md` | `integrations` |
| Vic (AI) | `modules/vic.md` | `vic` |
| BU Management | `modules/bu.md` | `bu` |
| Assessments | `modules/assessments.md` | `assessments` |

> Cada `modules/<x>.md` contém: tabelas + enums (referencia `types.ts`, não duplica), RLS resumida, hooks, componentes, páginas, permissões, URL state, regras de negócio específicas, links para os Masters em `mem://`.

---

## Anti-padrões proibidos

- ❌ Carregar `TECHNICAL_CONTEXT_REGISTRY.md` para mudança de 1 módulo.
- ❌ Duplicar colunas/enums em .md quando `types.ts` já é fonte da verdade.
- ❌ Carregar todos os `modules/*.md` "por garantia".
- ❌ Carregar Masters de módulos não relacionados ao pedido.
