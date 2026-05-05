## Objetivo

Elevar o Step 1 do MBR (`/rituals/mbr` → `panorama`) ao papel de **página de curadoria do rito**, espelhando o padrão da Weekly (`WeeklyExecutiveOpeningStep`). Hoje as sugestões de pauta dos Pré-MBR aparecem só no penúltimo step (Decisões); precisam vir para a abertura, junto da curadoria executiva, com controle de **incluir/excluir** e **reordenar** (drag-and-drop).

## Escopo

Alteração restrita ao MBR v1 (`MbrPage.tsx` + componentes em `src/modules/okrs/components/wizards/mbr/`). Sem mudanças em MBR v2, Pré-MBR, Weekly nem em RLS/DB.

## Mudanças

### 1. Tipo canônico — `MbrPanoramaCuration`

Em `src/modules/okrs/types/wizard.ts`, estender `MbrPanoramaCuration` com o campo:

```ts
agenda: Array<{
  id: string;                       // chave estável
  title: string;
  detail?: string;
  source: 'pre-mbr' | 'ai' | 'manual';
  teamId?: string;                  // quando vier de Pré-MBR
  category?: string;                // quando vier de IA
  included: boolean;                // entra na pauta
  order: number;                    // ordem definida pelo líder
}>
```

E atualizar `EMPTY_MBR_PANORAMA_CURATION` com `agenda: []`.

### 2. Hidratação automática da pauta

Em `MbrPage.tsx`, criar `useEffect` que, quando `panoramaCuration.agenda` estiver vazio, popula a partir de:

- `mbrPreAgendaSuggestions` (sugestões dos líderes nos Pré-MBR) → `source: 'pre-mbr'`
- `panoramaCuration.suggestedDecisions` (gerado pela IA) → `source: 'ai'`

Todas com `included: true` por padrão e `order` sequencial. Itens novos detectados em re-renders são apensados ao final preservando a ordem definida pelo líder (dedupe por `id`/título+teamId).

### 3. Novo bloco "Pauta do MBR" no `MbrPanoramaCurationCard`

Adicionar uma seção dentro do card (acima de "Decisões sugeridas") com:

- Lista vertical drag-and-drop usando `@dnd-kit/core` + `@dnd-kit/sortable` (já presentes no projeto — verificar; senão, reaproveitar padrão usado em outro wizard).
- Cada item exibe: handle de arrastar, título, badge de origem (`Pré-MBR · Time X` / `IA` / `Manual`), detail opcional, switch/checkbox **"Incluir na pauta"**, botão remover.
- Campo de texto + botão para adicionar item manual ao final.
- Contador no header: `Pauta do MBR (N incluídos · M total)`.

Persistência via `onCurationChange({ ...curation, agenda: next })`.

### 4. Remover duplicação no `MbrDecisionsStep`

O bloco "Sugestões de pauta" (linhas ~278–326) sai do step de Decisões — a curadoria já aconteceu no Step 1. O step de Decisões continua só com decisões consolidadas + botão de adicionar manual. (Carry-over de pré-MBR `needs_decision` permanece, é outra coisa.)

### 5. Snapshot/persistência

A pauta vive em `draft.data.panoramaCuration.agenda` — já é serializada pelo `useGenericWizardDraft`. Nenhum schema novo no DB.

### 6. Nomenclatura

Header do Step 1 atualizado para deixar o duplo papel explícito:

- title: "Panorama & Curadoria do MBR"
- description: "Saúde do mês e pauta consolidada da reunião"

`WIZARD_STEPS[panorama].label` ajustado em `mbr/constants.ts` para refletir.

## Detalhes técnicos

**Arquivos tocados (frontend apenas):**
- `src/modules/okrs/types/wizard.ts` — extensão do tipo + EMPTY default
- `src/modules/okrs/pages/MbrPage.tsx` — effect de hidratação da agenda + props ao card
- `src/modules/okrs/components/wizards/mbr/MbrPanoramaCurationCard.tsx` — novo bloco "Pauta do MBR" com DnD
- `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx` — propagar props de agenda
- `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx` — remover seção de sugestões de pauta
- `src/modules/okrs/components/wizards/mbr/constants.ts` — label do step

**Canônicos respeitados:**
- Sem `select("*")`, sem CHECK constraints, sem mudança de RLS — escopo 100% UI.
- `React.memo` mantido em `MbrPanoramaCurationCard` (`memo(MbrPanoramaCurationCardImpl)`).
- BU isolation preservada — toda a fonte de dados (`useMbrPreSubmissions`) já filtra por BU.
- AI Agents: nenhum agente novo. Reaproveita `useMbrOpeningCuration` (curador-orquestrador já existente para MBR).
- Wizards Master: pauta vive no draft, não no snapshot final, exceto pelo que for promovido a `decisions[]`.
- Identity: nada de mutation server-side; tudo cliente em rascunho.

**Não inclui:**
- Persistência da pauta separada da curation (continua no JSONB do draft).
- Mudança no MBR v2 ou no Pré-MBR.
- Edge function nova — a pauta é alimentada pela curadoria existente + sugestões já carregadas.