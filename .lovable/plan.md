# Reorder Step 1 — Check-in Individual

## Objetivo

Garantir que o snapshot ("Seu retrato da semana") e a trilha ("Seu check-in hoje") do Step 1 do Check-in Individual sigam **exatamente** a mesma ordem dos steps do rito:

1. Indicadores (KPIs)
2. Projetos
3. Iniciativas
4. KRs
5. Reflexão e envio (apenas na trilha)

A ordem deve ser **derivada** do `STEP_ORDER` (SSOT da página), não hardcoded. Se a sequência mudar no futuro, snapshot e trilha acompanham automaticamente.

## Mudanças

### 1. `CollaboratorSnapshot.tsx` — adicionar linha de Iniciativas e tornar a ordem configurável

- Adicionar campos `initiativesTotal` e `initiativesOnTrack` em `SnapshotInputs`.
- Renderizar **4 linhas** na ordem: KPIs → Projetos → Iniciativas → KRs.
- Linhas com `total === 0` continuam mostrando "Sem ..." (mantém comportamento atual de fallback).
- Largura da coluna do label aumentada de `88px` para `~104px` para acomodar "Iniciativas".

### 2. `CollaboratorCheckinTrail.tsx` — sem mudanças estruturais

A trilha já é genérica: recebe `steps[]` na ordem que o caller passar. Apenas o caller (Step 1) muda.

### 3. `CollaboratorContextStep.tsx` — derivar ordem do `STEP_ORDER` e injetar contagem de iniciativas

- Importar `STEP_ORDER` da página (ou extrair para constante compartilhada — ver "Detalhes técnicos").
- Buscar contagem de iniciativas do colaborador no ciclo (owner OR contributor) — reutilizando o mesmo contrato de query do `CollaboratorInitiativesStep` (memória `collaborator-initiatives-step-scope`). Adicionar um hook leve `useCollaboratorInitiativesSignal(effectiveUserId, cycleId)` em `src/modules/okrs/hooks/` que retorna `{ initiativesTotal, initiativesOnTrack, isLoading }` — projeção mínima (id, status, owner_user_id, contributors), sem invalidar caches pesados. Segue o mesmo padrão do `useCollaboratorOpeningSignals`.
- Passar `initiativesTotal/OnTrack` ao `<CollaboratorSnapshot>`.
- Construir o array `steps` da trilha **mapeando** sobre `STEP_ORDER` filtrado, em vez de literal hardcoded:
  - `kpis` → "Indicadores"
  - `projects` → "Projetos"
  - `initiatives` → "Iniciativas"
  - `checkin` → "KRs"
  - `reflection` → "Reflexão e envio" (sempre último, fixo)
  - Steps `context`, `decisions`, `summary` são pulados na trilha (não fazem parte da contagem de "trabalho do usuário" exibida ao abrir o rito).
- Atualizar `computeTrailEta` para incluir `initiatives` (regra: 1 min base + 0.5 min por iniciativa em atenção). Manter regras existentes para os demais.

### 4. Resumo dos textos finais

**Snapshot:**
```
Seu retrato da semana
KPIs         ●●○○○○○○     2 de 8 atualizados
Projetos     ●●●●○        4 de 5 saudáveis
Iniciativas  ●●●○         3 de 4 em dia
KRs          ●●●○○        3 de 5 em dia
```

**Trilha:**
```
Seu check-in hoje
① Indicadores       6 KPIs para atualizar         ~3 min
② Projetos          4 de 5 saudáveis              ~2 min
③ Iniciativas       3 de 4 em dia                 ~2 min
④ KRs               1 KR precisa atenção          ~5 min
⑤ Reflexão e envio                                ~2 min
```

## Detalhes técnicos

### SSOT da ordem

Hoje `WIZARD_STEPS` e `STEP_ORDER` vivem inline em `CollaboratorCheckinPage.tsx`. Para o Step 1 derivar a ordem **sem importar a página**, vou extrair ambos para:

```
src/modules/okrs/components/wizards/collaborator/wizardSteps.ts
```

Exporta `WIZARD_STEPS`, `STEP_ORDER` e o tipo `WizardStep`. A página passa a importar dali; o Step 1 idem. Zero duplicação, ordem única.

### Hook novo

`src/modules/okrs/hooks/useCollaboratorInitiativesSignal.ts` — projeção mínima de `okr_initiatives` filtrada por `bu_id` (cliente BU-scoped), `cycle_id` (via inner join em `okr_team_key_results.team_objective`), `owner_user_id.eq OR contributors.cs.{userId}`, `deleted_at IS NULL`, `cancelled_at IS NULL`. Retorna totais derivados de `status`. Reutiliza chave de cache `queryKeys.okrs.initiativesForCollaborator` já existente, sufixada com `'opening-signal'`.

### Compatibilidade

- Sem mudança de tipos públicos do `<CollaboratorCheckinTrail>` (já aceita N steps).
- `<CollaboratorSnapshot>` ganha 2 props novas (`initiativesTotal/OnTrack`) — opcionais com default `0`, então qualquer outro consumidor (não há) seguiria funcionando.
- `STEP_ORDER` só muda de localização (extração), não de conteúdo. A página continua filtrando dinamicamente (`hasKrStep`/`hasKpiStep`).

## Arquivos afetados

- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorSnapshot.tsx`
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinTrail.tsx` (apenas `computeTrailEta` ganha campo `initiatives`)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorContextStep.tsx`
- **edit** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (importar `WIZARD_STEPS`/`STEP_ORDER` do novo arquivo)
- **new** `src/modules/okrs/components/wizards/collaborator/wizardSteps.ts`
- **new** `src/modules/okrs/hooks/useCollaboratorInitiativesSignal.ts` + export em `hooks/index.ts`
- **edit** `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (§4.8 — nota sobre ordem espelhada)
- **new** `.lovable/memory/features/rituals/collaborator-step1-order-mirrors-steps.md` + entrada no `index.md`

## Critérios de aceite

- Snapshot exibe 4 linhas na ordem KPIs → Projetos → Iniciativas → KRs.
- Trilha exibe 5 linhas na ordem Indicadores → Projetos → Iniciativas → KRs → Reflexão e envio.
- Renomear/reordenar entradas em `STEP_ORDER` reflete automaticamente no Step 1 (validado lendo o array, sem literais duplicados).
- Sem regressão em rituais que dependem de KPIs/KRs ausentes (steps continuam sendo filtrados via `hasKrStep`/`hasKpiStep`).
