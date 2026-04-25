## Objetivo
Em `/teams/:id`, fazer o card "Líder do Time" (sidebar direita) ter a **mesma altura visual** dos 3 stats cards (Membros / Sub-times / Squads) que ficam na linha de cima da coluna esquerda, conforme print enviado.

## Diagnóstico
Estrutura atual em `src/modules/teams/pages/TeamDetailPage.tsx`:

- **Coluna esquerda — Quick Stats (linhas 169-195)**: 3 cards compactos `<CardContent className="p-4 text-center">` (sem CardHeader). Altura ~95px.
- **Sidebar direita — Líder do Time (linhas 361-388)**: Card com `CardHeader` (título "Líder do Time") + `CardContent` com avatar `h-12 w-12`. Altura ~180px.

A diferença gera o desalinhamento visual mostrado no print: o card do líder fica muito mais alto que os stats cards à esquerda, criando um "degrau" no topo do layout.

## Mudanças propostas — `src/modules/teams/pages/TeamDetailPage.tsx`

Substituir o bloco do "Leader Card" (linhas 361-388) por uma versão **compacta** que segue o mesmo padrão visual dos stats cards (`p-4`, sem `CardHeader`, label pequena no topo):

```tsx
{/* Leader Card - alinhado visualmente com os Quick Stats à esquerda */}
<Card>
  <CardContent className="p-4 text-center">
    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
      Líder do Time
    </p>
    {team.leader ? (
      <Link
        to={`/users/${team.leader.id}`}
        className="flex items-center justify-center gap-2 group"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={team.leader.photo_url || undefined} />
          <AvatarFallback className="bg-accent/10 text-accent text-sm">
            {getInitials(team.leader.display_name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm group-hover:text-accent transition-colors truncate">
          {team.leader.display_name}
        </span>
      </Link>
    ) : (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <UserCircle className="h-6 w-6" />
        <span className="text-sm">Sem líder definido</span>
      </div>
    )}
  </CardContent>
</Card>
```

### Detalhes da decisão visual
- **Sem `CardHeader`**: padronizado com os stats cards (`p-4` only).
- **Label no topo (`text-xs uppercase`)**: substitui o título do header, mantendo identificação clara do card.
- **Avatar `h-8 w-8`**: reduzido (era `h-12 w-12`) para casar com a densidade compacta dos stats.
- **Layout horizontal (avatar + nome)**: mais econômico verticalmente que o layout original (avatar + bloco de texto).
- **Empty state inline**: substitui o bloco vertical com ícone grande, mantendo a mesma altura quando não há líder.

## Não-mudanças
- ❌ NÃO alterar `Card` "Time Pai" (linhas 391-409) — fica abaixo na sidebar e tem propósito visual diferente (link de navegação).
- ❌ NÃO mexer nos stats cards (Membros/Sub-times/Squads) — eles já estão no padrão correto.
- ❌ NÃO adicionar `h-full` em grid stretching: o objetivo é igualar a altura por **densidade de conteúdo**, não por força CSS (que produziria espaços vazios estranhos).

## Files
- **Edit**: `src/modules/teams/pages/TeamDetailPage.tsx` (linhas 361-388)

## Validação pós-implementação
1. Acessar `/teams/d3247da9-3e07-4fa8-9d0a-2527fdf6548f` — confirmar que o topo da sidebar (Líder do Time) está visualmente alinhado com a base dos stats cards à esquerda.
2. Testar com líder definido E sem líder definido (ambos devem ter altura equivalente).
3. Testar nome longo de líder — verificar `truncate`.
