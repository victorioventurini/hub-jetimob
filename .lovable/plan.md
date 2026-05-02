## Diagnóstico

URL: `/rituals/collaborator-checkin?step=reflection` → `reflection` é o penúltimo step. O **último step real** é `summary` (`CollaboratorSummary.tsx`), que mostra o resumo consolidado e tem um rodapé customizado com botões "Copiar resumo", "Ver OKRs" e "Fechar".

Problemas atuais no `CollaboratorSummary`:
1. **Não usa o footer padronizado** (`WizardStepFooter`/`WizardLastStepFooter`) que já é o SSOT em `shared/WizardStepFooter.tsx`.
2. **Não tem botão "Voltar"** — usuário não consegue voltar para `reflection` para corrigir o que escreveu.
3. **Botão "Fechar" não deixa claro que é a conclusão** do ritual (texto neutro, ícone X).
4. **Não há pop-up de confirmação** antes de finalizar — clicar em "Fechar" dispara `handleComplete` (que limpa o draft, marca como concluído, dispara o e-mail de resumo e navega), sem chance de desistir.

A confirmação já existe pronta no `WizardLastStepFooter`: AlertDialog "Concluir ritual" com texto "Ao confirmar, os dados serão salvos e o ritual será marcado como concluído. Tem certeza de que deseja prosseguir?".

## Mudanças

### 1. `CollaboratorSummary.tsx` — adotar footer padronizado

- Adicionar prop `onBack: () => void` na interface `CollaboratorSummaryProps`.
- Substituir o bloco `{/* Footer */}` (linhas ~328-346) por `<WizardLastStepFooter>`:
  - `showBack`, `onBack={onBack}` → volta para o step `reflection`.
  - `leftContent` opcional só se quisermos manter "Copiar resumo" e "Ver OKRs" no rodapé; **proposta**: mover esses dois botões para dentro do conteúdo (acima do `</ScrollArea>`, em uma barra de ações secundárias), mantendo o rodapé limpo com apenas Voltar/Concluir — alinhado ao padrão dos outros wizards.
  - `primaryLabel` herda "Concluir" + ícone `CheckCircle2` verde (success) do preset.
  - `onPrimary={onClose}` (continua disparando `handleComplete` no pai).
  - `primaryLoading={isSubmitting}` (nova prop opcional, ver item 3).
- Remover imports não usados (`Button`, `X`) se a refatoração eliminá-los.

### 2. `CollaboratorCheckinPage.tsx` — passar `onBack` e estado de submitting

No `case 'summary'` (linha ~525):
- Passar `onBack={goBack}` (volta para `reflection`).
- Opcional: passar `isSubmitting` se transformarmos `handleComplete` em assíncrono observável.

### 3. (Opcional) Loading durante conclusão

`handleComplete` já é `async` mas não há indicador visual. Adicionar um `useState<boolean>` `isCompleting` na página, setar `true` antes do `clearDraft()` e propagar como `isSubmitting` para o `CollaboratorSummary` → `WizardLastStepFooter` mostra spinner no botão "Concluindo...".

### 4. Confirmação pop-up

Já vem de graça com `WizardLastStepFooter` (AlertDialog interno). Sem código novo necessário.

## Verificação

1. Navegar até `/rituals/collaborator-checkin?step=summary`:
   - Rodapé mostra **Voltar** (ghost) à esquerda e **Concluir** (verde, com check) à direita.
   - Clicar em **Voltar** → retorna para `step=reflection` preservando dados.
   - Clicar em **Concluir** → abre AlertDialog "Concluir ritual".
   - Confirmar no dialog → executa `handleComplete` (toast "Check-in concluído!", e-mail disparado, navega para `/wizards`).
   - Cancelar no dialog → fecha o pop-up sem mudanças.
2. Botões "Copiar resumo" e "Ver OKRs" continuam acessíveis (movidos para barra de ações no conteúdo).
3. Outros steps do wizard não são afetados.

## Arquivos alterados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx` (refatora rodapé, adiciona `onBack`)
- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (passa `onBack={goBack}` e opcionalmente `isSubmitting`)

## Não-objetivos

- Não mudar a ordem dos steps nem remover `summary`.
- Não mudar a lógica de `handleComplete` (clear draft, e-mail, navegação).
- Não tocar em nenhum outro wizard — esta é uma correção pontual do collaborator check-in que alinha ao padrão SSOT já existente.
