## Ordem de execução

### 1. QA assistido (end-to-end)
- Rodar `supabase--read_query` para localizar (ou criar via seeds mínimas) uma BU de teste, um form draft e um run em aberto.
- Validar no SQL:
  - `INSERT` de 1 questão de cada tipo (`short_text`, `long_text`, `single_choice`, `multiple_choice`, `scale`) com `options`/`scoring` válidos → validation trigger aceita.
  - `INSERT` inválido (ex.: `single_choice` sem `options`) → trigger rejeita.
  - Simular `rpc_assessment_run_submit` num run de teste e conferir `auto_score`, `objective_score`, `graded_at` populados.
- Documentar o resultado em `docs/qa/QA_ASSESSMENTS_QUESTION_TYPES.md` (criar) com cenários e SQL usado.
- UI funcional (criar form → publicar → responder em `/q/:token` → ver score no `RunDetailPage`) fica como checklist manual no doc; não há como simular cliques sem o usuário.

### 2. Master de memória + saneamento do index
- Criar `mem://features/assessments/assessments-master-standard` consolidando: tabelas reais, tipos de questão, formato de `options`/`scoring`, RPC `rpc_assessment_run_grade`, validation trigger, anti-cheat universal, permissões (`form.update:bu` cobre gabarito), `category.manage:bu`.
- Atualizar `mem://index.md`: substituir a entrada órfã `Assessments Categories` pela nova entrada `Assessments Master` (a regra de categorias entra como seção dentro do Master, sem perder rastreabilidade).

### 3. Linter Supabase
- Rodar `supabase--linter` após a migration que adicionou enum value + colunas + trigger + RPC `rpc_assessment_run_grade`.
- Corrigir tudo que for relacionado à migration (provavelmente `search_path` na nova função, se faltou). Reportar warnings não relacionados sem mexer.

### 4. Gate de permissão no editor
- Em `FormEditorPage.tsx`, ler `useHasPermission('assessments.form.update:bu')` (ou o hook equivalente já usado no módulo).
- Se o usuário não tiver a key:
  - Esconder/desabilitar a seção de **scoring** (toggle "tem gabarito", `points`, marcação de corretas, `target/tolerance`).
  - Manter visualização das questões (já protegida por `form.view:bu`).
- Não tocar em outras permissões já existentes.

## Arquivos esperados
```text
docs/qa/QA_ASSESSMENTS_QUESTION_TYPES.md           (novo)
mem://features/assessments/assessments-master-standard  (novo)
mem://index.md                                      (entrada substituída)
src/modules/assessments/pages/FormEditorPage.tsx    (gate de permissão)
supabase/migrations/<ts>_*.sql                      (apenas se linter exigir fix)
```

## Critérios de pronto
- QA doc com SQL reproduzível e resultados esperados anotados.
- Master criado e index sem referência órfã.
- Linter sem warnings novos atribuíveis à migration.
- Editor esconde scoring para perfis sem `form.update:bu` (verificado via leitura de código + nota no QA doc).