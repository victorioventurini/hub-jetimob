# Padronizar tooltip da coluna KRs (ProjectsTable) usando `EntityNamesCell`

A coluna **Times** já usa o componente canônico `EntityNamesCell` (`src/components/ui/entity-names-cell.tsx`), que entrega o tooltip padrão do projeto (Radix Tooltip, agrupado por tipo, com ícone, label e lista). A coluna **KRs** hoje usa um `title` HTML nativo + chips ad-hoc — destoa do padrão.

A correção promove `EntityNamesCell` ao SSOT canônico para listas com tooltip de overflow e adiciona suporte nativo a KRs, eliminando qualquer "tooltip alternativo".

## Mudanças

### 1. `src/components/ui/entity-names-cell.tsx` — estender SSOT
- Importar `KeyRound` de `lucide-react`.
- Adicionar nova prop opcional `krNames?: string[]`.
- Incluir KRs no array `allItems` com `<KeyRound className="h-3 w-3 mr-1 shrink-0" />`.
- Adicionar grupo "KRs" (`label: "KRs"`, ícone `KeyRound`) na construção do tooltip, junto a Usuários/Times/Squads.
- Reforçar o JSDoc do topo declarando este componente como **padrão canônico** para qualquer célula com lista truncada + tooltip; novos casos devem estendê-lo aqui (não criar tooltips paralelos).

### 2. `src/modules/projects/components/ProjectsTable.tsx` — coluna KRs
- Substituir o bloco atual da célula KRs (chips com `title=` + `flex-wrap`) por:
  ```tsx
  <EntityNamesCell
    krNames={project.krs.map((k) => k.kr_title)}
    maxVisible={2}
    variant="outline"
    emptyText="—"
  />
  ```
- Manter `whitespace-nowrap text-right` no `TableCell`; ajustar alinhamento do conteúdo via wrapper `flex justify-end` se necessário (o componente já usa `flex flex-wrap gap-1` interno, equivalente ao da coluna Times).

### 3. Documentação canônica — fixar a regra "todos os locais"
- **`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`**: adicionar entrada na seção de UI/Componentes Canônicos declarando `EntityNamesCell` como SSOT obrigatório para tooltip de listas com overflow (Times, Usuários, Squads, KRs e futuros tipos). Bump `TCR_VERSION` para `3.30.0` em `supabase/functions/_shared/tcr/index.ts`.
- **Memória nova `mem://standards/ui/entity-names-cell-tooltip-standard`**: descreve obrigatoriedade do componente, props suportadas, padrão de extensão (adicionar nova prop + grupo no próprio SSOT, nunca criar tooltip alternativo).
- **`mem://index.md`**: adicionar referência à nova memória na seção "Memories — UI específicos".

## Canônicos respeitados
- Reaproveita componente existente em vez de criar novo (princípio AI Agents/Wizards: "reutilizar antes de criar").
- Sem mudanças de RLS, BU isolation, query keys ou permissões.
- Sem novas dependências.

## Fora de escopo
- Auditoria global de outros tooltips (`title=`, `Tooltip` ad-hoc) em outras telas — fica registrado na memória como dívida a ser endereçada sob demanda; não migramos preventivamente para evitar regressões fora do contexto pedido.
