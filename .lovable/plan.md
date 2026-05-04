## Pré-checklist canônico (cumprido)

- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md:2226` — MBR v4 tem step canônico `opening-executive` (hoje renderizado como "Panorama Executivo" via legado `MbrPanoramaStep`). É **exatamente** o slot da Abertura Executiva.
- ✅ `docs/canonical/AI_AGENTS_PHILOSOPHY.md:71-72,300` — *"`curador-orquestrador` invocado com insumos mensais → Abertura Executiva do MBR"* está no roadmap canônico do agente.
- ✅ `AI_AGENTS_PHILOSOPHY.md:230-231` — **PROIBIDO** criar `curador-mbr`. Reutilizar `curador-orquestrador` com insumos mensais.
- ✅ Agente confirmado no banco: `curador-orquestrador` ativo (mesmo do Weekly).
- ✅ Edge `mbr-summary` existente continua dedicada ao **email pós-finalização** — não confundir com curadoria em tela.
- ✅ Memories: BU isolation (`currentBu.id`), `realProfileId`, `tryParseAiJson`, `Promise.all` na edge, sem `select('*')`, sem CHECK constraints, sem `manualChunks`.

## Contexto

Hoje o MBR só usa IA depois de finalizado (email via `mbr-summary`). O usuário quer o mesmo padrão do **Weekly**: durante o rito, gerar um **rascunho executivo curado por IA** que o facilitador edita antes de conduzir a reunião. O TCR e a Filosofia de Agentes já preveem este caso explicitamente — **estamos apenas materializando uma decisão já canonizada**.

## Onde aparece

**Step 1 do MBR — `MbrPanoramaStep` (slot canônico `opening-executive`)**, espelhando exatamente a "Abertura Executiva" do Weekly (`WeeklyExecutiveOpeningStep`).

Novo bloco `MbrPanoramaCurationCard` no topo do conteúdo, **acima** dos KPIs por escopo e abaixo do `RitualPreparationStatus`:

```text
┌─ Curadoria do mês ─────────────────────── [Rascunho/Revisado/Aprovado] ┐
│  Modo manual — peça ao curador para gerar rascunho a partir dos        │
│  pré-MBRs do mês.        [✨ Gerar rascunho com IA]                    │
├────────────────────────────────────────────────────────────────────────┤
│  ✨ Resumo do mês             (textarea editável, 4 linhas)            │
│  📊 KPIs críticos             (lista headline + impacto, editável)     │
│  ⚠  Alertas por bloco          (performance / projetos / pessoas)      │
│  💡 Decisões sugeridas         (chips → "+ adicionar" → Decisions step)│
└────────────────────────────────────────────────────────────────────────┘
```

Comportamento idêntico ao Weekly: `origin: 'manual' | 'ai-curated'`, banner inicial "modo manual", botão "Regenerar" quando já existe rascunho, transições registradas com `realProfileId`.

## Backend

Nova edge function **`mbr-curate-opening`** (espelho exato de `weekly-curate-opening`). Justificativa:

- Reutiliza o **mesmo agente** `curador-orquestrador` (sem violar AI_AGENTS_PHILOSOPHY) — a diferença é só o **insumo** (mensal vs. semanal), conforme o próprio doc canônico exige.
- Não dá para reaproveitar `weekly-curate-opening` (input/output diferentes: KPIs estratégicos + objetivos org + agregados pré-MBR vs. temas de pré-weekly).
- Não dá para reaproveitar `mbr-summary`: aquela tem semântica diferente (idempotência via `summary_sent_at`, dispara email/notificação ao final).

**Input:**
```ts
{
  bu_id, buName, referenceMonth,
  criticalKpis: [{ id, name, currentValue, target, ragStatus, variationVsLastMonth }],
  orgObjectives: [{ title, progress, trend, status }],
  mbrPreAggregates: { needsDecisionCount, crossDepCount, kpiJustifCount, projectJustifCount, agendaSuggestionCount },
  coverage: { totalTeams, submittedTeams, pendingTeams }
}
```

**Orquestração** (`Promise.all`, padrão `EDGE_PERFORMANCE_STANDARD`):
1. `curador-orquestrador` → `executiveSummary`, `alertsByBlock`, `suggestedDecisions`
2. `analista-kpis` → `criticalKpiHighlights` (headline + impacto estratégico)

**Output JSON via tool calling** (sem regex frágil):
```ts
{
  origin: 'ai-curated' | 'manual',
  reason?: string,
  generatedAt: string,
  output: {
    executiveSummary: string,
    criticalKpiHighlights: Array<{ kpiId, headline, impact }>,
    alertsByBlock: { performance: string[], projetos: string[], pessoas: string[] },
    suggestedDecisions: Array<{ title, category }>,
    coverage: { rate, level }
  }
}
```

Reutiliza `_shared/middleware.ts`, `_shared/agent-loader.ts`, `_shared/llm-client.ts`. Padrão Edge v4. **Sem migrações de banco.**

## Frontend

### Novos arquivos

1. **`src/modules/okrs/types/wizard/mbr.ts`** (estender) — adicionar `MbrPanoramaCuration` (state, origin, generatedAt, summary, criticalKpiHighlights, alertsByBlock, suggestedDecisions, transitions). Persistido em `draft.data.panoramaCuration`.

2. **`src/modules/okrs/hooks/useMbrOpeningCuration.ts`** — espelho de `useWeeklyOpeningCuration`:
   - Invoca `mbr-curate-opening`.
   - Mapeia output → `MbrPanoramaCuration`.
   - Estados `isGenerating`, `error`.
   - Fallback `origin: 'manual'` quando IA falha/desabilitada.

3. **`src/modules/okrs/components/wizards/mbr/MbrPanoramaCurationCard.tsx`** — UI do bloco. Reutiliza `Card`, `Textarea`, `Badge`, `Button`, `Sparkles/Wand2/Loader2/AlertTriangle`. **Mesmo vocabulário visual do Weekly.**

### Mudanças

- **`MbrPanoramaStep.tsx`**: nova prop `curation`, `onCurationChange`, `onGenerateDraft`, `isGenerating`. Renderiza `MbrPanoramaCurationCard` acima dos KPIs por escopo (após `RitualPreparationStatus`).
- **`MbrPage.tsx`**:
  - Default do draft inclui `panoramaCuration` (origin: 'manual', state: 'draft', vazio).
  - Instancia `useMbrOpeningCuration` com os agregados já calculados (KPIs críticos, orgObjView, mbrPreAggregates, cobertura).
  - Passa props ao `MbrPanoramaStep`.
  - Decisões sugeridas → botão "+ adicionar como decisão" empurra para `draft.data.decisions` (mesmo formato que `InlineDecisionInput`).
- **`mbr-summary` (edge existente)**: pequeno ajuste — quando `panoramaCuration.summary` existe no snapshot, usa como insumo prioritário do `opening_text` (preserva intenção humana editada na reunião).

### Index/barrel
- `src/modules/okrs/components/wizards/mbr/index.ts` exporta `MbrPanoramaCurationCard`.
- `src/modules/okrs/hooks/index.ts` exporta `useMbrOpeningCuration` (segue `HOOKS_BARREL_STANDARD`).

## Resiliência (não-negociáveis)

- `tryParseAiJson` no parsing do output do LLM (Core memory: AI Safety).
- Edge com timeout/fallback centralizados (memory: Vic Invoke Resilience aplicado no padrão).
- BU isolation via `currentBu.id` (Core memory).
- `realProfileId` em `transitions[].by` (Core memory: Identity).
- `Promise.all` na orquestração (memory: Edge Function Performance).
- Sem `manualChunks`, sem `select('*')`, sem CHECK constraints.

## Fora de escopo

- ❌ Não criar `curador-mbr` (proibido pela Filosofia de Agentes).
- ❌ Não migrar o step para o framework canônico v4 puro (`opening-executive` → `BalanceStep`) — fora do escopo deste pedido; o MBR já roda na v4 com o componente legado preservado conforme `WIZARDS_FRAMEWORK_BOUNDARY.md`.
- ❌ Não adicionar curadoria nos demais steps (Encerramento permanece como está).
- ❌ Sem mudanças em DB.

## Testes

- Novo `supabase/functions/mbr-curate-opening/index.test.ts`:
  - Payload válido com KPIs críticos → `ai-curated`.
  - Payload sem KPIs críticos e sem agregados → `manual` (reason: `INSUFFICIENT_INPUT`).
  - Agente desabilitado na BU → `manual` (reason: `AGENT_DISABLED`).
- QA manual: gerar → editar resumo → continuar wizard → finalizar → confirmar email final usa o `summary` editado.
