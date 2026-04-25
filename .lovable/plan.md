Plano de ação

Pré-checklist executado:
- Consultei o TCR canônico, Development Standards, Data Model Registry, Identity Convention e Permissions/RBAC.
- Auditei as implementações existentes de OKRs compartilhados, contributors, RLS/policies e o modal `TeamKrFormDialog`.
- Validei no banco que o objetivo `1470f9f5-fed4-42db-b5fa-406ade6cef6d` e o time contribuidor `d3247da9-3e07-4fa8-9d0a-2527fdf6548f` estão na mesma BU Jetimob, e que o vínculo de contribuição existe. Portanto o problema não deve ser tratado como “cross-BU”.

O que vou mudar

1. Parar de abrir o wizard para KR de contribuição
- No card de OKR compartilhada/contribuída, trocar o botão “Adicionar KR” de link para `/okrs/objectives/:id/krs/create?contributor_team_id=...` por abertura direta do modal existente `TeamKrFormDialog`.
- O modal receberá:
  - `objectiveId` = objetivo compartilhado original
  - `teamId` = time contribuidor atual
  - `buId` = BU do objetivo/time, quando disponível
- Isso cria a KR como KR do time contribuidor dentro do objetivo compartilhado, sem passar pelo wizard full-page.

2. Ajustar dados mínimos do card contribuído
- Garantir que `ContributingOkrCard` tenha `bu_id` disponível no objeto do objetivo.
- Atualizar as queries/hidratações usadas por `TeamOkrSections` e `TeamSharedOkrsBlock` para carregar/propagar `bu_id` explicitamente, respeitando a regra de não usar `select('*')`.

3. Manter o wizard apenas para contextos próprios
- Não remover a rota nem o wizard agora, porque ainda pode ser usado em objetivos próprios.
- O desvio será específico para o fluxo de objetivo compartilhado/contribuidor, que é o fluxo que está travando.

4. Corrigir permissão/UX do modal no modo contribuição
- Revisar `TeamKrFormDialog` para garantir que ele permita criar quando o `teamId` recebido é o time contribuidor.
- Manter o gate existente por `useCanManageTeamOkr(teamId)`, porque o usuário deve poder gerenciar o time para o qual está criando a KR.
- Preservar as regras de RLS existentes: a inserção continuará passando por `okr_team_key_results_insert_v2` e `can_create_shared_team_kr_by_profile`, sem bypass.

5. Invalidar caches certos após criação
- Ao criar a KR pelo modal, invalidar também os caches de OKRs compartilhados/contribuídos:
  - contributors do objetivo
  - objectives with KRs
  - team contributed objectives/OKRs
  - summary de shared OKRs
- Assim a KR recém-criada aparece imediatamente na seção “Contribuição do seu time”.

6. Testes/validação
- Atualizar/adicionar teste simples do componente para confirmar que o botão de KR contribuidora abre o modal em vez de navegar para o wizard.
- Rodar os testes/checagem disponível do projeto após a alteração.

Resultado esperado

Na página de OKRs compartilhadas do time Comercial, ao clicar em “Adicionar KR” para apoiar o objetivo do BizOps, o sistema abre o modal padrão de criação de KR. Ao salvar, a KR será criada com `team_id = d3247da9-3e07-4fa8-9d0a-2527fdf6548f` e `team_objective_id = 1470f9f5-fed4-42db-b5fa-406ade6cef6d`, dentro da mesma BU Jetimob.