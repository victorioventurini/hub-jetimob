## Plano — Aba Membros listar subtimes + membros dos subtimes

### Contexto técnico (auditado)

- **Página alvo:** `src/modules/teams/pages/TeamDetailPage.tsx`, aba `members` (linhas 207–261).
- **Hoje:** a aba lista somente `team.members`, vindos de `useTeam(id)`, que faz `profiles.team_id = teamId` (membros diretos apenas).
- **Hierarquia:** a relação parent → child já é `teams.parent_team_id`. O hook canônico `useBuUsersDirectory` (`mem://standards/users/team-filter-includes-subteams`) já implementa expansão recursiva via `parent_team_id` quando recebe `teamId` + `includeSubteams=true` (default).
- **Subtimes do time atual:** já vêm em `team.child_teams` (id, name, status) através do mesmo `useTeam(id)`.
- **Sem novas tabelas, sem migrations, sem mudança de RLS.** Uso somente leituras já permitidas.

### Padrões aplicados (pré-checklist)

- BU isolation: continua via `useBuScopedSupabase` / `useBuUsersDirectory` (já BU-scoped).
- Soft-delete: `useBuUsersDirectory` já filtra `deleted_at` e `employment_status='terminated'`.
- Query keys: novas leituras reutilizam `useBuUsersDirectory` (cache canônico) — sem chaves novas.
- Sem `select('*')`; sem hardcode de roles; navegação interna via `<Link>`.
- Memoização (`React.memo`) para o novo componente de grupo (lista densa).

### Mudança proposta

Reescrever apenas o `<TabsContent value="members">` da `TeamDetailPage.tsx`. Resto da página permanece intacto.

Nova estrutura visual da aba "Membros":

1. **Bloco "Membros diretos do time"** (mantém o que já existe hoje — `team.members`).
   - Mantém contador `({team.member_count})` no título do card.
   - Estado vazio inalterado.

2. **Para cada subtime** em `team.child_teams` (ordenado por `name`):
   - Cabeçalho colapsável (Collapsible, default expandido) com:
     - Ícone `Building2`, nome do subtime (link para `/teams/{subtime.id}`), badge "Inativo" se `status==='inactive'`, e contador `(N)`.
   - Lista dos membros do subtime usando o **mesmo layout de linha** de membro já usado hoje (avatar + nome + cargo + ícone Mail). Reaproveitar um pequeno componente `<TeamMemberRow />` extraído da renderização atual para evitar duplicação.
   - Os membros do subtime vêm de `useBuUsersDirectory({ teamId: subtime.id, includeSubteams: false, pageSize: 200 })`. `includeSubteams: false` aqui é proposital: cada subtime mostra apenas seus diretos; netos aparecem ao expandir o subtime na própria página dele. Isso evita duplicação de pessoas em múltiplos grupos e mantém a hierarquia legível.
   - Estado vazio do bloco: "Este sub-time não possui membros".

3. **Resumo no topo da aba:** linha de texto discreta "X membros diretos · Y sub-times" (sem novo card; respeita as Quick Stats já existentes acima).

### Notas de implementação

- Criar um componente `SubteamMembersBlock` (memoizado) em `src/modules/teams/components/SubteamMembersBlock.tsx` que recebe `subteam: { id, name, status }` e usa `useBuUsersDirectory` com `enabled` correto.
  - Isso isola a query por subtime (1 query por subtime expandido), mantém cache reaproveitável (mesma chave canônica do directory) e evita uma única query gigante.
- Extrair `TeamMemberRow` (memoizado) em `src/modules/teams/components/TeamMemberRow.tsx` reutilizando o markup atual (`Avatar`, `Mail`, `Link to /users/:id`). Substituir o uso atual em "Membros do Time" por esse componente.
- Adicionar `Collapsible` (já em `@/components/ui/collapsible`) para os blocos de subtime.
- Skeletons leves (3 linhas) enquanto cada `useBuUsersDirectory` carrega.
- Sem alteração em `useTeam`, em rotas, em hooks de teams ou em tabelas. Sem nova query key.

### Arquivos tocados

- `src/modules/teams/pages/TeamDetailPage.tsx` — substituir o conteúdo da `TabsContent value="members"`.
- `src/modules/teams/components/TeamMemberRow.tsx` — **novo** (extração + `React.memo`).
- `src/modules/teams/components/SubteamMembersBlock.tsx` — **novo** (consome `useBuUsersDirectory`, `React.memo`).

### Fora do escopo

- Aba "Sub-times" continua igual.
- Sem mudanças em RLS, em migrations, em hooks compartilhados.
- Não toco em nenhum outro pedido pendente desta thread.

### Validação manual (após implementação)

1. Abrir `/teams/d3247da9-3e07-4fa8-9d0a-2527fdf6548f` na BU Jetimob → aba Membros mostra: bloco "Membros diretos" + um bloco por subtime listado em "Sub-times", cada um com seus membros e contador correto.
2. Subtime sem membros → mostra estado vazio dentro do bloco.
3. Time sem subtimes → comportamento idêntico ao atual (só o bloco de membros diretos).
4. Cliques em nome de subtime navegam para `/teams/{id}`; cliques em membros navegam para `/users/{id}`.
5. Trocar para BU sem acesso ao time → continua redirecionando/erro como hoje (BU isolation preservada).