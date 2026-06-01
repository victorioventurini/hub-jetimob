## Diagnóstico

A tela ainda mostra `Consolidação pendente` porque o registro atual da KPI `MRR Novas Funcionalidades` no banco continua assim:

```text
value: 0
reference_date: 2026-05-31
input_type: partial
rag_status: no_data
period_label: 2026-05
```

Ou seja: apesar da intenção de registrar como consolidado, o valor que chegou no banco ficou `partial`, então a validação inicial do Pré-MBR continua bloqueando o Nicolas.

## Plano de correção

1. **Correção operacional imediata**
   - Atualizar somente esse registro de `kpi_values` para:
     - `input_type = 'consolidated'`
     - `rag_status = 'off_track'` ou o valor equivalente usado pelo sistema para vermelho
   - Manter `value = 0` e `reference_date = 2026-05-31`.

2. **Correção de produto para não repetir**
   - Ajustar o modal de registro aberto pelo Pré-MBR para já iniciar com:
     - `reference_date` no último dia do `referenceMonth` do rito
     - `input_type = 'consolidated'` quando o rito está cobrando consolidação do mês fechado
   - Isso evita que o usuário registre corretamente o valor 0, mas o form salve como parcial.

3. **Reclassificação correta após salvar**
   - Incluir/propagar `input_type` no snapshot mensal usado pelo gate do Pré-MBR, para que valores parciais e consolidados sejam diferenciados de forma explícita.
   - Invalidar também as queries mensais do Pré-MBR após fechar o modal de KPI, não apenas a query genérica `wizard-v2`.

4. **Validação**
   - Confirmar via consulta que a KPI não aparece mais como `Consolidação pendente` para o time Produto no mês `2026-04`/referência mensal aplicável.
   - Conferir que Nicolas consegue sair da etapa 1 sem precisar criar outro valor.