
## Pré-checklist (executado)

- ✅ `TECHNICAL_CONTEXT_REGISTRY` (via memória `mem://features/projects/holistic-module-architecture-v2`)
- ✅ `mem://features/projects/kr-linking-standard` — schema XOR `key_result_id`/`org_key_result_id`, mutations recebem `impact`, default `medium`
- ✅ `mem://standards/database/check-constraint-prohibition` — coluna `impact` é ENUM com default, sem CHECK time-based; remoção de UI é segura
- ✅ Inspeção do código: 3 componentes envolvidos + 2 hooks + tipos
- ✅ DB: `project_krs.impact` e `milestone_krs.impact` são `NOT NULL DEFAULT 'medium'` — não requer migration

## Diagnóstico

O campo `impact` (alto/médio/baixo) aparece em 3 superfícies:

1. **`ProjectKrLinkSection.tsx`** — popover de vínculo de KR ao Projeto: `<Select>` (linhas 192-200) + chip colorido na lista de KRs já vinculadas (linhas 234-236)
2. **`MilestoneKrLinkSection.tsx`** — popover de vínculo de KR ao Marco: `<Select>` (linhas 222-230) + chip colorido (linhas 264-266)
3. **`ProjectsForKrSection.tsx`** — visão inversa (na página do KR, lista de projetos vinculados): chip colorido (linhas 247-249). Sem seletor — já envia `'medium'` fixo na linha 83.

Mutations (`useAddProjectKrLink`, `useAddMilestoneKrLink`) **continuam recebendo `impact`** porque a coluna é `NOT NULL`. Vamos passar `'medium'` fixo em todos os call sites.

## Plano de execução

### 1. `src/modules/projects/components/ProjectKrLinkSection.tsx`

- Remover `IMPACT_LABELS` e `IMPACT_COLORS` (linhas 28-39).
- Remover `useState<ProjectImpact>('medium')` para `selectedImpact` (linha 76) e seu reset (linha 104).
- Remover o `<Select>` de impacto inteiro do popover (linhas ~190-201) — manter apenas KR selecionado + botão "Vincular".
- Substituir chamada `addLink.mutate({ ..., impact: selectedImpact })` por `impact: 'medium'`.
- Remover chip de impacto na lista de KRs vinculadas (linhas 234-236) — manter apenas título do KR + badge de origem (Time/Org) + botão remover.
- Limpar import `ProjectImpact` se não for mais usado; manter `KrLinkKind`.
- Remover import `Select*` se não usado em outro lugar do arquivo.

### 2. `src/modules/projects/components/MilestoneKrLinkSection.tsx`

- Mesmo tratamento: remover `IMPACT_LABELS`/`IMPACT_COLORS`, `selectedImpact` state, `<Select>` (linhas 222-230) e chip (linhas 264-266).
- `addLink.mutate({ ..., impact: selectedImpact })` → `impact: 'medium'`.
- **Atenção:** preservar a regra de hooks (`mem://standards/frontend-rules-of-hooks`) — não introduzir early-return entre hooks ao remover linhas.

### 3. `src/modules/projects/components/ProjectsForKrSection.tsx`

- Remover `impactLabel` e `IMPACT_COLORS` (linhas 37-47).
- Remover chip de impacto na linha 247-249.
- Mutation já passa `'medium'` fixo — sem alteração.

### 4. Documentação canônica

Atualizar `mem://features/projects/kr-linking-standard`:
- Remover menção a `impact` como decisão do usuário.
- Adicionar nota: "Coluna `impact` mantida no schema com default `'medium'` por compatibilidade; **não é exposta na UI**. Se reintroduzir no futuro, usar default sem bloquear vínculo."
- Atualizar contrato de mutation: `{ kr_id, kind }` (impact passa a ser detalhe interno).

### 5. NÃO mexer

- **Schema/DB**: nenhuma migration. Coluna fica como está com default.
- **Tipos `ProjectImpact`**: mantém em `types.ts` (ainda usado por `ProjectWithRelations.krs[].impact` em queries — remover quebraria o select). Pode ficar como vestigial.
- **Hooks de mutation**: continuam aceitando `impact` (compat). Apenas os call sites passam `'medium'` fixo.

## Arquivos modificados

- `src/modules/projects/components/ProjectKrLinkSection.tsx`
- `src/modules/projects/components/MilestoneKrLinkSection.tsx`
- `src/modules/projects/components/ProjectsForKrSection.tsx`
- `.lovable/memory/features/projects/kr-linking-standard.md`

## Riscos

- **Nenhum risco de dados**: registros existentes mantêm seu `impact` atual (que ninguém mais vê).
- **Regra de hooks**: ao deletar linhas com hooks, manter ordem; já validado nos arquivos atuais que hooks ficam acima do early-return.
- **Tipos órfãos**: `ProjectImpact` permanece exportado — não quebra nada.

## Validação pós-execução

1. Vincular KR a um projeto → popover sem seletor de impacto → chip mostra apenas Time/Org.
2. Vincular KR a um marco → idem.
3. Página do KR → projetos vinculados sem chip Alto/Médio/Baixo.
4. `npm run build` sem erros TS.
