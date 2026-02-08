
## Pré-checklist obrigatório (executado antes do plano)
### Documentos canônicos revisados
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (TCR v3.0.0) — padrões de arquitetura, PRE-BU/POST-BU, singletons, governança.
- `docs/canonical/DEVELOPMENT_STANDARDS.md` (v1.21.0) — padrões obrigatórios (query keys, invalidação, context resilience, etc.).
- `docs/canonical/IDENTITY_CONVENTION.md` (v2.1.1) — regra de ouro `auth.uid()` vs `profiles.id` (para garantir que nada de mutation/RLS está “misturando IDs”).
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` (v1.4.0) — permission keys e escopos.
- `docs/canonical/DATA_MODEL_REGISTRY.md` (v1.2.2) — confirma `kpi_metrics` como BU-scoped e campos de ownership.

### Implementações similares verificadas no codebase
- Padrão canônico de “resetar form só ao abrir dialog”: `src/hooks/useDialogFormReset.ts` + usos em múltiplos dialogs (ex.: `AreaFormDialog`, `EditBuDialog`, etc.).
- Padrão de troca de escopo no KPI Create: `src/modules/kpis/components/CreateKpiDialog.tsx` usa handler (`handleScopeChange`) e não um `useEffect` reativo para limpar campos.
- Query keys canônicas para KPIs: `src/lib/queryKeys/okrs.ts` exporta `kpisKeys` (via `queryKeys.kpis.*`).

---

## Diagnóstico provável (por que “não consigo mudar escopo” continua)
Há dois pontos que, combinados, explicam perfeitamente o sintoma “eu salvo/mudo mas volta a ser Global / não reflete”:

1) **Reset indevido do formulário enquanto o dialog está aberto**
- O `EditKpiDialog` atualmente faz `form.reset(...)` em um `useEffect` que roda sempre que `kpi` mudar e `open` for true.
- Se a query do KPI/lista refetchar (por foco de janela, reconexão, invalidations de outros lugares, ou re-render do pai), isso pode “puxar” o form de volta para os valores originais (ex.: `scope='org'`) e dar a sensação de que “não deixa mudar”.

2) **Invalidação de cache incorreta nas mutations de KPI**
- Em `useKpiMutations.ts`, após `updateKpi`, está sendo feito:
  - `invalidateQueries({ queryKey: queryKeys.kpis.all(null) })`
- Porém os KPIs são buscados com keys do tipo:
  - `queryKeys.kpis.list(null, filters)` → `['kpis','list', null, filters]`
- **`['kpis', null]` não casa com `['kpis','list', null, ...]`**, então a lista não refetch, e a UI pode ficar “presa” no estado anterior mesmo que o banco tenha atualizado.
- Isso é um bug funcional (e é testável).

---

## Objetivo do que vamos fazer
1) **Criar testes (unitários) que reproduzam exatamente a falha atual**:
   - Trocar escopo de `org → area` e `org → team`, preencher campos dependentes, salvar, e garantir que a mutation recebe o payload correto.
   - Simular “re-render do pai com novo objeto kpi enquanto o dialog está aberto” e verificar que a escolha do usuário não é perdida.
   - Criar testes específicos para invalidação (garantir que as keys certas são invalidadas).

2) **Corrigir o comportamento para que:**
   - O form só resete quando o dialog abre (padrão canônico), e não em qualquer mudança do objeto `kpi`.
   - A limpeza de campos dependentes ao trocar escopo seja determinística (idealmente via handler, como no CreateKpiDialog).
   - O cache refaça fetch corretamente depois de update/delete/archive/reactivate, refletindo a mudança de escopo imediatamente sem refresh.

---

## Plano de implementação (com testes primeiro)
### 1) Testes unitários: EditKpiDialog (reprodução + regressão)
Atualizar/adicionar casos em `src/modules/kpis/components/__tests__/EditKpiDialog.test.tsx`:

1. **Troca de escopo: org → area**
   - Render com KPI `scope='org'`.
   - Usuário muda `Escopo` para `Área`.
   - `AreaSelect` aparece.
   - Seleciona uma área.
   - Submete.
   - Asserções:
     - `updateKpi.mutateAsync` foi chamado com `scope='area'`, `team_id=null`, `area_id='area-1'` (ou a escolhida).

2. **Troca de escopo: org → team**
   - Render com KPI `scope='org'`.
   - Usuário muda `Escopo` para `Time`.
   - `TeamSelect` aparece.
   - Seleciona um time.
   - Submete.
   - Asserções:
     - `updateKpi.mutateAsync` foi chamado com `scope='team'`, `team_id='team-1'`.
     - `area_id` no payload segue regra do produto: inferida via `useTeamArea` (mock já existe no teste), então esperamos `area_id='inferred-area-id'` (ou null se time não tem área).

3. **Regressão principal: não perder alteração por “reset enquanto aberto”**
   - Render com `open=true`.
   - Usuário muda scope (ex.: para `area`) mas não salva ainda.
   - Forçar `rerender` do componente passando um novo objeto `kpi` (mesmo id, mesmos dados) simulando “refetch”.
   - Asserção: o `Select` de `scope` continua com o valor escolhido pelo usuário, e os inputs já editados permanecem.
   - Esse teste deve falhar no estado atual (prova do bug) e passar após a correção.

Critérios de aceite (unit):
- Todos os testes anteriores continuam passando.
- Esses 3 novos testes passam.

---

### 2) Correção: reset do form seguindo padrão canônico (useDialogFormReset)
Em `src/modules/kpis/components/EditKpiDialog.tsx`:
- Substituir o `useEffect` “Reset form when KPI changes” por `useDialogFormReset(open, ...)` para executar `form.reset(...)` **somente quando o dialog transiciona fechado → aberto**.
- Garantir que ao trocar de KPI (id diferente) o reset aconteça no próximo open (ou, se o dialog permite trocar KPI aberto, tratar esse caso explicitamente por id-change — mas sem destruir edições por refetch do mesmo KPI).

Critérios de aceite:
- O teste de regressão (1.3) passa.
- Usuário consegue trocar scope sem “voltar sozinho”.

---

### 3) Correção: troca de escopo com limpeza determinística (evitar efeito reativo frágil)
Ainda em `EditKpiDialog.tsx`:
- Alinhar com o padrão do `CreateKpiDialog`: criar um `handleScopeChange(newScope)` que:
  - `setValue('scope', newScope)`
  - Se `newScope !== 'team'`: limpar `team_id`
  - Se `newScope !== 'area'`: limpar `area_id` (porque `org` não usa e `team` infere)
- Remover ou simplificar o `useEffect` que hoje tenta limpar campos ao detectar mudança via `watchScope` + `prevScopeRef`. Esse approach é mais suscetível a edge cases (reset/refetch).

Critérios de aceite:
- Testes 1.1 e 1.2 passam.
- UI reflete corretamente campos dependentes.

---

### 4) Correção: invalidação de cache para KPIs (causa provável de “não refletir depois de salvar”)
Em `src/modules/kpis/hooks/useKpiMutations.ts` (e também onde houver `queryKeys.kpis.all(null)` em mutations relacionadas):
- Trocar a estratégia de invalidação para uma que realmente case com as keys existentes:
  - Opção A (preferível e consistente): adicionar helpers de prefix em `kpisKeys` (em `src/lib/queryKeys/okrs.ts`), por exemplo:
    - `prefix: () => ['kpis']`
    - `listPrefix: () => ['kpis','list']`
    - `evolutionListPrefix: () => ['kpis','evolution-list']`
  - E então invalidar:
    - `invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' })`
    - `invalidateQueries({ queryKey: queryKeys.kpis.evolutionListPrefix(), refetchType: 'active' })` (se aplicável)
    - `invalidateQueries({ queryKey: queryKeys.kpis.detail(kpiId), refetchType: 'active' })`

