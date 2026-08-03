# Transferir liderança de times (e áreas) na remoção de usuário

## Situação atual

No modal "Transferir Responsabilidades" (removção de usuário), liderança de time e de área aparecem apenas como avisos informativos: "Times (liderança será removida)". Na execução, o time simplesmente fica sem líder (`leader_user_id = null`), sem opção de escolher substituto — foi o que ocorreu com guilherme@jetimob.com.

## O que muda

Liderança passa a ser transferível, na mesma UX das outras seções (um select por item + "Transferir todos para"):

- **Times (liderança)** — select por time. Ao escolher alguém, o time passa a ter esse líder; se deixar em branco, mantém o comportamento atual (liderança removida).
- **Áreas (liderança)** e **Áreas (co-liderança)** — mesma lógica, para não deixar uma inconsistência entre time e área.

Cada linha exibe explicitamente a opção "Remover liderança (deixar vago)", para a decisão ser consciente em vez de silenciosa.

Os avisos "liderança será removida" saem da lista de itens automáticos e passam a viver na nova seção de transferência. O botão de confirmação continua exigindo apenas as dependências obrigatórias (KPIs, OKRs, tickets, etc.) — liderança fica opcional, então nada trava a remoção.

## Detalhes técnicos

- `src/hooks/useProfiles.ts`: adicionar `teamLeaderships`, `areaLeaderships`, `areaCoLeaderships` em `TransferConfig.transfers` (`TransferItem[]`). No `mutationFn`, antes do bloco de auto-clear, aplicar os novos líderes por `id` (`teams.leader_user_id`, `areas.leader_user_id`, `areas.co_leader_user_id`) e só então rodar o `update ... = null` residual para o que não foi transferido (mantendo os `eq(..., profileId)` atuais, que já não afetam registros transferidos). Invalidar `queryKeys.teams.all(buId)` e `queryKeys.areas.all(buId)` no `onSuccess`.
- `src/components/users/UserDependenciesDialog.tsx`: estender `TransferState`/`MandatoryDependencyType` com os três novos tipos (opcionais na validação), reutilizar `renderDependencySection` com um flag `allowNone` que insere o item "Remover liderança", alimentado por `deps.optional.teams` / `areaLeaderships` / `areaCoLeaderships`. `handleBulkTransfer` também preenche esses grupos. Remover esses três grupos de `autoClear` e dos badges informativos.
- Sem migração de banco; nenhuma mudança de RLS (updates seguem pelo cliente BU-scoped já usado).
