## Onda 4 — Fase 1: Denormalização de nomes/títulos em snapshots

### Contexto

Hoje os snapshots de ritos (`okr_wizard_sessions.reflection_data`) gravam **nomes/títulos junto com IDs**. Isso causa três problemas:

1. **Duplicação**: 18 campos espelham dados disponíveis via join (`teamName`, `krTitle`, `objectiveTitle`, `ownerName`, `kpiName`, `areaName`, `submittedByName`, `authorName`, `relatedKrTitle`).
2. **Tipos inflados**: cada step que constrói snapshot precisa buscar e empilhar nome + ID.
3. **Dados desatualizados**: se um KR foi renomeado depois do rito, o snapshot ainda mostra o nome antigo.

### Decisão crítica de produto (PRECISA SER FEITA ANTES DE IMPLEMENTAR)

Há **dois comportamentos possíveis** ao remover os campos denormalizados, e eles são incompatíveis:

**A) Snapshot vivo (nomes atuais via join)**
- Renderers de ritos buscam nomes em runtime via `useTeams`/`useKeyResults`/`useProfiles`.
- Se um KR foi renomeado, o rito histórico mostra o nome novo.
- Se o KR foi excluído (soft-delete), o renderer mostra "—" ou "(removido)".
- Vantagem: consistência — nomes sempre corretos.
- Risco: regressão visual em ritos antigos onde times foram renomeados/divididos.

**B) Snapshot imutável (nomes congelados, mas via campo único)**
- Mantém os nomes no snapshot, mas extrai um tipo canônico (`EntityRef = { id; name }`) e remove a duplicação **estrutural** sem perder o histórico.
- Não resolve o problema de "dados desatualizados" porque é justamente isso que se quer preservar (auditoria).
- Vantagem: zero regressão; auditoria preservada.
- Custo: a "denormalização" vira refator cosmético — deduplica shape, não dados.

A intenção original do plano (linha 72) era **A** ("histórico passa a mostrar nomes atuais"). Ritos OKR são instrumentos de **gestão**, não de auditoria contábil — nomes atuais costumam ser preferíveis. Mas isso precisa ser confirmado.

### Escopo proposto (assumindo opção A)

#### Etapa 1 — Auditar consumidores
- Para cada um dos 23 campos identificados (`teamName`, `krTitle`, `objectiveTitle`, `ownerName`, `kpiName`, `areaName`, `submittedByName`, `authorName`, `relatedKrTitle`), localizar:
  - Steps que **escrevem** o campo no snapshot.
  - Renderers/cards/exports que **leem** o campo.
  - Edge functions (`mbr-summary`, `qbr-clevel-learnings-summary`, `get-tcr`, `team-checkin-summary`) que recebem snapshot.
- Saída: tabela `campo → escritores → leitores → backend consumer`.

#### Etapa 2 — Criar lookups canônicos para renderers
- Hook `useEntityLookup({ teamIds, krIds, objectiveIds, profileIds, kpiIds })` retornando `Map<id, { name }>` com fallback `(removido)`.
- Já existem hooks individuais — esta etapa só consolida e padroniza fallback.

#### Etapa 3 — Remover campos dos types e dos writers
- Editar 13 tipos em `src/modules/okrs/types/wizard/*` removendo os 18 campos.
- Atualizar steps que escrevem snapshot para parar de empilhar nomes (apenas IDs).
- Manter `authorName` (em `DecisionThreadMessage`) — caso especial: thread de mensagens é mais semântica de "comentário" do que "snapshot estruturado". Decisão: **manter** (fora de escopo).

#### Etapa 4 — Atualizar renderers para usar lookups
- Cada renderer (`renderers/*.tsx`, cards de ritual report, exports) recebe `lookups` por prop ou via hook e resolve `id → name` em runtime.

#### Etapa 5 — Compatibilidade com snapshots antigos
- Snapshots já gravados ainda têm os campos. Decisão: **não migrar dados**. Os tipos passam a marcar os campos como `@deprecated` mas opcionais (`?`), permitindo leitura defensiva: `snapshot.teamName ?? lookups.teams.get(snapshot.teamId)?.name ?? '(removido)'`.
- Após N meses (decisão futura), drop dos campos.

