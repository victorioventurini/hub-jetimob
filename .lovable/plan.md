# Mostrar Pré-Weekly e Weekly no Histórico de Rituais

## Problema
O filtro "Todos os rituais" em /rituals/history não oferece Pré-Weekly nem Weekly. Os registros existem: são 53 Pré-Weekly concluídos na BU Jetimob, o último em 29/09/2026. Eles já entram em "Todos os rituais", mas não dá para filtrar só por eles.

## O que muda
- Incluir "Pré-Weekly" e "Weekly" na lista do filtro de tipo de ritual.
- Conferir que o card e o resumo de um Pré-Weekly abrem corretamente no histórico.

## Detalhes técnicos
- `src/modules/okrs/pages/ritual-history/constants.ts`: adicionar `{ value: 'pre-weekly', label: 'Pré-Weekly' }` e `{ value: 'weekly', label: 'Weekly' }` em `WIZARD_TYPE_OPTIONS`.
- A consulta (`useRitualHistory`) já filtra por `wizard_type`, então não precisa mudar.
- Validar com Playwright: filtrar por Pré-Weekly e abrir um card.
