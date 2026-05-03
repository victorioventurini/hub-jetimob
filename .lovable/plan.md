# Plano

Pré-checklist canônico realizado: TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`), `DATA_MODEL_REGISTRY.md`, `PERMISSIONS_AND_RBAC_MODEL.md`, `IDENTITY_CONVENTION.md`, `BU_SCOPED_SUPABASE_RULES.md`, `WIZARDS_FRAMEWORK_BOUNDARY.md`, `QUERY_KEYS_STANDARD.md` e memórias de KPIs/Wizards revisadas. Nenhum dos dois itens exige alteração de schema, RLS, edge function ou nova permission key.

---

## Item 1 — MBR-Pre Summary: justificativa e plano de ação inline em cada KPI/KR

**Estado atual** (`MbrPreSummary.tsx`):
- `SummaryKpiList` mostra KPIs como linha compacta (dot RAG + nome + valor) sem justificativa.
- `SummaryKrBalance` mostra KRs com ícone + nome + % sem justificativa.
- As justificativas existem só no card "Justificativas registradas" abaixo, separadas dos itens — o líder precisa rolar e cruzar manualmente.

**O que muda**
- Os componentes shared `SummaryKpiList` e `SummaryKrBalance` ganham um prop opcional `justifications?: Record<string, string>`. Quando presente, o item passa a renderizar em duas linhas:
  - Linha 1 (atual): dot/ícone, nome, badge, valor/%.
  - Linha 2 (nova, condicional): bloco de justificativa com o texto completo (whitespace-pre-wrap, fundo `bg-muted/30`, ícone `MessageSquareQuote`, label "Plano de ação do líder"). Só renderiza se houver texto não vazio para aquele `kpiId`/`krId`.
- `MbrPreSummary` passa `kpiJustifications` e `krJustifications` (que já tem em `draftData`) para os respectivos componentes.
- O card consolidado "Justificativas registradas" (KPIs + KRs) é removido para evitar duplicação visual. As seções de **Projetos** e **Marcos atrasados** desse mesmo card são preservadas (eles não têm renderização própria no summary), apenas saem agrupadas em um card menor "Justificativas de execução (projetos e marcos)".
- Hierarquia visual: a justificativa fica recuada (pl-4) e com tipografia menor para deixar claro que é metadata da linha acima.

**Reuso e simetria**
- `QbrPreSummary` consome os mesmos `SummaryKpiList`/`SummaryKrBalance`. Como o prop é opcional, o QBR continua funcionando inalterado; em iteração futura pode passar suas próprias justificativas (sem obrigação agora).
- Resolução de nomes continua via `useEntityLookup` no `SummaryKrBalance` (já existe) — não introduzimos lookup novo.

**Arquivos**
- `src/modules/okrs/components/wizards/shared/SummaryKpiList.tsx` — adicionar prop `justifications` e renderização inline.
- `src/modules/okrs/components/wizards/shared/SummaryKrBalance.tsx` — idem.
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` — passar justifications, remover seções duplicadas de KPI/KR do card "Justificativas registradas", manter apenas projetos/marcos.

---

## Item 2 — `/kpis`: filtro por responsável

**Estado atual**
- `useKpiData` já aceita `ownerId` e aplica `.eq("owner_user_id", ownerId)` no servidor; `queryKey` já inclui `ownerId` (cache correto).
- `KpiDashboardFilters` expõe Tipo, Status, Vínculo KR, Área, Escopo e Time — falta Responsável.
- `BuUserSelect` é o componente canônico de seleção de usuário único, BU-scoped, com `includeAll`.

**O que muda**
- `KpiDashboardFilters`: novo prop opcional `ownerId` + `onOwnerChange`. Renderiza um `BuUserSelect` com `includeAll`, `allLabel="Todos os responsáveis"`, `triggerClassName="w-full sm:w-[200px]"`. Posicionado entre "Área" e "Escopo".
- `KpiDashboardPage`:
  - Novo `useUrlState` para `owner_id` (chave URL `owner_id`, default `"all"`), seguindo o padrão dos outros filtros.
  - Passa `ownerId` para `useKpiData` (já suportado).
  - Passa `ownerId`/`onOwnerChange` para `KpiDashboardFilters`.
- Filtro composta com os demais (e com `SavedLinksPopover`) automaticamente, pois é URL state.

**Arquivos**
- `src/modules/kpis/components/KpiDashboardFilters.tsx` — adicionar prop e `BuUserSelect`.
- `src/modules/kpis/pages/KpiDashboardPage.tsx` — URL state + wiring.

---

## Garantias canônicas

- **BU isolation:** mantida (filtro server-side em `useKpiData` já passa por `bu_id`; `BuUserSelect` é BU-scoped).
- **Query keys:** já segue `queryKeys.kpis.list(currentBuId, { ownerId, ... })`.
- **Sem `select("*")`, sem CHECK constraint, sem mudanças de RLS/edge.**
- **Wizards Framework Boundary:** alterações ficam dentro de `src/modules/okrs/components/wizards/shared`, consumidas só por OKR — não cruza o boundary.
- **Memoização:** `SummaryKpiList`/`SummaryKrBalance` continuam `memo()`.