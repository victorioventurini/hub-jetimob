

## Redesign da Lista de Projetos — Layout Horizontal

### Situação Atual
A listagem usa um **grid 3 colunas** de cards compactos (99 linhas). Cada card empilha: nome, barra de progresso, footer com owner + data, e KR pills.

### Design Alvo (referência)
Cada projeto é uma **linha horizontal full-width** com duas fileiras internas:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ● Nome do Projeto        Em andamento       OKR · Retenção  ↗ ClickUp │
│  👤 Lucas Costa  │  Produto │ Eng  │  📅 Até 30 abr  ━━━━ 65%  4 milestones │
└──────────────────────────────────────────────────────────────────────┘
```

### Plano de Implementação

#### 1. Helper `getExternalUrlLabel` (novo utilitário)
Arquivo: `src/modules/projects/utils/externalUrlLabel.ts`

Extrai nome amigável da URL do projeto externo:
- `clickup.com` → "ClickUp"
- `notion.so` → "Notion"  
- `jira` (no hostname) → "Jira"
- `linear.app` → "Linear"
- `asana.com` → "Asana"
- `trello.com` → "Trello"
- `monday.com` → "Monday"
- Fallback → "Link externo"

Reutilizável em `ProjectCard`, `ProjectDetailPage` e `ProjectsSummary`.

#### 2. Refatorar `ProjectCard.tsx` (arquivo existente — reescrever)
Manter a mesma interface `ProjectCardProps` e nome de componente.

**Linha 1 (header):**
- Dot de health colorido (sem badge completo, apenas o dot como na referência)
- Nome do projeto (font-semibold)
- `ProjectStatusBadge` (badge existente reutilizado)
- KR pills alinhados à direita (reutilizar estilo existente, prefixar "OKR · ")
- External link com label extraído pelo helper + ícone `ExternalLink`

**Linha 2 (meta):**
- Avatar + nome do owner (componentes Avatar existentes)
- Separador `|`
- Team badges (novo: iterar `project.teams`, badge outline por time)
- Separador `|`
- `📅 Até {data}` com indicação de atraso se `due_date < today`
- `ProjectProgressBar` (componente existente, estender para aceitar `pct` inline como texto)
- Label `{total} milestones`

**Layout:** Card com `p-5`, sem grid — usa flexbox com `flex-wrap` para responsividade mobile.

#### 3. Atualizar `ProjectsPage.tsx` — layout da listagem
- Trocar `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` por `flex flex-col gap-3` (stack vertical)
- Skeleton loading: trocar grid por 4 skeletons full-width `h-24`

#### 4. Estender `ProjectProgressBar` (opcional)
Adicionar prop `showPct?: boolean` para exibir porcentagem ao lado da barra, mantendo retrocompatibilidade.

#### 5. Atualizar testes `ProjectCard.test.tsx`
Ajustar seletores para a nova estrutura DOM. Manter todos os cenários de teste existentes (nome, owner, health, status, KRs, external link, onClick).

### Componentes reutilizados (sem duplicação)
| Componente | Uso |
|---|---|
| `ProjectHealthBadge` | Adaptar para modo "dot only" via prop |
| `ProjectStatusBadge` | Sem alteração |
| `ProjectProgressBar` | Estender com `showPct` |
| `Avatar/AvatarFallback` | Sem alteração |
| `Card/CardContent` | Sem alteração |

### Arquivos impactados
| Arquivo | Ação |
|---|---|
| `src/modules/projects/utils/externalUrlLabel.ts` | Novo |
| `src/modules/projects/components/ProjectCard.tsx` | Reescrever layout |
| `src/modules/projects/components/ProjectProgressBar.tsx` | Estender (prop `showPct`) |
| `src/modules/projects/components/ProjectHealthBadge.tsx` | Adicionar prop `dotOnly` |
| `src/modules/projects/pages/ProjectsPage.tsx` | Layout + skeleton |
| `src/modules/projects/components/__tests__/ProjectCard.test.tsx` | Atualizar seletores |

