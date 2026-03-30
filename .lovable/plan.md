

## Problema

A sessão do Pré-QBR foi preenchida em 30/03 mas a ocorrência planejada era 18/03 — 12 dias de diferença. A janela de associação automática é fixa em **±7 dias**, insuficiente para ritos de menor frequência (quarterly, semester).

**Dados confirmados:**
- Ocorrência `45e28e21` → planned_date: `2026-03-18`, status: `missed`
- Sessões `806b7e79` e `a3ac50ee` → completed em `2026-03-30`, sem vínculo

---

## Solução: Janela dinâmica por frequência

Em vez de fixar ±7 dias para todos os ritos, a janela de associação será proporcional à frequência da cadência:

| Frequência | Janela |
|---|---|
| weekly | ±7 dias |
| biweekly | ±10 dias |
| monthly | ±15 dias |
| quarterly | ±30 dias |
| semester | ±45 dias |

---

## Plano de implementação

### 1. Atualizar lógica de auto-associação em `useWizardSession.ts`

No `onSuccess` da mutation `completeSession` (linhas 231-284):

- Após obter `session.wizard_type` e `session.bu_id`, buscar a `ritual_cadences.frequency` da cadência correspondente
- Calcular a janela dinamicamente com base na frequência
- Usar essa janela no filtro `gte/lte` do `planned_date` (substituindo o hardcoded ±7)
- Priorizar a ocorrência mais próxima da data atual (já faz isso via `order + limit 1`)

```text
Fluxo atual:
  session completa → busca occurrence ±7d → vincula

Fluxo novo:
  session completa → busca cadence.frequency → calcula janela → busca occurrence ±Nd → vincula
```

### 2. Corrigir dados existentes

- Vincular manualmente as sessões de Pré-QBR (`806b7e79`, `a3ac50ee`) à ocorrência de março (`45e28e21`) — via update direto
- Atualizar status da ocorrência de `missed` para `completed_late`

### 3. Arquivos modificados

- `src/modules/okrs/hooks/useWizardSession.ts` — janela dinâmica na auto-associação

---

## Detalhes técnicos

A lookup da frequência será feita com uma query adicional leve:

```typescript
const { data: cadence } = await supabase
  .from('ritual_cadences')
  .select('frequency')
  .eq('wizard_type', session.wizard_type)
  .eq('bu_id', session.bu_id)
  .eq('is_active', true)
  .maybeSingle();

const windowDays = {
  weekly: 7, biweekly: 10, monthly: 15,
  quarterly: 30, semester: 45
}[cadence?.frequency] ?? 7;
```

Isso mantém o comportamento atual para ritos semanais e amplia a janela proporcionalmente para ritos menos frequentes.

