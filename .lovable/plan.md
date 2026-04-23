
## Corrigir o incidente de arquivamento em Projetos no ambiente live — o código atual já está correto, mas o domínio customizado está servindo bundle antigo

### Pré-checklist obrigatório executado
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `docs/canonical/IDENTITY_CONVENTION.md`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/DATA_MODEL_REGISTRY.md`
- `docs/canonical/DEVELOPMENT_STANDARDS.md`
- `docs/canonical/BU_SCOPED_SUPABASE_RULES.md`
- `docs/canonical/QUERY_KEYS_STANDARD.md`
- `docs/canonical/SCHEMA_QUICK_REFERENCE.md`
- `docs/canonical/DB_FUNCTIONS_INDEX.md`
- `docs/qa/QA_PERMISSIONS_TEMPLATES.md`
- memórias: `mem://features/projects/holistic-module-architecture-v2`, `mem://index.md`

### Diagnóstico consolidado
O problema reportado em `https://hub.jetimob.com/projects/98074a55-c388-4282-a093-f0eaa3bf1b22` indica **divergência entre o código atual e o bundle que está rodando no domínio customizado**.

### Evidência objetiva
No código atual:
- `ProjectDetailPage.tsx` já usa `canDeleteProjectRecord(project.owner_id, writerProfileId)`
- `useProjectPermissionsV2.ts` já faz gating row-aware para `self_or_owner`
- `useProjectMutations.ts` já exibe:
```ts
'Você não tem permissão para arquivar este projeto.'
```

Mas o usuário reportou o toast:
```text
"Você não permissão para arquivar esse projeto."
```

Essa string **não existe no código atual**. Portanto, o comportamento observado não está vindo do código que hoje está no repositório; está vindo de **bundle antigo em produção/custom domain**.

### Leitura canônica da regra de negócio
Pelo TCR + docs + migrations:
- `projects.owner_id` referencia `profiles.id`
- RLS de `projects_update`/`projects_delete` permite arquivar apenas quando o ator é:
  - owner do projeto
  - admin da BU
  - líder hierárquico do owner
- A UI deve refletir isso; o banco não deve ser afrouxado

Logo, **não há nova evidência para mexer em RLS**. O banco continua sendo a fonte correta de autorização.

## Plano de ação

### 1. Alinhar o ambiente live com o código atual
Publicar/promover a versão atual para o ambiente que atende `hub.jetimob.com`, porque o domínio customizado está claramente servindo um build anterior ao hotfix row-aware.

Objetivo:
- fazer o live usar o mesmo `ProjectDetailPage` e o mesmo `useProjectPermissionsV2` que já estão no código atual
- eliminar o bundle antigo que ainda expõe a ação indevida e o toast com texto desatualizado

### 2. Adicionar defesa em profundidade no detalhe do projeto
Mesmo com o botão oculto, endurecer o fluxo do detalhe para impedir chamada indevida em qualquer cenário de bundle stale, hydration antiga ou estado residual:

- Em `ProjectDetailPage.tsx`:
  - antes de `deleteProject.mutate(project.id)`, revalidar `canDeleteThisProject`
  - se `false`, fechar o dialog e abortar a mutation
- Condicionar também o `AlertDialogAction` ao mesmo guard lógico
- Opcionalmente resetar `deleteOpen` quando `project.owner_id`/`writerProfileId` mudarem e a permissão deixar de existir

Isso evita que UI antiga ou estado órfão ainda disparem o update que o RLS vai negar.

### 3. Atualizar os testes do detalhe para o contrato atual
Os testes atuais de `ProjectDetailPage` ainda mockam a versão antiga do hook e não cobrem o fluxo row-aware real.

Ajustar:
- `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`
  - mockar `canEditProjectRecord` e `canDeleteProjectRecord`
  - caso não-owner: botão de arquivar não aparece
  - caso não-owner com tentativa indevida: mutation **não é chamada**
  - caso owner/admin: botão aparece e mutation é chamada
- manter os testes de `useProjectPermissionsV2` como SSOT semântica do gating por owner

### 4. Fazer uma auditoria rápida das superfícies de arquivamento
Revisar se existe outro ponto do módulo Projects que ainda permita arquivar via permissão estrutural antiga ou callback legado.

Escopo mínimo:
- `ProjectDetailPage.tsx`
- chamadas de `useSoftDeleteProject`
- qualquer menu/ação inline futura em Projects

Hoje a busca aponta o detalhe como principal ponto; a auditoria garante que não ficou nenhum caminho paralelo.

### 5. Preservar RLS e evitar novas mudanças de banco
Não alterar:
- `projects_update`
- `projects_delete`
- `current_bu_id()`
- triggers de BU
- schema/tabelas

Justificativa:
- o código atual já confirma que o incidente deixou de ser “RLS errada”
- o sintoma reportado agora é coerente com **bundle live antigo + necessidade de guard extra na UI**

## Validação pós-correção
1. Em `hub.jetimob.com`, o toast deve mudar para o texto atual do código (ou idealmente nem aparecer para usuário sem permissão, porque o CTA some).
2. Usuário sem ownership/admin/liderança:
   - não vê botão de arquivar
   - mesmo tentando forçar ação, a mutation não dispara pelo detalhe
3. Owner/admin/líder autorizado:
   - consegue abrir o dialog
   - arquivamento funciona normalmente
4. Preview e custom domain passam a apresentar o mesmo comportamento
5. Regressão coberta por teste de página

## Arquivos a ajustar
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`
- possivelmente nenhum outro arquivo funcional além da publicação/promote do build live

## Resultado esperado
- o domínio `hub.jetimob.com` passa a executar o hotfix row-aware já existente
- usuários não autorizados deixam de receber esse toast ao clicar em um CTA que não deveria existir
- o banco continua íntegro e sem flexibilização indevida de segurança
