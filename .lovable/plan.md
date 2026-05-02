# Padronizar empty states do Check-in Individual

## Problema

Os steps do wizard de Check-in Individual (`/rituals/collaborator-checkin`) usam **markup divergente** quando não há dados:

| Step | Empty state atual |
|------|-------------------|
| **Projects** | Markup inline com `<FolderKanban>` + `<p>` custom |
| **Initiatives** | Já usa `<EmptyState>` canônico ✅ |
| **Decisions (Pendências)** | Markup inline com `<Inbox>` + `<p>` + emoji 🎉 |
| **KPIs / KRs (Checkin)** | Sem empty state (steps são pulados quando vazios) |

Resultado: visual inconsistente entre passos do mesmo rito.

## Objetivo

Unificar todos os empty states do wizard para usar o componente canônico `<EmptyState>` (`src/components/ui/empty-state.tsx`), espelhando o padrão já adotado em `CollaboratorInitiativesStep`.

## Mudanças

### 1. `CollaboratorProjectsStep.tsx` (linhas 324-330)
Substituir o markup inline por:
```tsx
<div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
  <EmptyState
    icon={FolderKanban}
    title="Nenhum projeto vinculado"
    description="Você não possui projetos sob sua responsabilidade neste momento. Projetos são opcionais — você pode pular ou avançar."
  />
</div>
```

### 2. `CollaboratorDecisionsStep.tsx` (linhas 109-114)
Substituir o markup inline por:
```tsx
<div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
  <EmptyState
    icon={Inbox}
    title="Nenhuma pendência encontrada"
    description="Você está em dia com decisões e follow-ups atribuídos a você."
  />
</div>
```

### 3. Tom dos textos (alinhamento editorial)

Padrão consistente entre os três:
- **Title**: curto, sem emoji, formato "Nenhum(a) [entidade] [estado]"
- **Description**: explica por que está vazio + (quando aplicável) que o passo é opcional

| Step | Title | Description |
|------|-------|-------------|
| Projects | Nenhum projeto vinculado | Você não possui projetos sob sua responsabilidade neste momento. Projetos são opcionais — você pode pular ou avançar. |
| Initiatives (já existe) | Nenhuma iniciativa vinculada | Você não possui iniciativas vinculadas aos seus KRs. Iniciativas são opcionais — você pode pular ou avançar. |
| Decisions | Nenhuma pendência encontrada | Você está em dia com decisões e follow-ups atribuídos a você. |

## Fora de escopo

- **KPIs e KRs**: não têm empty state porque são pulados automaticamente pela máquina de estado quando não há dados (regra centralizada em `CollaboratorCheckinPage.tsx`). Não vamos introduzir tela vazia onde hoje há skip — isso mudaria fluxo, não só estética.
- **Reflection / Context / Summary**: não têm empty state aplicável (sempre exibem conteúdo).

## Arquivos afetados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep.tsx`

Sem mudanças de schema, hooks, queries ou lógica de navegação — apenas presentation.
