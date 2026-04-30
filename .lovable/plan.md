## Onda 4 — Frente independente: DIRECTIVE_TO_DECISION_MAP no QBR Meeting Step 3

### Contexto

O `QbrMeetingDecisionsStep` já recebe `cLevelDirectives` (do snapshot do `qbr-pre-clevel`), mas hoje não há UI consumindo. O líder precisa registrar manualmente decisões equivalentes, perdendo o vínculo com a diretiva original. O mapeamento canônico `DIRECTIVE_TO_DECISION_MAP` existe em `src/modules/okrs/types/wizard/vocabulary.ts` desde a Onda 2 Fase 4, mas nunca foi consumido.

### Objetivo

Adicionar uma seção "Diretivas do C-Level" no Step 3 que lista cada diretiva pendente e oferece um botão "Promover a decisão". O clique cria uma `TeamCheckinDecision` com:
- `text`: copiado da diretiva
- `category`: derivada via `DIRECTIVE_TO_DECISION_MAP[directive.category]`
- `sourceStep`: `'qbr-meeting-decisions'`
- `metadata`: `{ source: 'clevel_directive', directiveCategory: directive.category, targetTeamId? }` (auditoria)

Diretiva já promovida (detectada via metadata) fica marcada como "Promovida ✓" e o botão desabilita.

### Arquivos a editar

1. **`src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingDecisionsStep.tsx`**
   - Importar `DIRECTIVE_TO_DECISION_MAP` de `@/modules/okrs/types/wizard/vocabulary`.
   - Renderizar nova seção (acima de `CarryOverDecisionsSection`) só quando `cLevelDirectives.length > 0`.
   - Para cada diretiva: mostrar texto, badge da categoria original, badge da categoria-alvo mapeada e botão "Promover a decisão" (ou status "Promovida").
   - Detecção de já-promovida: `decisions.some(d => d.metadata?.source === 'clevel_directive' && d.metadata?.directiveText === directive.text)` (usar texto como chave estável já que diretivas não têm id).
   - Handler `handlePromote(directive)` chama `onDecisionsChange([...decisions, newDecision])`.

2. **`src/modules/okrs/components/wizards/qbr-meeting/__tests__/QbrMeetingSteps.test.tsx`** (se já cobre o step)
   - Adicionar caso: render com `cLevelDirectives` + click no botão → `onDecisionsChange` chamado com decisão com `category` mapeada e `metadata.source === 'clevel_directive'`.
   - Adicionar caso: diretiva já promovida → botão desabilitado.

### Padrão visual

- Seção com header `<WizardStepHeader>`-style leve (ícone `Crown` + "Diretivas do C-Level (N)").
- Cada diretiva em `<Card>` com border esquerda colorida pela categoria-alvo (reuso de `bg-status-*-muted`).
- Botão `<Button size="sm" variant="outline">` com ícone `ArrowRight`.

### Fora de escopo

- Mudar shape do snapshot C-Level (diretivas continuam sem id estável).
- Promover automaticamente — sempre exige ação do líder.
- Aplicar o mesmo padrão em outros ritos.

### Validação

- `bunx vitest run src/modules/okrs/components/wizards/qbr-meeting` verde.
- `bunx vitest run src/modules/okrs` mantendo baseline 1766/1766.
- Inspeção manual: abrir QBR Meeting Step 3 com C-Level com diretivas → seção aparece, promoção cria decisão na lista principal com badge correta.

### Risco

**Baixo.** Adição puramente aditiva: nenhum tipo, schema ou snapshot existente muda. Fallback natural: se `cLevelDirectives` vazio, seção não renderiza (comportamento idêntico ao atual).

### Memory

Atualizar `mem://standards/wizard-vocabulary-canonical` adicionando: "DIRECTIVE_TO_DECISION_MAP é consumido em `QbrMeetingDecisionsStep` para promover diretivas C-Level a `TeamCheckinDecision` com `metadata.source = 'clevel_directive'`".