- Repetir o ajuste para delete/archive/reactivate e qualquer outra mutation KPI que hoje invalida `queryKeys.kpis.all(null)`.

Critérios de aceite:
- Ao salvar, a lista/telas que dependem de `kpis.list(...)` atualizam sem refresh.
- O usuário vê o escopo atualizado imediatamente após salvar.

---

### 5) Testes unitários adicionais (cache invalidation)
Adicionar teste para `useKpiMutations` validando que `invalidateQueries` é chamado com as keys prefix certas após `onSuccess`.
- Estratégia: mock do `useQueryClient()` e asserção em `invalidateQueries` com as keys esperadas.

Critérios de aceite:
- Teste falha antes do fix e passa depois.

---

## Validação manual (pós-merge)
1) No app (logado), abrir uma KPI Global (scope org) e editar:
   - Mudar para Área, escolher área, salvar → reabrir → permanece Área.
   - Mudar para Time, escolher time, salvar → reabrir → permanece Time e área inferida aparece como badge.
2) Confirmar que a lista de KPIs e qualquer dashboard que mostre scope reflete sem precisar refresh.
3) (Opcional) Verificar também a tela de evolução (`useKpiEvolutionList`) para garantir que os filtros/agrupamentos refletiram a mudança.

---

## Riscos/edge cases que vamos cobrir
- Refetch de dados enquanto modal aberto não deve apagar edições.
- Troca de escopo não pode deixar `team_id` setado quando `scope='org'/'area'` (o trigger de governança também rejeita isso).
- Para `scope='team'`, `area_id` deve ser inferida, e não exigida manualmente.
- Manter conformidade com PRE-BU/POST-BU: mutations continuam usando cliente BU-scoped via `useOptionalBuScopedSupabase()` + `assertSupabaseClient`.

---

## Entregáveis
- Testes unitários novos e cobrindo o bug real.
- Refactor do `EditKpiDialog` para seguir padrão canônico de reset.
- Correção de invalidação de cache de KPIs (principal suspeita de “não refletir”).
- Pequena evolução de `kpisKeys` com prefix helpers (mantendo padrão de query keys centralizadas).
