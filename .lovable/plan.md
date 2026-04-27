# Ajuste de grid — `/projects` (ProjectsTable)

Aplicar em `src/modules/projects/components/ProjectsTable.tsx` o mesmo padrão de auto-dimensionamento de colunas já consolidado em `MilestonesTable`: a coluna principal (Projeto) ocupa o espaço restante e as demais encolhem para o tamanho do conteúdo.

## Mudanças

**Arquivo:** `src/modules/projects/components/ProjectsTable.tsx`

1. **Header (`<TableHead>`):**
   - `Projeto`: `w-full min-w-[280px]` (elástica, ocupa o espaço livre)
   - `Status`, `Saúde`, `Responsável`, `Times`, `Marcos`, `Prazo`, `KRs`: `w-px whitespace-nowrap` (encolhem para o conteúdo)
   - `Progresso`: `w-[180px]` (largura fixa pequena, pois o `ProjectProgressBar` precisa de espaço mínimo determinístico para renderizar a barra de forma legível)
   - `KRs` mantém `text-right`; `Marcos` mantém `text-center`.

2. **Células (`<TableCell>`):**
   - Adicionar `whitespace-nowrap` às células de Status, Saúde, Responsável, Marcos, Prazo e KRs para impedir quebra forçada.
   - `Times` permanece sem `nowrap` (o `EntityNamesCell` já controla overflow via `maxVisible`).
   - Remover o wrapper `min-w-[100px] max-w-[160px]` da célula de Progresso (a coluna agora tem largura fixa).
   - `KRs`: trocar `flex-wrap` por `flex-nowrap` para manter a linha única coerente com `whitespace-nowrap` e ampliar `max-w` dos chips para `[140px]`.

3. Sem mudanças de comportamento, dados, RLS, query keys ou permissões.

## Canônicos respeitados

- `mem://standards/frontend-memoization-standard`: o componente já é puro/leve; sem necessidade de `React.memo` adicional aqui (segue o padrão atual da `TicketsTable`).
- Padrão visual idêntico ao recém-aplicado em `MilestonesTable` (consistência cross-módulo).
- Sem alterações em RLS, BU isolation, query keys ou permissões — apenas layout.
- Sem novas dependências; usa apenas utilitários Tailwind já presentes.

## Fora de escopo

- Documentação canônica (TCR/DATA_MODEL/PERMISSIONS): nenhuma mudança contratual; ajuste puramente de UI, não requer bump de `TCR_VERSION` nem atualização de memórias.
