# Remover "Bloqueadores" do Summary do Check-in Individual

## Contexto

A coluna `okr_checkins.blockers` existe, mas **nenhum step do rito coleta esse campo**. O Summary mostra o item "BLOQUEADORES" no nav inferior e renderiza uma seção condicional — só que como nada é capturado, o contador é sempre 0 e a seção nunca aparece. Ruído visual sem função.

Escopo cirúrgico: remover apenas a UI de bloqueadores **dentro do `CollaboratorSummary.tsx`**. Sem migração de banco, sem mexer em outros leitores legítimos.

## O que muda

Arquivo único: `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`

1. **Stats (linhas 410, 417)** — remover `withBlockers` do cálculo e do objeto `stats`.
2. **Markdown copy (linhas 437, 451, 488–491)** — remover `const blockers = ...`, a linha `🚧 ${stats.withBlockers} bloqueadores` no resumo e o bloco `## Bloqueadores`.
3. **Scaffold case `'checkin'` (linhas 602, 630–648)** — remover `const blockers = ...` e o `<SectionShell id="section-blockers">` inteiro. KRs continuam sendo renderizados normalmente.
4. **Nav inferior (linhas 820–831)** — remover o link `#section-blockers` ("BLOQUEADORES") e ajustar o grid se necessário (o restante já se adapta porque é `flex`/`grid` baseado em filhos).
5. **Imports** — se `AlertTriangle` ficar sem outros usos no arquivo, remover do import do `lucide-react`.

## O que NÃO muda

- `okr_checkins.blockers` no banco (histórico preservado).
- `useCollaboratorWeekActivity` — continua mostrando "Registrou X bloqueios" no card "Sua semana até aqui" para check-ins legados.
- `CollaboratorReflectionStep` — badge "X com bloqueador" continua intacto (é leitura informativa do draft).
- `PreWeeklySourcesStep` — métricas de bloqueios em fontes do Pré-Weekly continuam intactas.
- `LatestCheckinSummary`, `CheckinDialog`, tooltips, status "bloqueada" de iniciativas, AlertBanner, LeaderInsightsStep — nada disso é afetado.
- Tipo `CollaboratorCheckinResult.blocker` permanece (já é opcional; não vale tocar agora).

## Validação

- Abrir `/rituals/collaborator-checkin?step=summary` e confirmar que o nav inferior tem 5 itens (KRs, Pulados, KPIs, Marcos, Pendências) — sem "BLOQUEADORES".
- Confirmar que nenhum card "Bloqueadores" aparece no scaffold.
- Clicar "Copiar resumo" e validar que o markdown não contém mais a linha `🚧` nem a seção `## Bloqueadores`.
- TypeScript build limpo.
