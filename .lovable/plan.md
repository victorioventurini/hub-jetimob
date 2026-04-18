

## Pré-checklist canônico ✅

Consultei TCR v3.25.1, DEVELOPMENT_STANDARDS v1.29.0, IDENTITY_CONVENTION, PERMISSIONS_AND_RBAC_MODEL, BU_SCOPED_SUPABASE_RULES v4.1.0 e DATA_MODEL_REGISTRY (tabela `analysis_templates`). Verifiquei que o backend (RLS + permissions) já existe e que o frontend é somente leitura.

## Diagnóstico do erro de build

`AnalysisResultPage.tsx` importa de `../components/result/ResultHeader` (e outros 6 sub-componentes do diretório `result/`). Mensagens anteriores afirmaram que esses arquivos existiam, mas o build prova o contrário: **eles não estão no filesystem**. Antes de qualquer feature nova, preciso restaurar esses componentes — caso contrário o app não compila.

## Plano consolidado (2 frentes)

### Frente 1 — Desbloquear o build (prioridade máxima)

Recriar os 7 componentes ausentes em `src/modules/analysis/components/result/`:

1. **`ResultHeader.tsx`** — título do relatório + botão "Compartilhar" (abre `ShareDialog`)
2. **`SourcesChips.tsx`** — chips com módulos/contagens de `report.sources`
3. **`KeyMetricsGrid.tsx`** — grid de cards para `report.result.key_metrics`
4. **`InsightBlock.tsx`** — bloco visual por insight (cores por `type`)
5. **`AnalysisBody.tsx`** — render de `report.result.body` (markdown leve via `toText`)
6. **`SuggestedActions.tsx`** — lista de ações sugeridas com badges de impacto
7. **`AnalysisCommentList.tsx`** — lista de comentários + input (usa `useAnalysisComments`)

Padrões aplicados:
- `React.memo` (regra inquebrável #7)
- `toText` para qualquer string vinda da IA (anti React #31)
- Sem `select('*')`; tipos do `types/index.ts` já existente
- Tailwind tokens semânticos (`text-foreground`, `bg-card`)

### Frente 2 — CRUD de templates da BU (após build passar)

1. **Hook `useAnalysisTemplateMutations.ts`**
   - `useCreateTemplate` (INSERT scope='bu', `bu_id`, `created_by=realProfileId`)
   - `useUpdateTemplate` (UPDATE por id; só BU)
   - `useDeleteTemplate` (soft delete `deleted_at`)
   - Invalidação via `analysisKeys.templatesPrefix()`

2. **`TemplateFormDialog.tsx`** — campos: nome, categoria, premissa, módulos default (`ModulesChips`), profundidade, modo, ordem. `defaults` consolidado em jsonb.

3. **Refatorar `AnalysisTemplatesPage.tsx`**
   - Botão "Novo template" gated por `useHasPermission('analysis.template.manage:bu')`
   - Menu Editar/Excluir só em cards `scope='bu'`
   - Badge "Global" vs "BU"
   - `ConfirmDialog` para exclusão

### Conformidade
- ✅ BU isolation: `useBuScopedSupabase` + `bu_id` explícito
- ✅ Identity: `realProfileId` em mutações (RLS 42501)
- ✅ Soft delete + filtros `deleted_at IS NULL`
- ✅ Query keys via `analysisKeys`
- ✅ RBAC por permission key (sem hardcode)
- ✅ Sem `select('*')`

### Ordem de execução
Frente 1 primeiro (sem ela o app não builda). Frente 2 logo em seguida no mesmo turno.

