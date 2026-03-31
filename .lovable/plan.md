
Pré-checklist obrigatório: concluído agora nesta sessão, com leitura dos docs canônicos relevantes:
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `docs/canonical/IDENTITY_CONVENTION.md`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/DATA_MODEL_REGISTRY.md`
- E verificação de implementação similar no codebase (`useOkrStatus.ts`, `ObjectiveListItem.tsx`, `EnhancedObjectiveCard.tsx`, `OkrObjectiveCard.tsx`).

Vou prosseguir com este plano de ação para corrigir o erro em `/okrs` (`undefined.color`):

1) Blindar mapeamento de status na origem
- Arquivo: `src/modules/okrs/hooks/useOkrStatus.ts`
- Ajustar `mapRagToCalculated` para sempre retornar um status válido (fallback explícito).
- Objetivo: impedir retorno `undefined` quando vier status inesperado de KR/KPI.

2) Blindar consumo de `STATUS_CONFIG` no dashboard
- Arquivo: `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx`
- Nos pontos onde há `STATUS_CONFIG[status]` e `STATUS_CONFIG[calculatedStatus]`, aplicar `safeStatus` com fallback canônico antes de acessar `.color/.label/.borderColor`.
- Objetivo: eliminar crash em runtime mesmo com dado fora de contrato.

3) Padronizar proteção em pontos correlatos de OKRs
- Revisar componentes que também fazem lookup dinâmico de status (especialmente cards/listas de objetivo/KR) para repetir o mesmo padrão defensivo.
- Objetivo: evitar regressão em outras telas que compartilham a mesma lógica.

4) Cobertura de testes
- Arquivo: `src/modules/okrs/hooks/useOkrStatus.test.ts`
- Adicionar caso de fallback para status inválido/inesperado.
- Ajustar/estender teste de componente do dashboard para garantir que renderiza sem quebrar quando status vier inválido.

5) Validação final
- Verificar build/typecheck e abrir fluxo de `/okrs` para confirmar:
  - sem erro de `undefined.color`;
  - badges e labels continuam coerentes;
  - KRs com KPI primária e `ragStatus` não mapeado não derrubam a página.

Detalhe técnico chave
- Causa raiz confirmada no código atual: `mapRagToCalculated` pode retornar `undefined` (sem `default`) e esse valor é usado para indexar `STATUS_CONFIG`, resultando em `statusConfig` indefinido e crash ao ler `.color`.
