# Plano: Alinhar card "Líder do Time" à sidebar de TeamDetailPage

## Contexto
Em `/teams/:id`, o card "Líder do Time" usa um layout centrado e minimalista (avatar 8x8, sem `CardHeader/CardTitle`, sem job/email), enquanto os demais cards da sidebar (ex.: "Time Pai") seguem o padrão `CardHeader` + `CardContent` left-aligned. Isso causa quebra visual e desconexão na coluna lateral.

## Pré-checklist canônico
- ✅ `DEVELOPMENT_STANDARDS.md` — padrão de Card + reuso de componentes (`TeamMemberRow` já existe e é memoizado).
- ✅ `IDENTITY_CONVENTION.md` — rota canônica do perfil é `/users/:id` (já em uso no `TeamMemberRow`).
- ✅ Memoization Standard (`mem://standards/frontend-memoization-standard`) — `TeamMemberRow` está com `React.memo`.
- ✅ BU isolation — não há nova query introduzida; reuso do `team.leader` já carregado por `useTeam`.

## Mudanças

### 1. Estender `useTeam` para hidratar job/email do líder
**Arquivo:** `src/modules/teams/hooks/useTeams.ts` (linha 121)

Adicionar `job_title, work_email` ao select do leader:
```ts
leader:profiles!teams_leader_user_id_fkey(id, display_name, photo_url, job_title, work_email)
```

Sem `select('*')` (continua explícito) e sem mudar BU isolation.

### 2. Refatorar card "Líder do Time" em `TeamDetailPage.tsx` (linhas 363-391)

Substituir pelo padrão canônico:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">Líder do Time</CardTitle>
  </CardHeader>
  <CardContent>
    {team.leader ? (
      <TeamMemberRow
        id={team.leader.id}
        display_name={team.leader.display_name}
        photo_url={team.leader.photo_url}
        job_title={team.leader.job_title ?? null}
        work_email={team.leader.work_email ?? null}
      />
    ) : (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
        <UserCircle className="h-5 w-5" />
        <span className="text-sm">Sem líder definido</span>
      </div>
    )}
  </CardContent>
</Card>
```

Ganhos:
- Mesma estrutura `CardHeader/CardTitle` do card "Time Pai" abaixo.
- Avatar maior (h-10), job title e atalho de e-mail (consistente com aba Membros).
- Empty state visualmente alinhado (bg-muted/50, padding p-3).

### 3. Limpeza de imports
- Remover `Avatar`, `AvatarFallback`, `AvatarImage` do import se não forem mais usados em outras partes do arquivo (verificar antes de remover — `getInitials` no avatar de header pode ainda usar).
- Manter `UserCircle` para o empty state.

## Arquivos afetados
- `src/modules/teams/hooks/useTeams.ts` (1 linha)
- `src/modules/teams/pages/TeamDetailPage.tsx` (bloco de ~30 linhas)

## Riscos
- Baixo. `TeamMemberRow` já existe, é memoizado, navega para `/users/:id` (canônico). `job_title`/`work_email` são nullable na tabela `profiles`, o componente já trata ambos como `string | null`.

## Validação
- Conferir visualmente em `/teams/d3247da9-...`: card do líder agora compartilha header com "Time Pai", spacing `space-y-6` mantido.
- Empty state ("Sem líder definido") segue mesmo visual de bloco interno.
