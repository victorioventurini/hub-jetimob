## Objetivo

Reduzir tokens por loop em **60–85%**, e zerar o trabalho recorrente de manter docs canônicos sincronizados com o banco.

Estratégia em 6 alavancas, ordenadas por ROI: ganhos rápidos primeiro, refatoração estrutural depois, automação por último.

---

## Fase 1 — Quick-Wins (paga em TODO loop, mesmo os pequenos)

### D. Extrair changelog do TCR

- Mover linhas 2758→4136 do `TECHNICAL_CONTEXT_REGISTRY.md` (93 entradas) para `docs/canonical/changelog/CHANGELOG.md`.
- Manter no TCR apenas as **5 últimas** entradas como "Histórico recente".
- Atualizar `DOCS_RETENTION_POLICY.md`: changelog ativo = 90 dias / 30 entradas. Restante → `changelog/CHANGELOG_<ano>Q<n>.md`.

**Impacto:** TCR cai de 4136 → ~2750 linhas (-33%) sem perder informação.

### E. Compactar `mem://index.md`

Hoje: ~150 linhas, sempre em contexto.

- Consolidar memórias avulsas em **memórias-master por módulo** (padrão já adotado em KPIs Master, AI Master, QBR Master).
- Alvos óbvios: `OKRs Master` (12 entradas viram 1), `Rituals Master` (consolidar 18 entradas já parcialmente cobertas), `Standards Master` (16 entradas → 1 sumário com links).
- Resultado esperado: ~55 linhas no índice (~60% de redução).

### F. Enxugar `<project-knowledge>` do custom_instructions

- Pré-checklist atual repete em todo prompt o que já está em `core` do `mem://index`.
- Reduzir para 8-10 linhas: "Antes de qualquer ação, ler `docs/canonical/PRE_CHECKLIST.md` e o(s) `modules/*.md` afetado(s). Regras inquebráveis em `mem://index`."
- Mover tabela de "Regras Inquebráveis" para `PRE_CHECKLIST.md`.

**Impacto combinado D+E+F:** ~35-40% menos contexto em **todo loop**, em ~1h de trabalho.

---

## Fase 2 — Reestruturação por módulo (A)

### Nova árvore `docs/canonical/`

```text
docs/canonical/
  core/                      ← lido sempre que pré-checklist é acionado
    INDEX.md                 (roteador "afetou módulo X → leia Y")
    TCR_CORE.md              (~350 linhas: 1.x stack/auth/multi-BU + 4.x regras críticas + 10 convenções)
    DEVELOPMENT_STANDARDS.md
    IDENTITY_CONVENTION.md
    PERMISSIONS_AND_RBAC_MODEL.md
    PRE_CHECKLIST.md

  modules/                   ← lido APENAS no escopo
    okrs.md  kpis.md  rituals.md  assessments.md
    tickets.md  projects.md  assets.md  partners.md
    automations.md  integrations-ai.md  teams.md  notifications.md

  reference/                 ← lookup pontual, sob demanda
    UI_COMPONENTS_REGISTRY.md  TYPES_INDEX.md
    LIB_INDEX.md  HOOKS_BARREL_STANDARD.md
    QUERY_KEYS_STANDARD.md  EDGE_*.md
    BUNDLING_*.md  BU_SCOPED_SUPABASE_RULES.md

  generated/                 ← gerado por script (Fase 4)
    DB_FUNCTIONS_INDEX.md  DB_VIEWS_INDEX.md
    SCHEMA_QUICK_REFERENCE.md  RBAC_TEMPLATES_V3.md

  changelog/
    CHANGELOG.md  CHANGELOG_2026Q1.md  ...
```

### Template fixo de `modules/<nome>.md` (~150-250 linhas)

```text
# <Módulo>
## Resumo (≤5 linhas)
## Tabelas (nome + FKs principais — não duplicar types.ts)
## Permission keys + templates V2
## Hooks/Selects canônicos
## Edge functions e RPCs
## Regras de negócio inquebráveis
## Integrações com outros módulos
## Últimas 5 mudanças (changelog do módulo)
```

### Atualizar `PRE_CHECKLIST.md`

Novo fluxo determinístico:
1. Ler `core/INDEX.md`.
2. Identificar módulo(s) afetado(s) a partir do pedido.
3. Carregar `core/TCR_CORE.md` + `core/<arquivos pertinentes>` + `modules/<modulo>.md`.
4. **Nunca** ler outros `modules/*.md` salvo dependência explícita.
5. `reference/` e `generated/` apenas sob demanda.

---

## Fase 3 — Deduplicação (B)

