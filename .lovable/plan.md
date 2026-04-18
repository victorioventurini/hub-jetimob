

## Pré-checklist canônico ✅

Consultei TCR, DEVELOPMENT_STANDARDS, IDENTITY_CONVENTION e DATA_MODEL_REGISTRY. O problema é puramente de snapshot: os 7 componentes em `src/modules/analysis/components/result/` existem no dev-server mas **não estão no snapshot persistido** que o `vite build` (publish) usa.

## Diagnóstico

`AnalysisResultPage.tsx` importa 7 componentes de `../components/result/`:
- `ResultHeader`, `SourcesChips`, `KeyMetricsGrid`, `InsightBlock`, `AnalysisBody`, `SuggestedActions`, `AnalysisCommentList`

O publish falha em `KeyMetricsGrid` (e cascata nos demais). Reescritas anteriores via `code--write` não persistiram no snapshot — provavelmente por falha silenciosa de gravação ou rollback parcial.

## Plano

**Reescrever os 7 componentes** com `code--write` em sequência (não em paralelo, para garantir gravação atômica de cada um). Conteúdo idêntico ao já em disco — preserva UX, apenas força entrada no snapshot.

Arquivos a (re)criar:
1. `src/modules/analysis/components/result/ResultHeader.tsx`
2. `src/modules/analysis/components/result/SourcesChips.tsx`
3. `src/modules/analysis/components/result/KeyMetricsGrid.tsx`
4. `src/modules/analysis/components/result/InsightBlock.tsx`
5. `src/modules/analysis/components/result/AnalysisBody.tsx`
6. `src/modules/analysis/components/result/SuggestedActions.tsx`
7. `src/modules/analysis/components/result/AnalysisCommentList.tsx`

## Padrões aplicados (regras inquebráveis)

- ✅ `React.memo` em todos (regra #7 memoização)
- ✅ `toText` para strings da IA (anti React #31)
- ✅ Sem `select('*')` (já garantido nos hooks consumidos)
- ✅ Tokens semânticos Tailwind (`text-foreground`, `bg-card`, `text-muted-foreground`)
- ✅ Tipos do `types/index.ts` existente
- ✅ BU-scope respeitado pelos hooks (`useAnalysisComments` já usa `useBuScopedSupabase`)

## Validação

Após reescrita, rodar `vite build` (modo produção, igual ao publish) para confirmar que o snapshot agora resolve os 7 imports antes de o usuário tentar publicar de novo.

## Validação adicional

Verificar via `git ls-files src/modules/analysis/components/result/` se os arquivos passam a constar no snapshot rastreado após a gravação.

