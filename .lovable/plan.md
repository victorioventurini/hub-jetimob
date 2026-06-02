# Corrigir `/analysis` — Edge Function 400 por enum inválido

## Causa raiz
O frontend envia `depth: "quick" | "standard" | "deep"`, mas o enum no Postgres `analysis_depth` é `auto | minimal | standard | full` (a edge function `analysis-generate` também usa esse vocabulário). Resultado: ao gerar um relatório a inserção falha com `invalid input value for enum analysis_depth: "deep"` e o toast mostra "Edge Function returned a non-2xx status code".

Log relevante (`analysis-generate`):
```
Failed to create report: code 22P02, message 'invalid input value for enum analysis_depth: "deep"'
```

## Fix
Alinhar o frontend ao vocabulário canônico do banco/edge (`minimal | standard | full`, com `auto` como default opcional). Sem mudanças no banco nem na edge function.

### Arquivos a editar
1. `src/modules/analysis/types/index.ts`
   - `AnalysisDepth = "auto" | "minimal" | "standard" | "full"`
2. `src/modules/analysis/components/composer/DepthSelector.tsx`
   - Opções: `minimal` (Rápida / Resumo direto), `standard` (Padrão / Equilibrada), `full` (Profunda / Detalhada e comparativa).
3. `src/modules/analysis/components/templates/TemplateFormDialog.tsx`
   - Trocar `<SelectItem value="quick">` → `minimal` e `value="deep"` → `full`. Default `standard` mantido.
4. `src/modules/analysis/pages/AnalysisHomePage.tsx`
   - Garantir default `depth: "standard"` (ou `auto`) consistente.
5. Testes:
   - `src/modules/analysis/types/index.test.ts` e `types.test.ts`: atualizar listas válidas para `["auto","minimal","standard","full"]`.

### Compatibilidade de dados existentes
Templates antigos já salvos com `quick`/`deep` serão coagidos no carregamento para `minimal`/`full` (mapeamento defensivo em `TemplateFormDialog` e no payload de `AnalysisHomePage`).

## Validação
- Abrir `/analysis`, gerar relatório com cada profundidade → deve retornar 2xx.
- Conferir log do `analysis-generate` sem mais `22P02`.
- Editar template existente → depth carregada corretamente.
