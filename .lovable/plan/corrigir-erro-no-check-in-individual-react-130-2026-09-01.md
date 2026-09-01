# Corrigir erro no Check-in Individual (React #130)

## O que sabemos

- O erro relatado é `Minified React error #130` com `args[]=undefined`, ou seja: **algum componente resolvido como `undefined` foi renderizado**. Isso trava a tela inteira do wizard.
- Acontece em produção (`next.jetimob.com`), em **um step específico** do Check-in Individual, com o usuário Giordano na BU Jetimob.
- A checagem estática do wizard (página + 8 steps + barrels) não mostrou import/export quebrado óbvio: todos os componentes de step existem e são exportados. Portanto **a causa ainda não está confirmada** — o diagnóstico precisa vir de reprodução com stack não minificado.

## Etapa 1 — Reproduzir e identificar o componente `undefined`

1. Rodar o wizard autenticado como o mesmo usuário/BU (Giordano, Jetimob) em ambiente de desenvolvimento, avançando step a step (Abertura → Indicadores → Projetos → Iniciativas → KRs → Pendências → Reflexão → Resumo) e capturando o erro com stack legível, que aponta o nome do componente e o arquivo.
2. Em paralelo, conferir no banco os dados do Giordano que alimentam os steps (KRs, KPIs próprios/contribuídos, projetos/milestones, iniciativas, decisões pendentes) — o padrão típico desse erro é um valor fora do enum esperado (ex.: um `status`, `unit`, `confidence` ou `type` novo/nulo) usado como chave em um mapa de ícones/componentes, devolvendo `undefined`.

O resultado dessa etapa define o fix pontual. Se a reprodução em dev não quebrar, a investigação continua pelos logs do app (`app_error_logs`) e pelo build com sourcemap.

## Etapa 2 — Corrigir a causa

- Corrigir o ponto exato onde o componente vira `undefined`: import/export errado, ou lookup em mapa sem fallback.
- Onde a resolução for por chave (mapas de ícones/labels por enum), aplicar fallback explícito (`MAPA[chave] ?? Padrão`) nos pontos do fluxo do Check-in Individual, para que um valor inesperado degrade visualmente em vez de derrubar a tela.

## Etapa 3 — Blindar o wizard (evitar tela branca futura)

- Envolver o conteúdo de cada step do Check-in Individual em um limite de erro (error boundary) local: se um step falhar, o usuário vê uma mensagem com opção de voltar/continuar e o rascunho não é perdido, em vez de perder o ritual inteiro.
- Registrar a falha em `app_error_logs` com o step atual, para diagnóstico futuro sem depender do print do usuário.

## Etapa 4 — Validação

- Percorrer o wizard inteiro até o envio, com o usuário afetado e com um usuário sem KRs/KPIs (empty states).
- Confirmar no console que não há mais erro, e que o rascunho e o envio final continuam funcionando.

## Detalhes técnicos

- Arquivos no escopo: `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` e `src/modules/okrs/components/wizards/collaborator/*` (+ componentes compartilhados de `wizards/shared` e componentes reaproveitados de `projects`/`kpis` que o step problemático usar).
- Etapa 3 usa um error boundary reaproveitável no render dos steps, sem alterar a lógica de draft (`useGenericWizardDraft`) nem as mutações de check-in.
- Nenhuma mudança de schema prevista; leituras no banco apenas para diagnóstico.
