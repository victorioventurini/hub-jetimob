## Problema

O campo "Valor" no formulário `KpiValueEntryForm` é um `<input type="number">` cru. Líderes digitam `2.94` achando que estão lançando R$ 2,94 quando o KPI é em R$, ou digitam `150000` sem formatação visual. Não há feedback do formato esperado conforme a unidade do KPI.

## Solução

Substituir o input numérico nativo por um campo **mascarado por unidade**, mantendo o schema atual (`z.coerce.number`) inalterado — o componente expõe um `number` para o react-hook-form, mas o usuário vê e edita a string formatada em pt-BR.

### Máscaras por unidade

| Unidade do KPI                          | Máscara exibida           | Decimais | Exemplo input → valor |
|-----------------------------------------|---------------------------|----------|------------------------|
| `R$`                                    | `R$ 1.234,56` (prefixo)   | 2 fixas  | `150000` → `R$ 1.500,00` |
| `%`                                     | `12,34 %` (sufixo)        | até 2    | `75,5` → `75,5 %`     |
| `Número`, `Clientes`, `Leads`, `pontos`, `Pontos`, `Dias`, `x`, ou qualquer outra | `1.234,56` + sufixo unidade | até 2  | `1500` → `1.500` Clientes |

Regras comuns:
- Separador de milhar: `.` Separador decimal: `,`
- Aceita colar de planilha (`1.500,00`, `1500.00`, `1,500.00`) — normalizamos.
- Bloqueia caracteres não numéricos.
- Negativos permitidos (alguns KPIs podem ter delta negativo).

### Onde aplicar

Um único componente novo `KpiValueInput` substitui o `<Input type="number">` em:

1. `src/modules/kpis/components/shared/KpiValueEntryForm.tsx` (SSOT — cobre `EditKpiValueDialog`, `AddKpiValueDialog`, `CollaboratorKpiStep` e demais ritos que reutilizam o SSOT).

Não é preciso tocar consumers — o form passa a unidade que já recebe via prop `unit`.

## Arquivos

**Novo**
- `src/modules/kpis/components/shared/KpiValueInput.tsx` — componente controlado (`value: number | undefined`, `onChange: (n) => void`, `unit: string`), renderiza `<Input>` com formatação on-blur e parse on-change; prefixo/sufixo via `InputAdornment` (div absoluto dentro do wrapper, padrão já usado no projeto).
- `src/modules/kpis/utils/__tests__/numberFormat.test.ts` — testes unitários do parser/formatter.

**Novo helper (puro)**
- `src/modules/kpis/utils/numberFormat.ts` — funções `parseBrNumber(str): number | null`, `formatBrNumber(n, { decimals, style: 'currency' | 'percent' | 'decimal' })`, `getMaskConfigForUnit(unit)`.

**Editado**
- `src/modules/kpis/components/shared/KpiValueEntryForm.tsx` — trocar o `<Input type="number">` por `<KpiValueInput unit={unit} value={field.value} onChange={field.onChange} placeholder={placeholder} />`. Atualizar `placeholder` para refletir o formato mascarado (`Ex.: R$ 1.500,00`, `Ex.: 75,5 %`, `Ex.: 42`).

## Detalhes técnicos

- `parseBrNumber` aceita ambos os formatos (`1.234,56` e `1234.56`) para tolerar paste:
  - Se string contém `,` → trata `.` como milhar e `,` como decimal.
  - Senão → trata `.` como decimal.
- `KpiValueInput` mantém estado local `displayValue: string`:
  - `onChange` do `<Input>`: extrai dígitos/sinais, atualiza `displayValue`, chama `props.onChange(parseBrNumber(...))`.
  - `onBlur`: re-formata `displayValue` a partir do número canônico para garantir vista normalizada (`1500` → `1.500,00` em R$).
  - Quando `props.value` muda externamente (reset do form), re-formata.
- O schema continua `z.coerce.number()`; o RHF recebe `number | undefined`, então nenhuma alteração de validação ou submit é necessária.
- Acessibilidade: `inputMode="decimal"` em mobile; `aria-describedby` aponta para microcopy de período já existente.

## Fora do escopo

- Não alterar `EditKpiTargetDialog` (metas) — apenas valores. Pode ser feito em uma segunda iteração reutilizando o mesmo `KpiValueInput`.
- Não alterar input de valores em KRs (KRs continuam bloqueados quando há Primary KPI).
- Sem mudança de schema do banco; persistimos `number` como hoje.

## Validação após implementar

1. Abrir `EditKpiValueDialog` de um KPI em R$ → digitar `150000` → ver `R$ 150.000,00` após blur.
2. Mesmo dialog em KPI `%` → digitar `75,5` → ver `75,5 %`.
3. Dialog em KPI `Clientes` → digitar `1500` → ver `1.500 Clientes`.
4. Submeter os três e conferir no banco que o valor numérico está correto.
5. Rodar `vitest` em `src/modules/kpis/utils/__tests__/numberFormat.test.ts`.