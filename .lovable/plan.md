## Pré-checklist (validado nos docs canônicos)

- **TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`)** — `mbr-pre` é wizard v3 (Onda 2); Step 1 já usa `RitualGreeting` + `ReferenceMonthPicker` compartilhados.
- **RBAC (`PERMISSIONS_AND_RBAC_MODEL.md`)** — Super Admin e Admin BU recebem `['*']` (wildcard). `usePermissions().isWildcard` é a forma canônica de gatear "admin BU OU super_admin" sem hardcode de roles.
- **IDENTITY_CONVENTION** — Para a mudança em si não precisamos de `realProfileId` (sem mutações). Permissões já respeitam impersonação via `get_user_permissions_for_impersonation`.
- **DEVELOPMENT_STANDARDS / Memory Core** — Reuso obrigatório; nada de `select('*')`; sem CHECK constraints (não há mudança de DB); sem manualChunks.

Sem novos componentes; estendo SSOT existentes.

---

## Mudanças

### 1) Gating do bloco "Analisando o mês de…" (admin BU + super_admin)

**Arquivo:** `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx`

- Importar `usePermissions` (`@/hooks/usePermissions`) e ler `isWildcard`.
- Renderização condicional do bloco do `ReferenceMonthPicker`:
  - **isWildcard** (admin BU / super_admin): mantém o picker editável + texto "Default: mês fechado anterior. Trocar regenera os dados."
  - **Demais usuários** (líder de área, líder de time, líder de subtime, colaborador): substitui por linha somente leitura — "Analisando o mês de **{Mês Ano}**" usando `formatMonthLabel(referenceMonth)` (helper que já existe em `utils/mbr/referenceMonth.ts`). Sem texto auxiliar de "trocar regenera".
- `MbrPrePage.tsx` continua passando `onReferenceMonthChange` igual — o gating é puro UI no Step (mantém o componente reaproveitável). O draft persiste o que o admin escolheu; demais usuários veem o valor persistido como readonly.

### 2) Saudação personalizada (líder + time + mês)

**Estratégia:** estender `RitualGreeting` para suportar uma frase **parametrizada** (template) sem quebrar consumidores atuais. SSOT continua em `RITUAL_GREETING_PHRASES`.

**Arquivos:**

**a. `src/modules/okrs/constants/ritualLabels.ts`**
- Trocar a entrada `'mbr-pre'` para frase com placeholders:
  `phrase: 'Como foi a performance do time {teamName} em {monthShort}?'` (cadence: `monthly`).
- Atualizar comentário do bloco documentando que `{teamName}` e `{monthShort}` são interpolados quando o consumidor passar `phraseVars`.

**b. `src/modules/okrs/components/wizards/shared/RitualGreeting.tsx`**
- Adicionar 2 props opcionais:
  - `displayName?: string | null` — quando passado, sobrepõe `userName` para a saudação. Continua aplicando `firstName()`.
  - `phraseVars?: Record<string, string | null | undefined>` — substitui `{key}` na `phrase`; chaves não fornecidas viram string vazia + colapso de espaços duplos.
- Compatibilidade total: sem props novas, comportamento atual permanece (Collaborator, Leader-Prep, Team-Checkin, Pre-Weekly, Weekly, MBR, QBR-Pre/Meeting/Post inalterados).

**c. `src/modules/okrs/utils/mbr/referenceMonth.ts`**
- Exportar novo helper `formatMonthShort(yyyymm: string): string` retornando o nome do mês PT-BR (ex.: `"Abril"`). Centraliza a tradução já usada em `useRitualGreetingContext` (`MONTH_NAMES_PT`) — passa a ser SSOT.

**d. `src/modules/teams/hooks/useTeams.ts`** (`FlatTeamItem` + `useHierarchicalTeamList`)
- Estender `FlatTeamItem` adicionando 2 campos opcionais:
  - `leaderUserId?: string | null`
  - `leaderName?: string | null`
- No `flattenTree`, propagar `node.leader?.id` e `node.leader?.display_name` (dados já existem em `TeamTreeNode`/`TeamWithRelations`; só não estão sendo expostos no flat). Nenhuma query adicional.
- Beneficia outros consumidores (`TeamSelect`, `MultiTeamSelect`, `Wizards`, `OkrCreationPage`, `OkrQualityPage`, `OkrConstructionReviewPage`, `QbrPrePage`, `MbrPrePage`) sem custo extra.

**e. `src/modules/okrs/pages/MbrPrePage.tsx`**
- Passar para `MbrPreOpeningStep`: `leaderName={selectedTeam?.leaderName ?? null}`.

**f. `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx`**
- Receber prop `leaderName?: string | null`.
- Trocar a chamada do `RitualGreeting` para:
  ```tsx
  <RitualGreeting
    ritualSlug="mbr-pre"
    userName={teamName ?? null}
    displayName={leaderName ?? teamName ?? null}
    phraseVars={{
      teamName: teamName ?? '',
      monthShort: formatMonthShort(referenceMonth),
    }}
    cycleName={greeting.cycleName}
    monthLabel={greeting.monthLabel}
    monthInQuarter={greeting.monthInQuarter}
  />
  ```
- Fallback: sem `leaderName` usa `teamName`; sem ambos cai no padrão `"Você"` do componente.

### 3) Resultado final

> **Bom dia, Guilherme.** *Como foi a performance do time Comercial em Abril?*
>
> [Abril 2026] [Q2 2026] [Mês 1 do quarter]
>
> *(Bloco "Analisando o mês de …" só aparece para admin BU / super_admin.)*

---

## Detalhes técnicos

- **RBAC:** `usePermissions().isWildcard` é o gate canônico (TCR §RBAC e `PERMISSIONS_AND_RBAC_MODEL.md` §"Wildcard granting", linhas 14-15). Cobre super_admin (role global) e admin BU (`role_in_bu='admin'`). Respeita impersonação automaticamente.
- **SSOT:** frase única em `RITUAL_GREETING_PHRASES`; ganha tokens reutilizáveis por qualquer rito futuro via `phraseVars`.
- **Reuso:** zero componentes novos. Estensão de `RitualGreeting` (2 props opcionais), `useHierarchicalTeamList`/`FlatTeamItem` (2 campos opcionais já existentes em `useTeams`), e novo helper `formatMonthShort` no SSOT do referenceMonth.
- **Compatibilidade:** todas as props novas são opcionais; consumidores atuais não mudam.
- **Sem DB:** nenhuma migração, nenhuma RLS, nenhum edge function.
- **Sem mutação:** sem necessidade de `useIdentity().realProfileId`.
- **Acessibilidade:** linha readonly do mês usa `<p className="text-sm font-medium text-foreground">` (mesma tipografia do label atual), sem shift visual.

---

## Arquivos a alterar

1. `src/modules/okrs/constants/ritualLabels.ts` — frase `'mbr-pre'` parametrizada.
2. `src/modules/okrs/components/wizards/shared/RitualGreeting.tsx` — props `displayName?` + `phraseVars?`.
3. `src/modules/okrs/utils/mbr/referenceMonth.ts` — exportar `formatMonthShort`.
4. `src/modules/teams/hooks/useTeams.ts` — `FlatTeamItem` ganha `leaderUserId?` + `leaderName?`; `flattenTree` propaga.
5. `src/modules/okrs/pages/MbrPrePage.tsx` — passa `leaderName` para o Step.
6. `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx` — gating do bloco do mês via `usePermissions().isWildcard` + nova chamada de `RitualGreeting`.

Sem migrações de banco. Sem alterações em RLS. Sem novos componentes.
