## Objetivo

Desativar o rito **Check-in Executivo** (`clevel-checkin`) e remover sua presença na UI, seguindo exatamente o padrão já adotado para o rito `managers-checkin` (descontinuado, substituído pelo MBR). Mantém-se compatibilidade retroativa para sessões históricas (`okr_wizard_sessions`) e ocorrências passadas (`ritual_occurrences`) — nada é apagado do banco.

---

## Princípios da remoção (espelhando `managers-checkin`)

1. **Não remover do enum/tipo `WizardPersona`** — sessões antigas precisam continuar legíveis.
2. **Manter renderer de relatório** (`CLevelCheckinReport`) e label canônico (com sufixo "(descontinuado)") para histórico.
3. **Remover todos os entry points de UI**: cards, hub de wizards, dashboard executivo, filtros do calendário/criação, opções de filtro do histórico.
4. **Bloquear a rota** redirecionando `/rituals/clevel-checkin` (e alias `/okrs/clevel-checkin`) para `/rituals`.
5. **Parar a materialização futura** no `sync-ritual-calendar-from-cycles` e na lista canônica `ALL_RITUAL_WIZARD_TYPES`.
6. **Não deletar** a edge function `clevel-checkin-summary` nem a página `CLevelCheckinPage` neste momento — apenas deixá-las órfãs (rota desligada). Justificativa: minimizar superfície de mudança e permitir reativação rápida se decidido. A limpeza física pode ser feita em uma onda futura de housekeeping.

---

## Mudanças por arquivo

### Frontend — entry points (remoção visual)

- `src/pages/Index.tsx`: remover import e renderização de `CLevelCheckinWizardCard` (linhas 19, 133+).
- `src/modules/okrs/pages/ExecutiveDashboardPage.tsx`: remover import e o bloco que renderiza `<CLevelCheckinWizardCard ... />` (linhas 16, 85+). Ajustar grid se necessário para não deixar coluna vazia.
- `src/pages/Wizards.tsx`: remover o item `{ id: 'clevel-checkin', ... }` do array de wizards do grupo "OKRs – Gestores e Executivos" (linhas 178–192).

### Frontend — catálogos e filtros

- `src/modules/okrs/constants/ritualWizardTypes.ts`: remover `'clevel-checkin'` do array `ALL_RITUAL_WIZARD_TYPES` (deixa de aparecer em filtros do calendário, em criação manual de ocorrências e na geração de cadências). Adicionar comentário no estilo do `managers-checkin`: `// 'clevel-checkin' removido — rito descontinuado.`.
- `src/modules/okrs/pages/ritual-history/constants.ts`: remover a entrada `{ value: 'clevel-checkin', label: 'Check-in Executivo' }` do filtro do histórico (linha 28). O renderer continua funcionando para sessões já existentes via `RITUAL_LABELS`.
- `src/modules/okrs/constants/ritualLabels.ts`: mover `'clevel-checkin'` da seção "Ativos" para "Históricos / descontinuados" e mudar o label para `'Check-in Executivo (descontinuado)'`. Manter a entrada para back-compat de sessões históricas.

### Frontend — rotas

- `src/routes/rituals.routes.tsx`:
  - Substituir `<Route path="/rituals/clevel-checkin" element={<RitualRoute><CLevelCheckinPage /></RitualRoute>} />` por `<Route path="/rituals/clevel-checkin" element={<Navigate to="/rituals" replace />} />` (mesmo padrão do `managers-checkin`).
  - Substituir o alias legado `/okrs/clevel-checkin` por `<Navigate to="/rituals" replace />`.
  - Remover o import de `CLevelCheckinPage` se não restar uso.
  - Adicionar comentário: `// clevel-checkin: rito descontinuado.`

### Frontend — disponibilidade

- `src/modules/okrs/hooks/useRitualAvailability.ts`: remover o bloco `'clevel-checkin': { ... }` do `WINDOW_DEFS` (linhas 140–146). Sem entrada, o hook trata como indisponível por padrão.

