Plano para corrigir o wizard de KRs que fica preso em "Carregando..."

1. Corrigir a resolução de estado da página
- Ajustar `TeamKrCreationPage.tsx` para separar 3 estados que hoje estão colapsados em um único loading:
  - carregando de fato
  - objetivo não encontrado / sem acesso na BU atual
  - sem permissão para gerenciar o time
- Substituir a condição atual `objectiveLoading || !objective || !objectiveContext || canManageLoading` por lógica explícita.
- Quando a query do objetivo retornar `null`, renderizar `ResourceNotFoundState` em vez de loading infinito.

2. Isolar cache por BU nas queries do wizard
- Incluir `currentBuId` nas query keys usadas pelo wizard, principalmente:
  - `queryKeys.okrs.teamObjectiveDetail(...)`
  - `queryKeys.okrs.objectiveContributors(...)`
- Atualizar os callers do wizard e pontos relacionados (`TeamKrCreationPage`, `TeamKrFormDialog`, invalidações em mutations) para usar as novas keys com BU.
- Isso evita reaproveitar cache `null` ou stale ao trocar de BU e cair na tela branca de loading eterno.

3. Alinhar gating com o padrão canônico PRE-BU/POST-BU
- No `TeamKrCreationPage`, usar `isReady` de `useOptionalBuClient()` para só disparar as queries quando o client BU-scoped estiver realmente pronto.
- Garantir que queries dependentes (`objective`, `contributors`) não rodem apenas com `client`, mas com `isReady` + `currentBuId` válidos.

4. Preservar o comportamento correto de owner vs contribuidor
- Manter o contrato canônico do wizard:
  - owner mode: usa `objective.team_id`
  - contribution mode: usa `contributor_team_id`
- Validar a URL atual sem `contributor_team_id`: para o objetivo `1470f9f5-fed4-42db-b5fa-406ade6cef6d`, o time owner é `0060f4ab-ba26-4fe5-8fa6-afca04d35ca9` e o único contribuidor cadastrado é `d3247da9-3e07-4fa8-9d0a-2527fdf6548f`.
- Com isso, se o usuário estiver na BU errada ou sem acesso ao objetivo naquela BU, verá estado claro; se estiver no time sem permissão, verá o gate de permissão; se estiver no modo contribuidor correto, o wizard carregará normalmente.

5. Validar regressões do fluxo
- Verificar manualmente estes cenários:
  - abrir wizard do owner na BU correta
  - abrir wizard do owner na BU errada
  - abrir wizard com `contributor_team_id` autorizado
  - abrir wizard com `contributor_team_id` não autorizado
  - trocar de BU e reabrir o mesmo objetivo
- Confirmar que nenhum caso fica preso em loading infinito.

Detalhes técnicos
- Docs revisados antes do plano:
  - `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
  - `docs/canonical/DEVELOPMENT_STANDARDS.md`
  - `docs/canonical/IDENTITY_CONVENTION.md`
  - `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
  - `docs/canonical/DATA_MODEL_REGISTRY.md`
  - `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md`
- Causa raiz mais provável identificada:
  - a página trata `objective === null` como se ainda estivesse carregando;
  - a query key de detalhe do objetivo não inclui BU, então um resultado `null`/stale pode ser reaproveitado entre contextos de BU.
- Evidência do banco:
  - objetivo `1470f9f5-fed4-42db-b5fa-406ade6cef6d` existe;
  - `bu_id = a0000000-0000-0000-0000-000000000001`;
  - `team_id = 0060f4ab-ba26-4fe5-8fa6-afca04d35ca9`;
  - contribuidor cadastrado: `d3247da9-3e07-4fa8-9d0a-2527fdf6548f`.

Se você aprovar, eu implemento essa correção diretamente.