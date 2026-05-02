## Objetivo

Padronizar o rodapé canônico dos wizards de ritual (`WizardStepFooter`) conforme o mockup: `Voltar` (ghost) · `Pular` (outlined, opcional) · `Continuar` (primário, ocupando a largura restante). Diferenciar copy do primeiro e do último step.

## Escopo da mudança

Único arquivo alterado: `src/modules/okrs/components/wizards/shared/WizardStepFooter.tsx`. Como TODOS os ritos (Collaborator, Weekly, Pre-Weekly, MBR, MBR-Pre, QBR Meeting, Leader-Prep, Team-OKR-Creation) já consomem este componente e seus presets, a mudança propaga automaticamente — zero edição nos steps.

## Comportamento

### Rodapé canônico (steps intermediários — `WizardStepFooter` / `WizardOptionalStepFooter`)
- **Voltar** — ghost à esquerda, ícone `←`, largura natural (atual).
- **Pular** — outlined (variant `outline`, não mais `ghost`), ícone `SkipForward`, largura natural. Mantém regra atual de visibilidade (`showSkip` controlado por step — não passa a aparecer onde hoje não aparece).
- **Continuar** — primário à direita, ocupa a **largura restante** (`flex-1` no desktop), copy `Continuar →`.

### Primeiro step (`WizardFirstStepFooter`)
- Sem botão Voltar (mantido).
- Primário com copy padrão **`Começar →`** (parâmetro `primaryLabel` continua opcional para sobrescrever em casos especiais).
- Continua ocupando largura restante.

### Último step (`WizardLastStepFooter`)
- Primário com copy **`Finalizar e enviar`** + ícone `CheckCircle2`, variant `success`.
- Estado de loading: `Enviando…`.
- Mantém o `AlertDialog` de confirmação atual (texto do dialog inalterado).

### Layout responsivo
- **Desktop (sm+):** linha única com Voltar à esquerda, Pular ao centro (quando presente) e Continuar largo à direita. Continuar usa `flex-1` no container direito; Pular fica antes dele com `shrink-0`.
- **Mobile:** mantém `flex-col-reverse` empilhado, com Continuar full-width no topo, Pular abaixo e Voltar por último — preserva safe-area atual.

## Detalhes técnicos

Mudanças pontuais em `WizardStepFooter.tsx`:

1. **Novo default de `primaryLabel`** dentro de `WizardFirstStepFooter`:
   ```tsx
   export function WizardFirstStepFooter(props) {
     return <WizardStepFooter primaryLabel="Começar" {...props} showBack={false} />;
   }
   ```
   (spread depois do default para permitir override.)

2. **Atualizar `WizardLastStepFooter`:**
   - `primaryLabel` default: `"Finalizar e enviar"` (era `"Concluir"`).
   - Loading label: `"Enviando…"` (era `"Concluindo…"`).

3. **Trocar variante do botão Pular:** `variant="ghost"` → `variant="outline"`; remover `text-muted-foreground`.

4. **Continuar com largura restante (desktop):**
   - No container right (`<div className="flex items-center gap-2 ...">`), o botão primário ganha `sm:flex-1` quando NÃO há `rightContent` customizado.
   - O container right ganha `sm:flex-1` para ocupar o espaço restante após Voltar/Pular.
   - O container left mantém `shrink-0`.

5. **Não mexer em:** props públicas, `WizardOptionalStepFooter`, `AlertDialog`, comportamento de `leftContent`/`rightContent` customizados, testes existentes (vão ser ajustados se quebrarem por copy).

## Validação

- Rodar `WizardStepFooter.test.tsx`; ajustar assertions de texto se baterem em `"Concluir"` literal.
- Smoke visual em 3 ritos para confirmar layout: Collaborator Check-in (intermediário com Pular), Weekly Opening (primeiro step), Collaborator Summary (último step).
- Conferir mobile (`flex-col-reverse`) — Continuar deve ficar full-width no topo da pilha.

## Fora de escopo

- Copy dos labels de step do Collaborator (já ajustada na resposta anterior).
- Mudar `showSkip` em qualquer step (mantido o que já está hoje).
- Alterar o dialog de confirmação do último step.