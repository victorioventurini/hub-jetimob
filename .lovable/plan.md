
## Tooltip nos times escondidos ("+N") da listagem de Projetos

### Pré-checklist canônico
- `TECHNICAL_CONTEXT_REGISTRY.md` — módulo Projetos v1.4
- `mem://features/projects/holistic-module-architecture-v2`
- Padrão visual de referência já implementado em `src/modules/assets/components/recommendations/ScopeNamesCell.tsx` (usado em `/assets/inventory/recommendations`)
- Existe wrapper canônico genérico já no projeto: `src/components/ui/entity-names-cell.tsx` (`EntityNamesCell`) — segue exatamente o padrão `ScopeNamesCell` e aceita `userNames`, `teamNames`, `squadNames`

### Diagnóstico
- A tela `/projects` renderiza a coluna **Times** em `src/modules/projects/components/ProjectsTable.tsx` (linhas 120-142).
- Hoje mostra os 2 primeiros times como `Badge` e o restante como texto inerte `+N`, **sem tooltip**.
- A screenshot enviada (`Suporte`, `Onboarding`, `+3`) confirma que o usuário está vendo essa coluna e quer hover-to-reveal.
- A tela `/assets/inventory/recommendations` resolve isso via `ScopeNamesCell`, que envolve as badges em `Tooltip` (Radix) e lista todos os nomes agrupados no conteúdo do tooltip.
- O componente `EntityNamesCell` já existe em `src/components/ui/` exatamente para esse caso (suporta `teamNames`) — não precisamos criar nada novo nem duplicar lógica.

### Mudança proposta (única)

Em `src/modules/projects/components/ProjectsTable.tsx`:

- Substituir o bloco da `<TableCell>` da coluna **Times** (linhas 120-142) por uma única chamada a `<EntityNamesCell teamNames={...} maxVisible={2} variant="outline" emptyText="—" />`.
- Mapear `project.teams` para `string[]` de `team_name` antes de passar.
- Importar `EntityNamesCell` de `@/components/ui/entity-names-cell`.
- Resultado: ao deixar o mouse sobre o "+N" (ou sobre as badges), aparece um tooltip listando **todos** os times do projeto, idêntico ao padrão de `recommendations`.

### O que NÃO vai mudar
- `ProjectCard` (vista de cards) **não** está no escopo desta solicitação — a screenshot é da listagem em tabela. Se o usuário quiser tooltip também nos cards depois, aplicamos o mesmo `EntityNamesCell` lá.
- Nenhum novo componente será criado. Nenhuma duplicação de lógica de tooltip.
- Sem alterações em hooks, queries, RLS, query keys ou tipos.

### Arquivos afetados
- `src/modules/projects/components/ProjectsTable.tsx` — refator localizado da coluna Times (≈20 linhas substituídas por ≈6).

### Validação esperada
- `/projects` (vista de tabela) → projeto com >2 times mostra 2 badges + chip `+N`; hover sobre qualquer badge ou sobre o `+N` exibe tooltip agrupado "Times:" com todos os nomes.
- Comportamento idêntico ao de `/assets/inventory/recommendations`.
- Projetos sem times continuam mostrando `—`.