### Frontend — wizard card (componente fica órfão)

- `src/modules/okrs/components/wizards/clevel-checkin/CLevelCheckinWizardCard.tsx`: **manter o arquivo** mas sem mais imports apontando pra ele (verificar com `rg`). Não removemos os steps/renderer para preservar a página `CLevelCheckinPage` caso seja acessada via URL antiga (que agora redireciona — então de fato fica inerte). Opcional: remover o export do barrel `clevel-checkin/index.ts`. Decisão recomendada: **manter os arquivos como código morto** nesta passada, alinhado com o tratamento histórico do `managers-checkin`.
- `src/modules/okrs/components/wizards/index.ts`: remover o re-export `CLevelCheckinWizardCard` se existir, para evitar consumo acidental.

### Backend — parar materialização de novas ocorrências

- `supabase/functions/sync-ritual-calendar-from-cycles/index.ts`: remover `'clevel-checkin'` da lista de personas materializadas (linha 28) e o bloco que cria a cadência semanal (linha ~134). Sem mudança de schema — apenas para a função de sincronização.

### Itens **não alterados** (intencional)

- `supabase/functions/clevel-checkin-summary/*` — mantida (sem caller ativo, mas sem custo).
- `src/modules/okrs/components/ritual-report/SnapshotReportView.tsx` — mantém `'clevel-checkin': CLevelCheckinReport` para renderizar relatórios de sessões históricas.
- `src/modules/vic/types/ask-to-vic.ts`, `useAskToVic.ts` — referências de tipo permanecem (alinhado com `managers-checkin`).
- `src/modules/okrs/hooks/useWizardAI.ts` (linha 128) — sem efeito após rota desligada; manter para coerência tipológica.
- `src/modules/okrs/types/wizard/*` (`core.ts`, `wizard-configs.ts`, `vic-context.ts`) — manter persona no union type.
- Migrations existentes — não alteradas. Nenhuma migration nova.
- Banco de dados — nada deletado: `okr_wizard_sessions` e `ritual_occurrences` históricos preservados.

---

## QA pós-implementação

1. **Hub `/rituals`** (`src/pages/Wizards.tsx`): card "Check-in Executivo" não aparece mais; demais ritos do grupo "Gestores e Executivos" continuam.
2. **Home `/`** (`src/pages/Index.tsx`): card sumiu da home executiva.
3. **`ExecutiveDashboardPage`**: layout sem buracos.
4. **Calendário de Ritos** (`/rituals/calendar`): persona `clevel-checkin` ausente do filtro e da criação manual; ocorrências passadas continuam visíveis (banco preservado).
5. **Histórico** (`/rituals/history`): filtro não lista mais "Check-in Executivo" como opção, mas sessões antigas dessa persona continuam abrindo o renderer correto com label "(descontinuado)".
6. **Rotas**: `/rituals/clevel-checkin` e `/okrs/clevel-checkin` redirecionam para `/rituals`.
7. **Sincronização de cadências** (`/settings/rituals` após próximo run do sync): cadência `clevel-checkin` deixa de ser recriada para novos ciclos.
8. **Build/Test**: `useRitualAvailability` test, `WizardCards.test.tsx`, `SnapshotReportView.test.tsx`, `structureVersions.test.ts` continuam passando (renderer e tipos preservados; testes não exigem entrada de menu).

---

## Notas de escopo

- **Reversível**: como o componente, a página e o renderer permanecem no repo, reativar o rito significa restaurar (1) a rota real, (2) o card no hub/home/dashboard, (3) a entrada em `ALL_RITUAL_WIZARD_TYPES`, (4) a janela em `useRitualAvailability` e (5) a entry no `sync`.
- **Sem migration**: não há mudança de schema, enums (a coluna `wizard_type` é `text`), nem RLS.
- **Documento `ritos-hub-jet.md`** (gerado anteriormente em `/mnt/documents/`): não será atualizado nesta passada — pode ser regenerado depois marcando o rito como descontinuado.
