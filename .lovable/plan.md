
Objetivo
- Implementar um novo indicador de ciclos no header com Q1–Q4 lado a lado, mini-barras por quarter, progresso anual e progresso do quarter ativo, respeitando padrões canônicos do projeto.
- Comportamento confirmado: sem navegação ao clique.
- Mobile confirmado: resumo curto.

Alinhamento canônico aplicado
- Documentação validada: TCR, DEVELOPMENT_STANDARDS, DATA_MODEL_REGISTRY, IDENTITY_CONVENTION, PERMISSIONS_AND_RBAC_MODEL.
- Contexto: componente em área operacional (POST-BU), com gating por `currentBuId`.
- Query sem `select('*')`, com filtro explícito `.eq('bu_id', currentBuId)`.
- Query keys centralizadas em `src/lib/queryKeys/okrs.ts`.

Ajustes no escopo do prompt do Claude
- Remover navegação por clique (ativo/concluído), mantendo indicador informativo.
- Manter oculto em `/hub/*` como comportamento atual do header.
- Preservar layout geral do header, BU selector e avatar.

Plano de implementação

1) Hook de dados para o header (novo)
- Criar `src/modules/okrs/hooks/useHeaderCycleProgress.ts` (nome canônico para evitar hook “genérico por ano” sem contexto de UI).
- Buscar ciclos do ano corrente com cliente BU-safe e filtro explícito:
  - `type in ('quarter','year')`
  - `bu_id = currentBuId`
  - janela do ano corrente (`start_date/end_date`)
- Retorno do hook:
  - `quarters: [{ label: 'Q1'|'Q2'|'Q3'|'Q4', state: 'done'|'active'|'future', percent }]`
  - `yearPercent`
  - `activeQuarterLabel`
  - `activeQuarterPercent`
- Cálculo:
  - Quarter ativo por intervalo de datas (`start_date <= hoje <= end_date`) e/ou `status='active'` como prioridade.
  - Quarters concluídos: 100%; futuros: 0%; ativo: percentual temporal (0–100).
  - Ano: percentual temporal do ciclo `type='year'` quando existir; fallback calendário (01/jan a 31/dez, bissexto).
  - Arredondamento inteiro e clamp 0–100.

2) Query keys
- Em `src/lib/queryKeys/okrs.ts`, adicionar chave dedicada:
  - `headerCycles(buId, year)` ou equivalente.
- Usar essa key no novo hook para cache consistente.

3) Novo componente visual no header
- Criar `src/components/layout/CycleProgressHeader.tsx`.
- Entregar as 3 variações visuais (como você pediu para simular todas):
  - `compact`
  - `card`
  - `segmented` (mais próxima da referência enviada)
- Estrutura visual comum:
  - 4 blocos (Q1..Q4), cada um com label + mini-barra (3px)
  - divisor entre blocos
  - texto final `XX% do ano`
  - sem `<Link>` e sem handlers de navegação
- Cores por estado:
  - done = sucesso (verde)
  - active = info (azul)
  - future = neutro (cinza)
- Acessibilidade:
  - `aria-label` com estado e percentual por quarter
  - `title`/tooltip opcional para detalhes de datas

4) Integração no Header
- Em `src/components/layout/Header.tsx`:
  - Substituir `ActiveCycleIndicator` por `CycleProgressHeader`.
  - Renderização condicional:
    - mostrar apenas se `currentBuId` existir
    - ocultar em `/hub/*` (manter regra atual)
    - desktop: variante visual completa
    - mobile: resumo curto (`Ano X% · Qn Y%`)

5) Compatibilidade e fallback
- Se não houver ciclos suficientes do ano:
  - manter placeholder discreto (“Ciclos indisponíveis”) sem quebrar header.
- Sem alterações em banco, RLS, migrações ou permissões.
- Sem mudanças nas rotas e no restante do layout.

Arquivos previstos
- Novo: `src/modules/okrs/hooks/useHeaderCycleProgress.ts`
- Novo: `src/components/layout/CycleProgressHeader.tsx`
- Editar: `src/components/layout/Header.tsx`
- Editar: `src/lib/queryKeys/okrs.ts`
- (Opcional, apenas se necessário para reuso): `src/modules/okrs/utils/cycleProgress.ts`

Critérios de aceite
- Q1–Q4 visíveis lado a lado no desktop, com mini-barra por quarter.
- Estado visual correto por quarter (concluído/ativo/futuro).
- Percentual anual correto e atualizado com base na data atual.
- Percentual do quarter ativo correto e limitado a 100%.
- Sem navegação ao clique.
- Mobile exibe somente resumo curto.
- Header sem regressão de layout em rotas operacionais e oculto em `/hub/*`.
