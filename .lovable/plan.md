
## Plano: Botão toggle global para exibir/ocultar KRs dos times

### Pré-checklist ✅
- **TCR v3.22.0** — confirmado padrão de wizards com `FullPageWizardShell`, componentes shared em `src/modules/okrs/components/wizards/shared/`
- **DEVELOPMENT_STANDARDS v1.28.0** — sem anti-patterns; componentes reutilizáveis no barrel `shared/index.ts`
- **UI_COMPONENTS_REGISTRY v1.8.0** — Button ghost/sm é o padrão para ações auxiliares; não existe componente toggle para esta finalidade
- **Codebase search** — nenhum componente `TeamKrsToggle` existente; confirmada inexistência de duplicação

### Arquivos com `linkedTeamKrs` (4 locais)

| # | Arquivo | Seção | Como renderiza team KRs |
|---|---------|-------|-------------------------|
| 1 | `qbr-pre-clevel/QbrCLevelQuarterBalanceStep.tsx` | "Como foram os OKRs da empresa" | `OrgKrCard` → `TeamKrRow` inline |
| 2 | `qbr-meeting/QbrMeetingOpeningStep.tsx` | `OrgOkrsSummary` card | Inline dentro de `Collapsible` por objetivo |
| 3 | `mbr/MbrPanoramaStep.tsx` | "OKRs da Empresa" | `OrgObjectiveCard` → team rows inline |
| 4 | `mbr/MbrOrgOkrsStep.tsx` | "OKRs Organizacionais" | `contributions` map → rows inline |

### Solução

**1. Criar componente `TeamKrsToggle`** — `src/modules/okrs/components/wizards/shared/TeamKrsToggle.tsx`

- Botão `ghost` `size="sm"` com ícones `Users`/`EyeOff`
- Label: "Ver times" / "Ocultar times"
- Props: `{ visible: boolean; onToggle: () => void; className?: string }`
- Exportar no barrel `shared/index.ts`

**2. Aplicar nos 4 arquivos**

Em cada step:
- Adicionar `const [showTeamKrs, setShowTeamKrs] = useState(true)` 
- Colocar `<TeamKrsToggle>` ao lado do título da seção de OKRs
- Envolver blocos de team KR rows com `{showTeamKrs && (...)}`

Detalhes por arquivo:

- **QbrCLevelQuarterBalanceStep**: toggle ao lado do `<h3>` na Section A (linha 391); prop `showTeamKrs` passada para `OrgKrCard`
- **QbrMeetingOpeningStep**: toggle no `CardTitle` do `OrgOkrsSummary` (linha 130); condicional no bloco `linkedTeamKrs` (linha 161)
- **MbrPanoramaStep**: toggle ao lado do `<h4>` "OKRs da Empresa" (linha 433); prop passada para `OrgObjectiveCard`
- **MbrOrgOkrsStep**: toggle ao lado do título (linha 110-111); condicional no bloco `contributions` (linha 199)

### O que não muda
- Dados sempre carregados (linkedTeamKrs continua sendo buscado)
- Layout dos cards de objetivo
- Scorecard por time (Section B do QBR) — inalterado
- Nenhum componente existente é duplicado
