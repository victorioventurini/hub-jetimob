

## Plano: Fluxo inline Objetivo + KRs e Validação IA no QBR Pre

### Contexto atual

O step "Proposta de OKRs" (`QbrOkrProposalStep`) usa um fluxo multi-tela:
1. **List view** — lista objetivos cadastrados
2. **ObjectiveSubStep** — edita título/descrição + define quantidade de KRs
3. **KrDetailSubStep** — detalhamento das KRs (tela separada)

Isso gera navegação desnecessária (3 telas para cada objetivo). O `ProposalValidationCard` + `useProposalValidation` já existem e funcionam, mas só aparecem no sub-step de KRs.

### O que muda

**1. Unificar Objetivo + KRs em uma única tela inline**

Refatorar `QbrOkrProposalStep` para eliminar o conceito de `EditSubStep` (`'objective' | 'kr-detail'`). Cada objetivo será um card expansível que mostra:
- Título e descrição do objetivo (campos inline)
- Seletor de quantidade de KRs (1-3, reduzido de 5 para 3 conforme spec)
- Lista de KRs inline abaixo, cada uma num sub-card compacto com: título, direção, baseline, meta, unidade, responsável
- Botão "Validar com IA" no rodapé do card do objetivo

O limite máximo será **3 objetivos** com **até 3 KRs** cada (total 9 KRs max).

**2. Layout do card de objetivo expandido**

```text
┌─────────────────────────────────────────┐
│ Objetivo 1                    [Remover] │
│ ┌─ Título ────────────────────────────┐ │
│ └─────────────────────────────────────┘ │
│ ┌─ Descrição (opcional) ──────────────┐ │
│ └─────────────────────────────────────┘ │
│ Quantos KRs? [- 2 +]                   │
│                                         │
│  ┌─ KR 1 ────────────────────────────┐  │
│  │ Título    [___________________]   │  │
│  │ Dir [▲▼=]  Base [__] Meta [__]    │  │
│  │ Unidade [__]  Responsável [__]    │  │
│  └────────────────────────────────────┘  │
│  ┌─ KR 2 ────────────────────────────┐  │
│  │ ...                               │  │
│  └────────────────────────────────────┘  │
│                                         │
│  [🤖 Validar com IA]                    │
│  ┌─ ProposalValidationCard ──────────┐  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘

[+ Adicionar Objetivo]

        [← Voltar]              [Avançar →]
```

**3. Integração do agente IA (Validador Metodológico)**

O `useProposalValidation` e `ProposalValidationCard` já existem e serão reutilizados sem alteração. A diferença é que agora cada objetivo terá seu próprio estado de validação. Usaremos um `Map<string, ProposalValidationState>` indexado pelo `entry.id` para manter validações independentes por objetivo.

### Arquivo impactado

**`src/modules/okrs/components/wizards/qbr-pre/QbrOkrProposalStep.tsx`** — refatoração interna:

- Remover `EditSubStep`, `ObjectiveSubStep`, `KrDetailSubStep` como sub-telas separadas
- Criar `InlineObjectiveCard` — card completo com objetivo + KRs inline + validação IA
- Criar `InlineKrForm` — formulário compacto de KR (extraído do `KrDetailSubStep` atual)
- Manter `ObjectiveListView` como wrapper com scroll, mas cada card já mostra tudo inline
- Limite de KRs ajustado de 5 para 3; limite de objetivos mantido em 3
- Cada `InlineObjectiveCard` instancia `useProposalValidation` internamente
- Reutilizar `ProposalValidationCard` sem alteração

### Componentes reutilizados (sem duplicação)
- `ProposalValidationCard` — inalterado
- `useProposalValidation` — inalterado
- `WizardStepScaffold`, `WizardStepHeader`, `WizardStepFooter` — inalterados
- `BuUserSelect`, `UnitSelect` — inalterados

### Riscos e mitigações
- **Persistência**: A estrutura `ProposedObjectiveEntry` não muda — compatibilidade com drafts existentes mantida
- **Scroll**: Conteúdo mais longo numa única tela, mas `WizardStepScaffold` + `ScrollArea` já resolvem isso
- **Performance**: Máximo 3 objetivos × 3 KRs = 9 formulários — volume negligível

