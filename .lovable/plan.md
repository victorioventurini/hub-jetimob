# Plano — Empilhar colaboradores em linhas de até 6 no Organograma

## Contexto

No organograma (`/teams` → aba Organograma), quando um time tem muitos colaboradores (ex.: Tecnologia com 9+ pessoas), todos aparecem em uma única linha horizontal que estoura a largura da tela. Além disso, qualquer tentativa ingênua de "quebrar linha" gera uma cascata vertical que parece indicar que a pessoa de baixo se reporta à de cima — o que é incorreto: todos os colaboradores são pares (irmãos) sob o mesmo time pai.

## Objetivo

- Exibir no máximo **6 cards de colaboradores (`type: 'person'`) por linha**.
- A partir do 7º, quebrar para uma nova linha.
- Garantir que a apresentação visual deixe claro que **todos são irmãos** (pares) sob o mesmo nó pai — sem sugerir relação hierárquica vertical entre eles.

## Escopo

Mudança puramente de UI/layout em **um único componente já centralizado**:

- `src/modules/teams/components/organogram/OrganogramNode.tsx`

Não criar novos componentes — estender o existente conforme as instruções do projeto (não duplicar). Sem mudanças em tipos, hooks, queries, RLS ou dados.

## Conformidade com TCR / docs canônicos

- `WIZARDS_FRAMEWORK_BOUNDARY.md`: N/A (módulo Teams, não wizards).
- `DEVELOPMENT_STANDARDS.md`: mudança UI-only, sem violar regras de BU/RLS/queries.
- Componente único e centralizado (`OrganogramNode.tsx`) já é o SSOT da renderização — não há duplicação.
- `BU_SCOPED_SUPABASE_RULES.md`: N/A (sem queries).
- `QUERY_KEYS_STANDARD.md`: N/A.

## Comportamento detalhado

1. Ao renderizar `node.children`, separar:
   - **`personChildren`**: filhos com `type === 'person'`.
   - **`nonPersonChildren`**: áreas, times, subtimes, squads (mantêm o comportamento atual em linha única horizontal).

2. Para `nonPersonChildren`: manter o layout atual (linha única horizontal com conector em "T" invertido).

3. Para `personChildren`: agrupar em chunks de até **6 por linha** e renderizar como uma **grade de linhas empilhadas**, onde:
   - Cada linha de pessoas é independente.
   - Cada card de pessoa tem seu próprio conector vertical curto vindo de uma linha horizontal acima daquela linha.
   - Não há conector vertical ligando uma pessoa à outra de outra linha — eliminando a falsa hierarquia.
   - Entre linhas de pessoas há um espaçamento (`gap-y`) que reforça que são grupos paralelos sob o mesmo pai.

4. Quando houver mistura de `nonPersonChildren` e `personChildren` sob o mesmo pai (raro, mas possível com squads + pessoas): renderizar primeiro a linha de não-pessoas, depois as linhas de pessoas empilhadas, ambas visualmente conectadas ao mesmo pai pelo conector vertical principal.

## Layout visual esperado (Tecnologia com 9 colaboradores)

```text
                    [ Tecnologia ]
                          │
        ┌─────────────────┼─────────────────┐
        │     │     │     │     │     │
       [P1] [P2] [P3] [P4] [P5] [P6]
        ┌─────┬─────┐
        │     │     │
       [P7] [P8] [P9]
```

Cada linha de pessoas tem sua própria barra horizontal acima, ancorada ao centro da linha — não há linha vertical entre P1 e P7 (que seria interpretada como "P7 se reporta a P1").

## Detalhes técnicos

- Constante local `MAX_PERSONS_PER_ROW = 6` no topo do arquivo.
- Helper `chunk<T>(arr: T[], size: number): T[][]` inline (não justifica utilitário compartilhado).
- Reuso do mesmo padrão de conectores já presente no componente (linha vertical `w-px h-4 bg-border` + linha horizontal absoluta sobre os filhos).
- Aplicar a lógica nos **dois locais** onde hoje renderizamos `node.children` em loop dentro de `OrganogramNodeCard` (apenas o branch normal — o `CeoCard` só tem áreas como filhos, não precisa de mudança).
- Sem mudanças em props da API pública dos componentes.
- Manter `memo`, manter acessibilidade e foco.

## Verificação

- Build automático.
- Inspeção visual no preview em `/teams` na aba Organograma com o time Tecnologia (9+ pessoas) e em times menores (≤6 pessoas) para garantir que o comportamento antigo continua idêntico quando não há overflow.
- Confirmar que a mudança não quebra o zoom (`OrganogramChart` continua intocado).
