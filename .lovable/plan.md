## Objetivo

Restringir o rito **Weekly** (`/rituals/weekly`) para **líderes de área + admins** (mesmo padrão usado hoje pelos rituais C-Level / QBR), tanto no guard de rota quanto no card do hub `/rituals`.

Hoje:
- A rota `/rituals/weekly` é apenas `RitualRoute` (qualquer usuário com módulo `okrs` ativo entra).
- O card "Weekly" no hub aparece para qualquer `requiredRole: 'leader'` (líder de **time**, não de área).

## Critério de acesso (decidido)

Acesso liberado quando **qualquer uma** for verdadeira:
- `isWildcard` (platform admin ou BU admin) — via `usePermissions`
- usuário é `leader_user_id` de pelo menos uma `areas` ativa na BU corrente
  (mesma checagem já implementada em `src/components/auth/CLevelRitualRoute.tsx`)

## Mudanças

### 1. Extrair hook reutilizável `useIsAreaLeader`

Novo arquivo: `src/modules/okrs/hooks/useIsAreaLeader.ts`

- Replica a query do `CLevelRitualRoute` (busca `profiles.id` e checa `areas.leader_user_id` na BU ativa, `deleted_at IS NULL`).
- Usa `useOptionalBuClient` + `useAuth` + `queryKeys.identity.permissions(...).concat('area-leader-check')` (mesma key já usada para reaproveitar cache).
- Retorna `{ isAreaLeader, isLoading }`.
- Refatorar `CLevelRitualRoute.tsx` para consumir o novo hook (remove duplicação).

### 2. Novo guard `WeeklyRitualRoute`

Novo arquivo: `src/components/auth/WeeklyRitualRoute.tsx`

- Estrutura igual ao `CLevelRitualRoute`: libera quando `isWildcard || isAreaLeader`; caso contrário `<Navigate to="/" replace />`.
- Usa `useIsAreaLeader` (sem reimplementar query).

> Alternativa avaliada: reutilizar diretamente `CLevelRitualRoute`. Foi descartada para não acoplar semântica — Weekly não é C-Level, e regras podem divergir no futuro. O hook compartilhado já evita duplicação real.

### 3. Aplicar guard na rota

`src/routes/rituals.routes.tsx`:

- Importar `WeeklyRitualRoute`.
- Estender `RitualRoute` para aceitar `requiresAreaLeader?: boolean` (espelhando `requiresCLevel`), envolvendo o `inner` com `WeeklyRitualRoute` quando ligado.
- Trocar a rota:
  ```
  <Route path="/rituals/weekly" element={<RitualRoute requiresAreaLeader><WeeklyPage /></RitualRoute>} />
  ```

### 4. Esconder card do Weekly no hub para não-líderes-de-área

`src/pages/Wizards.tsx`:

- Importar e chamar `useIsAreaLeader`.
- Adicionar `'area-leader'` ao set `userRoles` quando `isAreaLeader` for true (e sempre quando `isWildcard`).
- Trocar `requiredRole: 'leader'` → `requiredRole: 'area-leader'` **apenas** no item `id: 'weekly'`.
- Atualizar o type `WizardDefinition.requiredRole` para incluir `'area-leader'`.
- Garantir que a seção "OKRs – Líderes de Time" continua visível mesmo quando o único wizard restrito é o Weekly (o filtro existente `wizards.length > 0` já cuida disso; demais cards permanecem).

> Pré-Weekly continua aberto a líderes de time (não escopo desta task).

## Validação

1. Login como líder de time **não-líder de área**: card "Weekly" não aparece em `/rituals`; navegação direta para `/rituals/weekly` redireciona para `/`.
2. Login como líder de área (`areas.leader_user_id`): card visível; rota acessível.
3. Login como admin de BU (`isWildcard`): card visível; rota acessível.
4. Conferir que o rito Pré-Weekly e demais cards continuam visíveis para líderes de time.
5. Build limpo (sem TS errors no novo type `requiredRole`).

## Fora do escopo

- Mudanças em `usePermissions` ou criação de permission key dedicada (`rituals.weekly.run`). Pode ser feito numa onda futura se quisermos governar via templates v2; hoje o critério "líder de área" não está modelado como key.
- Alterações no Pré-Weekly, MBR-pre, ou qualquer outro rito.
- Mudanças em RLS — Weekly não tem tabela própria com escrita restrita a líder de área (curadoria roda no contexto da BU). Acesso é puramente UX/route guard.
