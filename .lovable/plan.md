

## Plano — Weekly v2 (Onda 4 · containers + curadoria IA)

### Conformidade canônica verificada

| Doc canônico | Verificado | Aderência |
|---|---|---|
| `TECHNICAL_CONTEXT_REGISTRY.md` v3.28.0 | ✓ | Onda 4 ativa; Weekly v2 já no SSOT esperando containers |
| `AI_AGENTS_PHILOSOPHY.md` | ✓ | Reuso de `curador-orquestrador` (genérico); zero agentes novos |
| `BU_SCOPED_SUPABASE_RULES.md` | ✓ | `useBuScopedSupabase` + `.eq('bu_id', currentBuId)` em todas as queries |
| `IDENTITY_CONVENTION.md` | ✓ | `useIdentity().realProfileId` em mutations |
| `PERMISSIONS_AND_RBAC_MODEL.md` | ✓ | Acesso pela rota `RitualRoute` existente; aprovação restrita a `isAdmin` |
| `DEVELOPMENT_STANDARDS.md` | ✓ | `FullPageWizardShell` + `useGenericWizardDraft` + `WizardStepScaffold` |
| `QUERY_KEYS_STANDARD.md` | ✓ | Novo prefixo `weeklyAggregationListPrefix` em `src/lib/queryKeys/` |

### O que já existe (não toco)

- SSOT estrutural: `stepDefinitions.ts` (`weeklyV2`), `ritualLabels.ts`, `stepCompletionRules.ts`, `structureVersions.ts`
- Tipos `'weekly'` em `WizardPersona`
- Agente `curador-orquestrador` ativo (`scope=global`, `is_active=true`)
- Agentes auxiliares ativos: `analista-kpis`, `coach-okrs`, `facilitador-decisoes`, `alinhamento-estrategico`
- `PreparationStatusCard` + `useRitualPreparationStatus` (precisa só estender enum)
- `ClosingStep` do framework (reuso direto no Step 4)
- `InlineDecisionInput` (reuso em todos os steps)
- Pré-Weekly v2 entregue (`PreWeeklyPage` + 4 steps reais)

### O que entrego

**1. Tipos (em `src/modules/okrs/types/wizard.ts`)**
```ts
export type WeeklyStep = 'executive-opening' | 'priorities' | 'people' | 'closing';

export interface WeeklyExecutiveOpening {
  state: 'draft' | 'reviewed' | 'approved';
  origin: 'ai-curated' | 'manual';
  generatedAt: string | null;
  summary: string;
  themes: WeeklyTheme[];
  alertsByBlock: { performance: string[]; projetos: string[]; pessoas: string[] };
  offAgenda: string[];
  suggestedOrder: { themeId: string; minutes: number }[];
  transitions: { state: string; at: string; by: string }[];
}
export interface WeeklyTheme { id; title; block; type; motivation; suggestedDecision?; affectedTeams }
export interface WeeklyPriorityItem { id; sourcePreWeeklyId; teamName; topic: PreWeeklyTopic }
export interface WeeklyPeopleSignalAggregated { id; sourcePreWeeklyId; teamName; signal: PreWeeklyPeopleSignal }
export interface WeeklyDraftData {
  referenceWeek: string;
  executiveOpening: WeeklyExecutiveOpening;
  prioritiesNotes: string;
  peopleNotes: string;
  closing: { checklist: Record<string,boolean>; minutes: string };
  decisions: TeamCheckinDecision[];
}
```

**2. Container e rota**
- `src/modules/okrs/pages/WeeklyPage.tsx` — espelha `PreWeeklyPage`: `FullPageWizardShell` + `useGenericWizardDraft<WeeklyStep, WeeklyDraftData>` (`wizardType:'weekly'`, `teamId:null`, `cycleId:null`)
- Rota `/rituals/weekly` em `src/routes/rituals.routes.tsx` com `RitualRoute` padrão (sem `requiresBuAdmin` — Weekly é coletiva da BU)
- Card no hub `src/pages/Wizards.tsx` (mesmo padrão visual do Pré-Weekly, badge "Terça-feira")

**3. Steps (em `src/modules/okrs/components/wizards/weekly/`)**
- `WeeklyExecutiveOpeningStep.tsx` — `RitualPreparationStatus` (mode `list`) no topo + `AberturaExecutivaPanel` com 5 seções (resumo, temas, alertas/bloco, fora de pauta, ordem sugerida); botões **Gerar rascunho** / **Revisar** / **Aprovar** / **Regenerar**; banner fallback manual; badge de estado (cinza/amber/verde/vermelho)
- `WeeklyPrioritiesStep.tsx` — lista consolidada via adapter (`topics.category ≠ 'pessoas'`) cross-times, com `InlineDecisionInput` por item
- `WeeklyPeopleStep.tsx` — duas seções independentes: Canal 1 (`topics.category = 'pessoas'`) e Canal 2 (`peopleSignals` agrupados por tipo). **Canal 2 sempre renderiza**, mesmo vazio do Canal 1
- `WeeklyClosingStep.tsx` — usa `ClosingStep` do framework com `blocks: ['checklist','minutes']` (já no SSOT) + confirm dialog
- `WeeklyWizardCard.tsx` + `index.ts` (barrel)