#### Etapa 6 — Validação
- Snapshots antigos: abrir 3 ritos completados (1 MBR, 1 QBR, 1 Weekly) e validar render.
- Snapshots novos: completar 1 rito de cada tipo e validar render.
- `bunx vitest run src/modules/okrs` verde.
- Build TypeScript verde.

### Arquivos tocados (estimativa)
- 13 types em `types/wizard/*` (remover/deprecar campos)
- ~20 steps de wizard (parar de gravar nomes)
- ~15 renderers (usar lookup)
- 4 edge functions (ajustar contrato — pode ser feito em onda separada se quebrar muito)
- 1 hook novo (`useEntityLookup`)

### Risco
**Médio-alto.** Mexe em renderers exibidos para usuários finais. Edge functions podem precisar mudança de contrato. Recomendado fazer em sub-ondas: types primeiro (deprecar), depois writers, depois readers, depois drop.

### Decisão necessária do usuário

1. **Confirmar opção A vs B?** (snapshot vivo vs imutável)
2. **Escopo desta onda**: tudo de uma vez, ou só Etapa 1 (auditoria) + Etapa 3 (deprecar campos sem remover writers)?

### Recomendação

Sugiro **fazer apenas Etapas 1 + 3 nesta onda** (auditoria + deprecar campos como opcionais com `@deprecated`), e tratar Etapas 2/4/5 como ondas separadas após confirmação da decisão de produto. Isso mantém o padrão "zero mudança funcional" das ondas 2 e 3 e permite que a remoção real seja feita com segurança e em paralelo com QA.


---

## Status final — Onda 4 Fase 1 (denormalização — Etapas 1+3 parciais) executada

### Decisão de produto registrada

- **Opção A** (snapshot vivo / nomes atuais via lookup) escolhida implicitamente conforme intenção original do plano.
- Execução em **sub-ondas conservadoras**: Fase 1 apenas marca campos como `@deprecated`, sem remover writers nem alterar readers. Zero mudança funcional.

### Concluído

1. **Auditoria** — 23 campos identificados; 16 em snapshots persistidos foram marcados; 7 excluídos por escopo (thread/runtime/UI ephemeral).
2. **Deprecação** aplicada em:
   - `shared.ts` → `KrFinalStateSnapshot.{krTitle,objectiveTitle}`
   - `mbr.ts` → `MbrOrgOkrSnapshot.keyResults[].ownerName`, `MbrTeamOkrObjectiveSnapshot.keyResults[].ownerName`, `MbrTeamOkrSnapshot.teamName`, `MbrPreDraftData.krFinalStates[].{krTitle,objectiveTitle}`, `MbrPreDraftData.kpisToCreate[].relatedKrTitle`, `MbrPreTeamSubmission.submittedByName`
   - `qbr.ts` → `QbrPreDraftData.kpisToCreate[].relatedKrTitle`
   - `weekly.ts` → `WeeklyPriorityItem.teamName`, `WeeklyPeopleSignalAggregated.teamName`
   - `collaborator.ts` → `CollaboratorCheckinResult.{krTitle,objectiveTitle}`, `KpiCheckinResult.kpiName`
   - `managers-clevel.ts` → `AreaOkrSummary.areaName`, `CompanyOkrSummary.objectiveTitle`
3. **Memory** registrada: `mem://standards/wizard-snapshot-denormalized-fields-deprecation`.

### Exclusões intencionais

- `DecisionThreadMessage.authorName` (semântica de comentário).
- `WizardVicContext.{krTitle,objectiveTitle,teamName}` (contexto runtime).
- `DraftKrMetricLink.kpiName` (UI ephemeral pré-save).

### Validação

- `bunx vitest run src/modules/okrs`: **1766/1766 passando** ✅
- Build TS verde — `@deprecated` é metadata JSDoc, não altera tipo.
- Zero consumidor (steps/renderers/edge functions) precisou ser tocado.

### Pendente para sub-ondas futuras (Etapas 2/4/5 do plano)

- Criar hook `useEntityLookup` consolidado.
- Atualizar renderers para preferir lookup com fallback ao campo `@deprecated`.
- Atualizar writers para parar de gravar nomes (após confirmação de readers todos atualizados).
- Drop dos campos do schema/types após N meses.
