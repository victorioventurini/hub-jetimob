## Contexto

O formulário canônico `KpiValueEntryForm` (`src/modules/kpis/components/shared/KpiValueEntryForm.tsx`) é o **SSOT** de "Registrar valor de KPI", consumido por:
- `AddKpiValueDialog` (modal de `/kpis`)
- `EditKpiValueDialog`
- `CollaboratorKpiStep` (rito Colaborador) — pedido atual

Hoje todos os campos ficam empilhados em coluna (`space-y-4`):
1. Valor (linha inteira) + `valueAdornmentSlot` logo abaixo
2. Data de Referência (linha inteira)
3. Tipo do input (radios)
4. Observações

A regra do projeto é **estender e compor o SSOT, não duplicar**. Vou mexer no próprio `KpiValueEntryForm` de forma responsiva, sem quebrar consumidores.

## Mudança proposta

### Arquivo único: `src/modules/kpis/components/shared/KpiValueEntryForm.tsx`

1. **Empacotar Valor + Data num grid responsivo de 2 colunas:**
   ```tsx
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <FormField name="value" ... />
     <FormField name="reference_date" ... />
   </div>
   ```
   - Em telas pequenas (<640px), continuam empilhados (não força quebra de UX no mobile do rito).
   - Em ≥sm, aparecem lado a lado, ocupando metade cada — atende `AddKpiValueDialog` (que tem largura suficiente) e o `CollaboratorKpiStep` (área central do wizard tem >640px no viewport informado de 1119px).

2. **Manter ordem visual semântica:** Valor à esquerda, Data à direita. O `valueAdornmentSlot` continua imediatamente abaixo do campo Valor (dentro da coluna esquerda do grid), assim o delta/RAG estimado fica logo abaixo do valor digitado, sem cruzar com a Data.

3. **Não criar prop nova / não duplicar componente.** A mudança é puramente de layout do JSX raiz do form. Outros consumidores ganham automaticamente o mesmo benefício de UX (campos curtos lado a lado).

4. **Sem tocar em** schema, validação, sugestão de `input_type`, dica "consolida X mas atualiza Y", regra de notes obrigatórias, callbacks (`onValueChange`, `onInputTypeChange`, `onValidSubmit`).

### Snippet alvo (substitui os blocos atuais dos `FormField` Valor e Data, linhas 170-209)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField
    control={form.control}
    name="value"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Valor ({unit})</FormLabel>
        <FormControl>
          <div className="relative">
            <Input type="number" step="0.01" placeholder={placeholder} {...field} />
          </div>
        </FormControl>
        {valueAdornmentSlot}
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="reference_date"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Data de Referência</FormLabel>
        <FormControl>
          <Input type="date" max={maxDate} {...field} />
        </FormControl>
        <p className="text-xs text-muted-foreground">
          Informe o último dia do período consolidado (até ontem)
        </p>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

## Impactos nos consumidores

| Consumidor | Impacto |
|---|---|
| `CollaboratorKpiStep` (pedido) | Valor + Data lado a lado em ≥640px, empilhados no mobile. ✅ |
| `AddKpiValueDialog` (`/kpis`) | Mesmo ganho — modal padrão tem ≥600px. Sem regressão. ✅ |
| `EditKpiValueDialog` | Idem. ✅ |
| Mobile (<640px) | Sem mudança visível — segue empilhado. ✅ |

## Fora de escopo

- Mudar layout do `Tipo do input` ou `Observações` (continuam linha inteira).
- Criar variantes/props novas (`layout="row"` etc.) — desnecessário: o grid responsivo cobre todos os casos.
- Outros formulários do módulo KPIs.