**4. Agregação (sem novas tabelas)**
- `src/modules/okrs/hooks/useWeeklyPreWeeklyAggregation.ts` — lê `okr_wizard_sessions` filtrando `wizard_type='pre-weekly'`, `status='completed'`, semana corrente, **`.eq('bu_id', currentBuId)` explícito** + `.is('deleted_at', null)`. Retorna `{ topics[], peopleSignals[], coverage }`
- Estender `SupportedRitualType` com `'weekly'` em `useRitualPreparationStatus` (mode `list`, expectedParticipants = todos os líderes ativos da BU × `pre-weekly` concluídos da semana)

**5. Edge function de curadoria**
- `supabase/functions/weekly-curate-opening/index.ts` — invocação **manual** pelo botão "Gerar rascunho" no Step 1 (trigger T-2h fica para próxima onda)
- Stack: `_shared/client.ts` factory + middleware `withAuth` + `withBuContext` (padrão `edge-function-standard-v4`)
- Monta payload conforme contrato do agente, chama `curador-orquestrador` via `lovable-ai-gateway`, parse via `tryParseAiJson` (`@/lib/aiResponseParser`)
- Persiste output em `okr_wizard_sessions.reflection_data.executiveOpening` com `state='draft'`, `origin='ai-curated'`, primeira `transition` registrada
- Fallback: `bu_ia_config.ia_enabled=false` ou erro do gateway → retorna estrutura vazia editável com `origin='manual'`
- Log obrigatório em `ai_agent_logs` (mem://architecture/ai-multi-llm-gateway-standard-v2-0-0)

**6. Estados do rascunho (sem nova tabela)**
- Persistido inline em `reflection_data.executiveOpening` (JSONB já existente)
- Transições `draft → reviewed → approved` registradas com `{ at, by: realProfileId }`
- Botão "Aprovar" restrito a `useIdentity().isAdmin` ou role admin de BU
- Snapshot congelado naturalmente em `clearDraft()` ao encerrar (padrão `wizard-snapshot-persistence-standard`)

**7. SSOT — refinos**
- `stepCompletionRules.ts`: manter como está (containers validam internamente conforme já comentado nas linhas 138-141); `closing` usa `requireConfirmDialog`
- `ritualLabels.ts`: já completo (linhas 181-188)
- `stepDefinitions.ts`: já completo, remover só os comentários `// LEGADO` de `weeklyV2` quando containers entrarem
- Novo prefixo em `src/lib/queryKeys/` para agregação semanal

**8. Permissões e governança**
- Acesso ao rito: qualquer membro autenticado da BU com módulo `okrs` (rota `RitualRoute` padrão)
- Botão **Aprovar** Abertura Executiva: `isAdmin` (CEO/COO/admin BU)
- Botão **Encerrar Weekly**: `isAdmin`
- Carry-over: lê última weekly completa via `useLastCompletedSession('weekly')` e exibe subseção em `WeeklyPrioritiesStep`

### Padrões canônicos respeitados (checklist)

- BU isolation: `useBuScopedSupabase` + `.eq('bu_id', currentBuId)` em toda query
- Identity: `useIdentity().realProfileId` em mutations
- Soft delete: `.is('deleted_at', null)` ao listar Pré-Weeklies
- Query optimization: select com colunas explícitas (sem `select('*')`)
- Query keys: prefixos via helpers (`weeklyAggregationListPrefix`)
- Memoization: `React.memo` em cards de tema/sinal
- AI: `tryParseAiJson` + `toText` (`ai-data-normalization`)
- Wizard scaffold: `WizardStepScaffold` com `min-h-0 overflow-hidden` (footer-visibility-fix)
- Inline decisions: `InlineDecisionInput` em todos os steps ativos (closing usa `suppressInlineDecisions`)
- Confirm dialog no closing (`ritual-conclusion-confirmation`)
- Snapshot imutável via `clearDraft()` (já garantido)

### Fora de escopo (próximas ondas)

- Trigger T-2h automático (cron)
- Notificações T-2h e T-30min por e-mail
- Tabela dedicada `ritual_feedback` (auditoria de centralização ainda em aberto; feedback continua em `closing.feedback` JSONB se vier)
- Reaplicação retroativa do `PreparationStatusCard` aos 6 ritos pendentes
- MBR/QBR consumindo `curador-orquestrador`

### Critério de aceite

- `/rituals/weekly` abre e renderiza os 4 steps da v2
- Step 1 mostra cobertura real dos Pré-Weekly da semana via `PreparationStatusCard`
- "Gerar rascunho" invoca `curador-orquestrador` e popula as 5 seções da Abertura Executiva
- Fallback manual funciona com `ia_enabled=false` ou erro do gateway
- Step 3 (Pessoas) renderiza Canal 2 mesmo quando nenhum líder priorizou Pessoas
- Encerramento congela snapshot e devolve para `/rituals`
- Zero novas tabelas; zero novos agentes; zero violações dos canon docs

