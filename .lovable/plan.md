## Contexto

No step final `summary` do Pré-MBR (`MbrPreSummary.tsx`), os títulos dos cards de revisão não refletem fielmente os nomes dos steps anteriores definidos em `ritualLabels.ts → mbr-pre.v3`. Exemplo citado: o card **"Balanço do Mês"** mostra apenas KRs, mas o usuário não consegue inferir isso pelo título — diferente do step homônimo que abre o rito com a visão consolidada.

Os cards do summary devem espelhar 1:1 os títulos canônicos dos steps que originaram cada bloco, garantindo simetria visual e cognitiva.

## Mudanças propostas (apenas UI / títulos de cards)

Arquivo: `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx`

| Bloco | Título atual | Título proposto | Step de origem |
|---|---|---|---|
| 1. KRs (`SummaryKrBalance`) | "Balanço do Mês" | **"KRs do Mês"** | `krs` ("KRs") |
| 2. KPIs (`SummaryKpiList`) | "KPIs do Time" (já vem do componente) | **"KPIs do Time"** (manter — já alinhado) | `kpis` ("KPIs do Time") |
| 2.1. Justificativas projetos/marcos | "Justificativas de execução" | **"Projetos"** (com subtítulo "Justificativas de projetos e marcos atrasados") | `projects` ("Projetos") |
| 3. Destaques e Riscos | "Destaques e Riscos" | "Destaques e Riscos" (manter — já alinhado) | `highlights-risks` |
| 4. Próximos Passos | "Próximos Passos" | "Próximos Passos" (manter — já alinhado) | `next-steps` |
| 5. Sugestões de pauta (`AgendaSuggestionsPrioritizer`) | (sem card wrapper explícito) | Verificar se o componente já renderiza título "Sugestões de pauta para o MBR" — manter |

### Pontos específicos

1. **Card 1 (KRs):** a prop `title` passada para `SummaryKrBalance` muda de `"Balanço do Mês"` para `"KRs do Mês"`. O nome "Balanço" hoje é ambíguo — o step `balance` do Pré-MBR não existe na v3 (foi renomeado para entrar nos vários blocos). Trocar para **"KRs do Mês"** torna explícito o conteúdo (KRs com estado final + justificativas) e alinha ao step `krs` ("KRs", subtitle "Resultados-Chave do mês").

2. **Card 2.1 (Projetos):** renomear de "Justificativas de execução" para **"Projetos"** com subtítulo descritivo, espelhando o step `projects`. Hoje o título é genérico e o usuário não conecta ao step "Projetos" do rito.

3. **SummaryKpiList:** verificar se o título interno do componente já é "KPIs do Time"; se não, alinhar via prop ou ajustar o componente compartilhado (impacto em QbrPreSummary — checar antes de alterar).

## Verificação cruzada (QBR Pre)

`QbrPreSummary` usa o mesmo `SummaryKrBalance` com `title="Balanço do Ciclo"`. No QBR, o step canônico é `balance` ("Balanço do Ciclo") — então **lá** o nome faz sentido. No Pré-MBR não há step `balance`, por isso a renomeação só vale para o MBR.

## Fora de escopo

- Não alterar lógica de negócio, payload do draft ou snapshot.
- Não tocar em `SummaryKpiList`/`SummaryKrBalance` se o ajuste puder ser feito apenas via props no consumidor.
- Não mexer no QBR Pre (títulos lá já estão alinhados aos steps canônicos do QBR).

## Verificação pós-implementação

- Abrir `/rituals/mbr-pre?team=...&step=summary` e conferir que cada card carrega o mesmo título do step que originou o conteúdo.
- Conferir que `QbrPreSummary` continua intacto.
