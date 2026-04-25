# Plano — Correção da criação de KR de contribuição

## Diagnóstico confirmado

A URL reportada aponta para um objetivo e um time contribuidor válidos dentro da **mesma BU Jetimob**:
- objetivo `1470f9f5-fed4-42db-b5fa-406ade6cef6d` existe, está ativo e `is_shared = true`
- `contributor_team_id = d3247da9-3e07-4fa8-9d0a-2527fdf6548f` está cadastrado como contribuidor autorizado
- ambos pertencem à BU **Jetimob**

O problema atual não é falta de dados. É um **falso positivo do estado `context_loading`**.

## Causa raiz

Em `TeamKrCreationPage.tsx`:
1. a query principal mantém corretamente o guard defensivo do TCR (`data.bu_id !== currentBuId -> null`)
2. quando esse guard descarta o objetivo, a query secundária de diagnóstico roda
3. essa query secundária busca o objetivo **sem filtro explícito por `bu_id = currentBuId`**
4. como a RLS de `okr_team_objectives` é baseada em membership da BU (não no contexto atual), ela ainda encontra o objetivo da Jetimob
5. a UI interpreta isso como `context_loading`, mesmo quando o contexto já não vai se auto-recuperar

Resultado: a página fica presa em “Carregando contexto...” em vez de resolver o mismatch real de contexto/seleção.

## Implementação proposta

### 1. Corrigir a query principal do detalhe
Em `src/modules/okrs/pages/TeamKrCreationPage.tsx`:
- manter o guard obrigatório do TCR
- adicionar filtro explícito `.eq('bu_id', currentBuId)` na query principal do objetivo
- preservar `enabled: isReady && !!supabase && !!objectiveId && !!currentBuId`

### 2. Corrigir a query secundária de diagnóstico
Na mesma página:
- aplicar o mesmo filtro `.eq('bu_id', currentBuId)` no diagnóstico secundário
- manter select mínimo (`id, bu_id, cancelled_at`)
- reclassificar o comportamento:
  - `cancelled` quando `cancelled_at != null`
  - `not_found` quando a linha não vier no contexto atual
- parar de usar `context_loading` para um caso que já não é race transitória

### 3. Ajustar a UX do estado vazio
Em `src/components/ui/resource-not-found-state.tsx` e no branch de erro da página:
- remover a mensagem enganosa de “finalizando carregamento da BU” para esse fluxo
- mostrar mensagem objetiva para criação de KR de contribuição quando o objetivo não estiver acessível no contexto atual

### 4. Revisar o padrão documentado
Atualizar o standard recém-criado para refletir a regra correta:
- o diagnóstico secundário BU-scoped também deve respeitar **filtro explícito por `currentBuId`** em entidades operacionais com RLS por membership
- `context_loading` só deve ser usado quando houver evidência real de race transitória, não apenas porque a linha existe em alguma BU acessível

## Arquivos

### Editar
- `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- `src/components/ui/resource-not-found-state.tsx`
- `.lovable/memory/standards/bu-scoped-detail-diagnostic-pattern.md`
- `.lovable/memory/index.md`

## Conformidade com TCR e canônicos

- TCR e `DEVELOPMENT_STANDARDS` revisados antes da análise
- guard defensivo §A.3 será mantido
- cliente continua POST-BU e BU-scoped
- queries continuam sem `select('*')`
- correção reforça a regra canônica de filtro explícito por BU no frontend

## Validação após implementação

1. Abrir a URL reportada na BU Jetimob
2. O wizard deve carregar normalmente
3. O estado `Carregando contexto...` não deve mais aparecer nesse caso
4. Se a BU ativa estiver errada de fato, a tela deve cair em estado consistente de não encontrado/acesso, não em loading infinito mascarado

<final-text>Se você aprovar, eu implemento essa correção cirúrgica agora.</final-text>