

# Implementação: Auto-gestão de Ciclos + Disponibilidade Automática de Rituais

## Resumo

Três entregas: (1) migration SQL com coluna `config` e função RPC, (2) integração no cron-dispatcher, (3) toggle na CyclesTab.

## Dados verificados

- Tabela de módulos: `modules` (slug `okrs`, id `3bafb730-...`)
- `bu_module_configs`: **não possui** coluna `config` — precisa de migration
- Ciclos atuais: sem sobreposição (Q1 termina 31/03, Q2 começa 01/04) — safe to apply
- Cron-dispatcher: roda a cada 1 minuto — frequência suficiente

---

## Parte 1: Migration SQL

### a) Adicionar coluna `config` em `bu_module_configs`

```sql
ALTER TABLE bu_module_configs 
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';
```

### b) Criar função `auto_transition_cycle_statuses()`

Lógica em passagem única:

1. **Loop:** para cada ciclo `planning` com `start_date <= today` em BUs habilitadas (`JOIN modules m ON m.id = bmc.module_id WHERE m.slug = 'okrs' AND (bmc.config->>'auto_cycle_transition')::boolean = true`):
   - Fecha o `active` do mesmo tipo/BU (incrementa `v_closed` via `GET DIAGNOSTICS`)
   - Ativa o novo (`v_activated++`)
2. **Cleanup final:** fecha `active` com `end_date < today` sem sucessor (soma ao `v_closed`)
3. Retorna `jsonb_build_object('activated', v_activated, 'closed', v_closed)`

Atributos: `SECURITY DEFINER`, `SET search_path = public`.

---

## Parte 2: Integração no `cron-dispatcher`

**Arquivo:** `supabase/functions/cron-dispatcher/index.ts`

- Adicionar campos `cycles_activated` e `cycles_closed` ao `MaintenanceResult` (default `0`)
- Adicionar bloco RPC em `runMaintenance()` (após `mark_missed_ritual_occurrences`):

```typescript
try {
  const { data, error } = await supabase.rpc("auto_transition_cycle_statuses");
  if (!error && data) {
    result.cycles_activated = data.activated || 0;
    result.cycles_closed = data.closed || 0;
    console.log(`[cron-dispatcher] Cycle transitions: ${result.cycles_activated} activated, ${result.cycles_closed} closed`);
  }
} catch {
  console.log("[cron-dispatcher] auto_transition_cycle_statuses RPC not available");
}
```

- Atualizar o objeto de fallback na linha 326 para incluir os novos campos

---

## Parte 3: Toggle na CyclesTab

**Arquivo:** `src/modules/okrs/components/settings/CyclesTab.tsx`

Adicionar no topo da `CyclesTab` (antes do header "Gerenciar Ciclos"):

- **Card** com `Switch` "Transição automática de ciclos"
- Descrição: "Ciclos em planejamento serão ativados automaticamente na data de início. Ciclos ativos serão encerrados na data final."
- **Query** para ler `bu_module_configs.config->>'auto_cycle_transition'` da BU atual (join com `modules` por `slug = 'okrs'`)
- **Mutation** para atualizar `config = jsonb_set(coalesce(config, '{}'), '{auto_cycle_transition}', 'true/false')` via update
- Imports adicionais: `Switch` de `@/components/ui/switch`

---

## Rituais

Nenhuma mudança. `useActiveCycle()` já filtra `status = 'active'` — quando o cron ativa o ciclo, rituais ficam automaticamente disponíveis.

---

## Comportamento padrão

Toggle inicia **desligado** (opt-in). `config` default `'{}'` → `(config->>'auto_cycle_transition')::boolean = true` retorna `false`. Nenhuma BU é afetada sem ação explícita do admin.

