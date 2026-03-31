
Objetivo
- Garantir que os ritos exibidos em `/settings/rituals` sejam sempre populados e reajustados automaticamente conforme alterações feitas em `/hub/modules/okrs/settings`.
- Regras confirmadas por você:
  - Sincronização: automática imediata
  - Ajuste de dados existentes: regerar tudo

Contexto técnico validado (canônico)
- PRE/POST-BU e isolamento BU: seguir `useBuScopedSupabase` + filtro explícito `bu_id`.
- Query keys centralizadas em `queryKeys.okrs`.
- Modelo de ciclos/rituais já existente: `cycles`, `ritual_cadences`, `ritual_occurrences`.
- Função atual `generate-ritual-occurrences` gera por cadência, mas hoje não cobre bem o fluxo “hub settings -> rituals” em todas as mutações.

Diagnóstico do que falta hoje
1) Sincronização incompleta
- `CyclesTab` sincroniza parcialmente (foco em MBR/mbr-pre no auto-generate), mas não cobre todos os cenários de edição/ativação/encerramento.
- `CycleFormDialog` salva ciclo e invalida cache, porém não força regeneração do calendário de ritos.
- `useCycleActions` (ativar/encerrar) não dispara regeneração de ocorrências.

2) Regeneração “total” não implementada
- A função `generate-ritual-occurrences` hoje remove apenas órfãos `scheduled` sem sessão.
- Não existe modo explícito para “regerar tudo” conforme sua decisão.

Plano de implementação

1) Criar orquestração única de sincronização de ritos por BU
- Adicionar uma nova edge function (ex.: `sync-ritual-calendar-from-cycles`) para:
  - Ler ciclos trimestrais/anuais da BU;
  - Upsert padronizado de `ritual_cadences` derivadas dos ciclos (MBR/MBR-pre/QBR-pre e ritos trimestrais aplicáveis);
  - Invocar geração de ocorrências para cada cadência relevante em modo de rebuild total.
- Benefício: regra de negócio centralizada no backend e reaproveitada por qualquer tela.

2) Evoluir `generate-ritual-occurrences` para modo “full rebuild”
- Incluir parâmetro de estratégia (ex.: `rebuild_mode: 'full' | 'incremental'`), usando `full` para o fluxo do Hub.
- Em `full`:
  - Recalcular completamente o conjunto esperado da cadência;
  - Recriar ocorrências conforme as datas atuais da cadência.
- Manter validações de BU/JWT e padrões de middleware existentes.

3) Disparar sincronização automática em todos os pontos de mudança no Hub
- Em `/hub/modules/okrs/settings`:
  - Após criar/editar/remover/ativar/encerrar ciclos;
  - Após auto-generate de ciclos;
  - Após mudanças de estado que impactam ritos (quando aplicável no `RitualsTab`).
- Implementar via helper único no frontend (hook utilitário) para evitar duplicação de `supabase.functions.invoke(...)`.

4) Garantir atualização imediata do `/settings/rituals`
- Invalidar caches canônicos após sincronização:
  - `queryKeys.okrs.ritualCadences(buId)`
  - `queryKeys.okrs.ritualOccurrencesPrefix(buId)`
  - `queryKeys.okrs.ritualAdherence(buId, ...)`
- Resultado esperado: calendário e saúde refletem mudanças sem ação manual.

5) Ajustes de consistência e conformidade
- Corrigir uso de cliente não canônico em hooks operacionais de ritos (onde houver `@/integrations/supabase/client` em contexto POST-BU).
- Preservar BU scope em todas as queries.
- Sem mudança de schema de banco (não exige migration estrutural).

Arquivos principais impactados
- `supabase/functions/generate-ritual-occurrences/index.ts` (novo modo full rebuild)
- `supabase/functions/sync-ritual-calendar-from-cycles/index.ts` (nova orquestração)
- `src/modules/okrs/components/settings/CyclesTab.tsx` (disparo de sync pós mutações)
- `src/modules/okrs/components/settings/CycleFormDialog.tsx` (disparo de sync pós save)
- `src/modules/okrs/hooks/useCycleActions.ts` (disparo de sync pós activate/close)
- `src/modules/okrs/hooks/useRitualCadences.ts` (ajuste de cliente/camada de invocação se necessário)

Critérios de aceite
- Alterar ciclos em `/hub/modules/okrs/settings` atualiza automaticamente `/settings/rituals` (cadências + calendário + saúde).
- Regra “regerar tudo” aplicada: dados de ocorrências são reconstruídos conforme configuração vigente.
- Nenhum botão manual de sincronização é necessário.
- Sem vazamento entre BUs, sem query key inline, sem regressão nas rotas existentes.
