# Lista de menções cortada no ticket

## Problema
Ao digitar @ na caixa de resposta do ticket, a lista de pessoas abre para baixo do campo. Como a caixa fica no fim da página, a lista é cortada pelo quadro da conversa e os nomes ficam escondidos.

## Correção
- A lista passa a abrir para cima quando não houver espaço abaixo do campo (caso da resposta do ticket), e para baixo nos demais lugares (ex.: criação de ticket).
- A lista é desenhada por cima da página inteira, para nunca mais ser cortada pelo quadro.
- Navegação por setas, Enter e clique continuam iguais.

## Detalhes técnicos
- `src/components/mentions/MentionInput.tsx` (linha ~491): o dropdown `absolute ... mt-1` é recortado pelo `overflow` do card. Renderizar via portal (`createPortal` em `document.body`) com posição `fixed` calculada pelo `getBoundingClientRect()` do textarea, recalculada em scroll/resize.
- Flip automático: se espaço abaixo < altura da lista (max-h-64), posicionar acima (`bottom` = viewport - rect.top + 4).
- Fechar ao clicar fora considerando o portal (`currentTarget.contains`).
- Vale para todos os usos do MentionInput (tickets, projetos, OKRs).
