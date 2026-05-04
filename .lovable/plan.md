## Problema

No **Check-in Individual** (sexta-feira), ao concluir o ritual aparece o aviso:
> "Check-in registrado, mas N item(ns) auxiliar(es) falhou(aram). Verifique nos respectivos módulos."

A causa: a mutation `addKpiValueSilent` em `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (linhas 219–262) tenta inserir em `kpi_values` o campo `confidence: 'medium'`, mas essa coluna **não existe mais** na tabela. Pelo SSOT KPIs v3.0.0, confiabilidade do dado é **derivada por trigger DB** a partir de `input_type` + `source`. O teste `CollaboratorCheckinKpiSave.test.ts` já enforça esse contrato — só o código de produção ficou desalinhado.

Schema real de `kpi_values` (verificado): `id, kpi_id, value, reference_date, source, notes, created_by, created_at, period_start, period_end, period_label, rag_status, input_type`. Sem `confidence`.

Resultado: todo `kpi_values.insert` do check-in individual falha silenciosamente (mutation é fail-safe), KPIs não são salvos, e o usuário vê o banner de auxiliares com falha.

## Mudança

Alinhar `addKpiValueSilent` ao schema atual e ao SSOT v3.0.0:

1. Remover o campo `confidence` do tipo da mutation e do payload do `.insert()`.
2. Manter `input_type` (com default `'consolidated'`) e `source` (default `'manual'`) — o trigger DB se encarrega da confiabilidade derivada.
3. Nenhuma mudança de UI, nenhuma mudança em outros módulos, nenhuma migração de banco.

## Validação

- O teste `src/modules/okrs/pages/__tests__/CollaboratorCheckinKpiSave.test.ts` já valida o payload sem `confidence` — passará a refletir o código real.
- Após o fix, executar um check-in individual com KPI atualizado não deve mais exibir o aviso de auxiliares.

## Arquivos afetados

- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (apenas a mutation `addKpiValueSilent`, linhas ~219–249).