Hoje, schema vive em 4 lugares: `TCR §2`, `DATA_MODEL_REGISTRY.md`, `SCHEMA_QUICK_REFERENCE.md`, `src/integrations/supabase/types.ts`.

- **Fonte da verdade = `types.ts`** (já é auto-gerado e nunca desatualiza).
- **Deletar** seções de "lista de colunas" em `SCHEMA_QUICK_REFERENCE.md` e `TCR §2`. Manter apenas:
  - Relacionamentos não-óbvios (FKs polimórficas, identity map).
  - Triggers e seus efeitos.
  - RLS resumida (1 linha por tabela: "BU-scoped via `has_X_permission`").
- `DATA_MODEL_REGISTRY.md` vira só **a tabela mestre de presença** (qual tabela existe, BU-scoped sim/não, módulo dono) — sem colunas.
- Cada `modules/<x>.md` referencia `types.ts` para detalhe de colunas: "Schema completo: `Database['public']['Tables']['assessment_categories']`".

**Impacto:** elimina 2 lugares de drift; remove ~600 linhas redundantes de docs.

---

## Fase 4 — Geração automática (C)

Criar `scripts/regen-canonical-docs.ts` que regenera todo `docs/canonical/generated/`:

| Arquivo | Origem |
|---|---|
| `DB_FUNCTIONS_INDEX.md` | `pg_proc` + `pg_namespace` |
| `DB_VIEWS_INDEX.md` | `pg_views` |
| `RBAC_TEMPLATES_V3.md` | `permission_templates_v2` + `permission_template_items_v2` |
| `SCHEMA_QUICK_REFERENCE.md` (relacional, só FKs/triggers) | `information_schema` + `pg_trigger` |
| `DATA_MODEL_REGISTRY.md` (tabela mestre) | introspecção + RLS de `pg_policy` |

Plug-in:
- CI step opcional: rodar a cada migration e abrir PR de docs.
- Comando manual: `bun run docs:regen`.

**Impacto:** manutenção dessas 5 docs cai a zero. Hoje toda mudança de schema/permissão obriga ~4 edições manuais (e historicamente algumas ficam desatualizadas — vide ausência de "assessments" em `PERMISSIONS_AND_RBAC_MODEL` antes desta sessão).

---

## Detalhes técnicos

- **Sem impacto em código de produção, RLS, edge functions ou DB.** Tudo é movimentação documental + 1 script Node.
- Reorganização de `docs/canonical/` é puro `mv`/refactor — git history preservado.
- Compactação do `mem://index` usa `code--write mem://<path>` (substituição atômica).
- Custom instructions: o arquivo `<project-knowledge>` é gerenciado pelo usuário fora do código — eu preparo o texto novo e você cola.
- Script de regeneração roda via `psql` (já disponível no sandbox) ou `supabase--read_query`. Sem dependências novas.
- Mudanças no `PRE_CHECKLIST.md` precisam ser comunicadas ao usuário porque elas alteram o contrato de comportamento do agente em loops futuros.

---

## Economia estimada por tipo de loop

| Tipo de loop | Hoje | Pós-D+E+F | Pós-A | Pós-B+C |
|---|---:|---:|---:|---:|
| Bug em 1 módulo | ~5100 linhas | ~3000 | ~900 | ~700 |
| Refactor 2 módulos | ~5100 | ~3000 | ~1200 | ~950 |
| Pergunta RBAC pura | ~5100 | ~3000 | ~920 | ~700 |
| Conversa curta (esta) | ~1500 | ~900 | ~900 | ~900 |

Quick-wins (Fase 1) por si só já cortam ~40% dos tokens em **todo** loop. Fase 2 leva para 80% em loops de implementação. Fases 3-4 são consolidação e fim de débito recorrente.

---

## Sequência sugerida

1. **Sessão 1 — Fase 1 (D+E+F):** mover changelog, compactar `mem://index`, propor novo `<project-knowledge>`. ~30-45min.
2. **Sessão 2 — Fase 2 base:** criar `core/`, `core/INDEX.md`, `TCR_CORE.md`, `PRE_CHECKLIST.md` reescrito. Mover arquivos. ~45min.
3. **Sessão 3-4 — Fase 2 módulos:** criar `modules/*.md` (4 módulos por sessão). ~2 sessões.
4. **Sessão 5 — Fase 3 (B):** deduplicar contra `types.ts`. ~45min.
5. **Sessão 6 — Fase 4 (C):** escrever `scripts/regen-canonical-docs.ts` + primeira execução. ~60min.
6. **Sessão 7 (opcional):** revisar memórias para deduplicar com `modules/*.md`.

Cada fase é independente — podemos parar em qualquer ponto sem quebrar o restante.
