## Objetivo

Remover a seção **"Configurações avançadas"** (collapsible) do diálogo de edição de KPI em `/kpis`.

## Contexto

Hoje, em `EditKpiDialog`, a seção é renderizada por `EditKpiAdvancedSection.tsx`. Ela contém **um único campo**: `recovery_protocol` ("Protocolo de Recuperação"). O estado `showAdvanced` é controlado por `useEditKpiForm`.

## Decisão de produto (a confirmar pelo usuário no momento da implementação)

O campo `recovery_protocol` continua existindo no schema/banco. A remoção da seção **só some com a UI** — não toca em schema, hook, mutation ou banco. O campo simplesmente deixa de ser editável pela tela. Caso o usuário queira removê-lo de vez do form, faremos numa pass futura (sem deletar coluna do banco para preservar dados históricos).

## Mudanças

### 1. `src/modules/kpis/components/EditKpiDialog.tsx`
- Remover o import de `EditKpiAdvancedSection` (linha 29).
- Remover o JSX `<EditKpiAdvancedSection ... />` (linhas 164–168).
- Remover `showAdvanced` e `setShowAdvanced` do destructuring de `useEditKpiForm` (linha 65).

### 2. `src/modules/kpis/components/edit-kpi/useEditKpiForm.ts`
- Remover o `useState` de `showAdvanced` (linha 14).
- Remover o bloco `if (kpi.target_source || kpi.recovery_protocol) { setShowAdvanced(true); }` (linhas 65–67).
- Remover `showAdvanced` e `setShowAdvanced` do retorno (linhas 100–101).

### 3. `src/modules/kpis/components/edit-kpi/EditKpiAdvancedSection.tsx`
- **Deletar o arquivo** (não é mais referenciado).

### 4. Sem mudanças
- `editKpiSchema.ts` mantém `recovery_protocol` como `.optional()` para retro-compat.
- `useKpiMutations`, RLS, banco: nada muda.

## Critério de aceite

- O dialog de edição de KPI não exibe mais o botão/collapsible "Configurações avançadas".
- KPIs com `recovery_protocol` já preenchido no banco continuam com o valor (apenas não-editável via UI).
- Build passa sem warnings de import quebrado.

## Arquivos afetados

- **edit:** `src/modules/kpis/components/EditKpiDialog.tsx`
- **edit:** `src/modules/kpis/components/edit-kpi/useEditKpiForm.ts`
- **delete:** `src/modules/kpis/components/edit-kpi/EditKpiAdvancedSection.tsx`
