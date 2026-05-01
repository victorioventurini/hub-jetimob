# Ajuste de UI — Step "Iniciativas vinculadas" (Check-in Individual)

## Problema observado
No print enviado, o conteúdo do step `?step=initiatives` extrapola horizontalmente: os botões "Atualizar" e "Comentar" são empurrados para fora da área visível, gerando scroll lateral. Isso viola o `mem://ui/wizards/wizard-shell-mobile-standard` (steps devem caber na largura disponível, sem overflow horizontal).

## Causa raiz
1. **`InitiativesSummary.tsx` (linha 225)** — cada item renderiza `nome + badges + botões "Atualizar"/"Comentar"` numa única flex-row sem permitir quebra. Em telas estreitas (mobile e até no preview de 889px com sidebar), a soma das larguras estoura o container.
2. **`CollaboratorInitiativesStep.tsx` (linha 291)** — container raiz `flex flex-col h-full` sem `min-w-0` nem `overflow-x-hidden`; não impede overflow vindo dos filhos.
3. Linha 237 (header do item) também combina título truncável com badges `flex-shrink-0` na mesma row, podendo derrubar o `truncate`.

## O que será feito

### 1. `src/modules/okrs/components/wizards/shared/InitiativesSummary.tsx`
Reorganizar o item de iniciativa em **duas regiões responsivas**:

- **Coluna de conteúdo** (título, badges de status, descrição, progresso) — sempre ocupa a largura disponível, com `min-w-0` e `flex-wrap` no header de badges para permitir quebra natural.
- **Linha de ações** (botões "Atualizar" e "Comentar"):
  - Em **mobile (<640px)**: empilhada **abaixo** do conteúdo, alinhada à direita, com `flex-wrap`.
  - Em **desktop (≥640px)**: à direita do conteúdo, na mesma linha.
- Usar classes utilitárias Tailwind (`flex-col sm:flex-row`, `sm:items-start`, `sm:gap-2`, `w-full sm:w-auto justify-end`) — sem novos tokens de design.
- Garantir `min-w-0` e `break-words` no nome para evitar push horizontal de strings longas.
- Remover `truncate` do título (substituir por `break-words` + `line-clamp-2` opcional) — agora que cabe quebra de linha, truncar deixa de fazer sentido.

### 2. `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`
Blindar o container do step contra overflow proveniente de filhos:
- Linha 291: adicionar `min-w-0 overflow-x-hidden` ao wrapper raiz.
- Linha 312–313 (`ScrollArea` + `div p-6`): garantir `min-w-0` no container interno.
- Linha 340 (cada bloco por KR): adicionar `min-w-0` para isolar cada agrupamento.
- Sem mudanças funcionais, sem mudanças de query — apenas defesa em profundidade do layout.

### 3. Verificação manual
Após aplicar:
- Conferir step `/rituals/collaborator-checkin?step=initiatives` em viewports 375, 768 e 1280.
- Confirmar que **nenhuma rolagem horizontal** aparece.
- Confirmar que os botões "Atualizar"/"Comentar" continuam clicáveis e visíveis em todos os tamanhos.
- Confirmar que o restante dos steps (KPIs, Projetos, KRs) não foi afetado (o `InitiativesSummary` é compartilhado, mas a mudança é puramente CSS responsivo).

## Fora de escopo
- Lógica de negócios, queries Supabase, RLS, identity, BU isolation — **nada** será alterado.
- Outros steps do wizard (KPIs/Projetos/KRs/Reflexão).
- Wording, copy, ícones ou paleta de cores.

## Aderência a canônicos
- ✅ `mem://ui/wizards/wizard-shell-mobile-standard` — layout responsivo do step.
- ✅ Design tokens semânticos preservados (sem cores hardcoded).
- ✅ Sem `select('*')`, sem alteração de query keys, sem alteração de RLS.
- ✅ `React.memo` mantido onde já existe.
