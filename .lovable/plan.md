
## Corrigir definitivamente o incidente de arquivamento em Projetos no live

### Pré-checklist obrigatório executado
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `docs/canonical/IDENTITY_CONVENTION.md`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/DATA_MODEL_REGISTRY.md`
- `docs/canonical/DEVELOPMENT_STANDARDS.md`
- `docs/canonical/RBAC_TEMPLATES_V3.md`
- `docs/qa/QA_PERMISSIONS_TEMPLATES.md`
- memória: `mem://features/projects/holistic-module-architecture-v2`
- memória: `mem://standards/query-key-prefix-standard`
- memória: `mem://standards/soft-delete-policy-v1`

### Releitura do problema
O problema real não é “RLS errada”. O problema é: um usuário sem permissão de exclusão/arquivamento está conseguindo chegar a um fluxo de arquivamento no ambiente live, e o toast exibido não bate com o código atual do repositório.

### Do I know what the issue is?
Sim.

### O que a documentação canônica confirma
- `projects.owner_id` referencia `profiles.id`, não `auth.users.id`.
- O template `projects_manager` pode criar/editar projetos e milestones, mas **não pode excluir/arquivar** projetos.
- A key de exclusão do módulo é `projects.project.delete:self_or_owner`.
- Portanto:
  - `projects_manager` não deve ver CTA de arquivar.
  - `projects_admin`/admin BU/wildcard podem arquivar.
  - owner só pode arquivar se efetivamente tiver a key de delete compatível.

### Evidência consolidada
- No código atual, o único toast de permissão é:
  - `Você não tem permissão para arquivar este projeto.`
- O toast reportado pelo usuário foi:
  - `Você não permissão para arquivar esse projeto.`
- Essa string **não existe** no codebase pesquisado.
- Logo, há forte evidência de um destes cenários:
  1. bundle antigo/stale no ambiente live;
  2. segundo code path legado ainda não auditado no módulo Projects;
  3. deploy publicado não está refletindo o estado atual do repositório.

## Plano de ação

### 1. Isolar e eliminar qualquer code path legado de arquivamento no módulo Projects
Arquivos-foco:
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- `src/modules/projects/hooks/useProjectPermissionsV2.ts`
- `src/modules/projects/hooks/useProjectMutations.ts`
- demais superfícies do módulo que chamem `useSoftDeleteProject` ou disparem arquivamento

Objetivo:
- garantir que exista **um único fluxo canônico** para arquivar projeto;
- remover qualquer fallback/branch legado que ainda use copy antiga ou gating incorreto.

### 2. Endurecer o gating de UI contra estado de permissão ainda carregando
Hoje o detalhe já usa `canDeleteProjectRecord(...)`, mas o plano é reforçar o contrato:

- bloquear renderização do CTA de arquivar enquanto `useProjectPermissionsV2().isLoading` estiver `true`;
- bloquear também enquanto `useIdentity().isLoading` estiver `true`;
- impedir abertura do dialog até que identidade + permissões estejam resolvidas;
- manter a revalidação dentro de `handleDelete`.

Objetivo:
- evitar falso positivo por race de carregamento;
- alinhar com o padrão canônico: checar loading antes de decidir permissão.

### 3. Tornar o fluxo de erro observável para diferenciar permissão vs bundle stale
Adicionar instrumentação temporária e objetiva nos pontos críticos:

- em `useProjectPermissionsV2`:
  - logar quais keys efetivas chegaram para Projects;
  - logar `isLoading`, `hasFullAccess`, `canDeleteOwnProject`.
- em `ProjectDetailPage`:
  - logar `project.owner_id`, `writerProfileId`, `canDeleteThisProject`;
- em `useSoftDeleteProject`:
  - logar `projectId`, `currentBuId`, `error.code`, `error.message`, `count`.

Objetivo:
- no próximo reporte, identificar com precisão se o live ainda está rodando bundle antigo ou se existe algum branch inesperado.

### 4. Unificar a mensagem de erro e remover qualquer copy divergente
Padronizar o copy de arquivamento em um único ponto do módulo, evitando strings duplicadas.

Regra:
- toast amigável de permissão vem somente do fluxo canônico de `useSoftDeleteProject`;
- nenhum componente de página deve gerar manualmente uma variante textual diferente.

Objetivo:
- se o toast antigo continuar aparecendo depois disso, a evidência de bundle stale fica inequívoca.

### 5. Expandir a cobertura de testes para o cenário exato do incidente
Atualizar/estender testes para cobrir:

- usuário com `projects_manager`:
  - vê editar;
  - **não vê arquivar**;
  - não dispara mutation;
- usuário com permissions ainda carregando:
  - CTA de arquivar não renderiza;
- usuário com `projects_admin` ou wildcard:
  - CTA aparece;
  - mutation dispara;
- owner sem key de delete:
  - não arquiva;
- owner com key `projects.project.delete:self_or_owner`:
  - arquiva normalmente.

Arquivos de teste:
- `src/modules/projects/hooks/__tests__/useProjectPermissionsV2.test.ts`
- `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`

### 6. Validar publicação/live como parte do incidente
Como frontend só vai para produção após atualização publicada, o plano inclui checagem explícita do ambiente live após a implementação:

- publicar a versão atualizada;
- validar comportamento no domínio publicado e no domínio customizado;
- confirmar que o texto exibido é o do código atual;
- se o domínio customizado continuar servindo comportamento antigo, tratar como problema de publicação/distribuição, não de app logic.

## Resultado esperado
- Usuário com `projects_manager` deixa de ver qualquer caminho de arquivamento.
- Usuário sem permissão não consegue abrir dialog nem disparar mutation.
- O único toast possível passa a ser o do fluxo canônico atual.
- Se ainda surgir a copy antiga, ficará comprovado que o ambiente live está servindo bundle desatualizado.
- O módulo Projects permanece aderente ao TCR, RBAC V2, identity convention e BU isolation.

## Arquivos que provavelmente serão ajustados
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- `src/modules/projects/hooks/useProjectPermissionsV2.ts`
- `src/modules/projects/hooks/useProjectMutations.ts`
- `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`
- `src/modules/projects/hooks/__tests__/useProjectPermissionsV2.test.ts`

## Restrições mantidas
- sem alterar RLS de `projects`;
- sem afrouxar segurança;
- sem trocar `profile_id` por `auth.uid()` em colunas de domínio;
- sem duplicar componentes;
- sem criar query keys fora de `src/lib/queryKeys/*`;
- mantendo soft-delete, BU scope e invalidation por prefixo.
