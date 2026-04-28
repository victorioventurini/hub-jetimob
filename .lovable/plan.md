## Objetivo

Renomear o rótulo do campo "Time Responsável (opcional)" para "Time Responsável" no modal de cadastro de KPIs (e nos pontos espelhados, para manter consistência).

## Alterações

1. **`src/modules/kpis/components/CreateKpiDialog.tsx`**
   - Linha 860 e 891: trocar `Time Responsável (opcional)` → `Time Responsável`.

2. **`src/modules/kpis/components/edit-kpi/EditKpiScopeSection.tsx`** (espelho no modal de edição — mantém paridade visual com o de cadastro)
   - Linhas 225 e 258: trocar `Time Responsável (opcional)` → `Time Responsável`.

3. **`src/modules/kpis/components/__tests__/EditKpiDialog.test.tsx`**
   - Linha 424: atualizar a asserção para `Time Responsável` (sem o `(opcional)`).

## Observações

- O campo continua opcional do ponto de vista funcional (nenhuma mudança em schema, validação ou comportamento). A mudança é puramente de label/UI conforme solicitado.
- Sem mudanças em banco, RLS ou hooks.
