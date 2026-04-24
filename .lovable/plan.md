# Plano: Corrigir React #310 ao abrir milestones

## Pré-checklist (TCR + Canônicos) — ✅ Executado

- ✅ **TECHNICAL_CONTEXT_REGISTRY.md** — confirmado padrão de componentes funcionais e Rules of Hooks como pré-requisito implícito do React 18.
- ✅ **DEVELOPMENT_STANDARDS.md** — `React.memo` mandatório em listas (mem://standards/frontend-memoization-standard); hooks devem ser estáveis.
- ✅ **mem://features/projects/holistic-module-architecture-v2** — `MilestoneKrLinkSection` faz parte do módulo Projects v1.4.
- ✅ **HOOKS_BARREL_STANDARD.md** — imports internos do mesmo módulo via path relativo (já em conformidade no arquivo).
- ✅ **Code review** — confirmada violação real: `useMemo` (linhas 89 e 102) executados **após** early-return `if (isLoading)` (linha 83). Isso causa **mudança no número de hooks** entre renders → React #310.
- ✅ Verificado que `linkedIds` (Set) na linha 88 é recriado a cada render, tornando `krs.length` na deps array uma proxy frágil.

## Diagnóstico Técnico (raiz)

**Arquivo:** `src/modules/projects/components/MilestoneKrLinkSection.tsx`

```ts
// Linha 73-85: hooks executados (4 hooks: 2 queries + 2 mutations + 4 useState = 8 hooks)
if (isLoading) return <Skeleton />;  // ⚠️ early return

// Linhas 89, 102: 2 useMemo executados APENAS quando !isLoading
const filteredKrs = useMemo(...);    // hook #9
const grouped = useMemo(...);        // hook #10
```

**Cenário de quebra:**
1. Primeiro render: `isLoading=true` → 8 hooks executados.
2. Query resolve → `isLoading=false` → 10 hooks executados.
3. React detecta mismatch → **error #310 ("Rendered more hooks than during the previous render")**.

## Plano de Correção

### 1. Refatorar `MilestoneKrLinkSection.tsx`
- Mover **todos os hooks** (incluindo `useMemo`) para **antes** do early-return `if (isLoading)`.
- Substituir `krs.length` por `linkedIdsKey` (string estável de IDs) na deps array de `useMemo`, removendo o `eslint-disable`.
- Manter ordem de hooks idêntica em todos os caminhos de render.

```ts
export function MilestoneKrLinkSection({ milestoneId, projectId, canEdit }: Props) {
  // 1. Todos os hooks no topo
  const { data: linkedKrs, isLoading } = useMilestoneKrs(milestoneId);
  const { data: availableKrs = [], isLoading: loadingKrs } = useKrsForLinking();
  const addLink = useAddMilestoneKrLink();
  const removeLink = useRemoveMilestoneKrLink();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<KrForLinking | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ProjectImpact>('medium');

  const krs = linkedKrs ?? [];
  const linkedIdsKey = krs.map((k) => k.key_result_id).sort().join(',');

  const filteredKrs = useMemo(() => {
    const q = search.toLowerCase().trim();
    const linkedSet = new Set(linkedIdsKey ? linkedIdsKey.split(',') : []);
    return availableKrs.filter(
      (kr) => !linkedSet.has(kr.id) &&
        (q === '' ||
          kr.title.toLowerCase().includes(q) ||
          (kr.objective_title?.toLowerCase().includes(q) ?? false) ||
          (kr.team_name?.toLowerCase().includes(q) ?? false)),
    );
  }, [availableKrs, search, linkedIdsKey]);

  const grouped = useMemo(() => groupByObjective(filteredKrs), [filteredKrs]);

  // 2. Early returns DEPOIS de todos os hooks
  if (isLoading) return <Skeleton className="h-8 w-full" />;

  // 3. Restante do JSX inalterado
}
```

### 2. Auditoria preventiva (módulo Projects)
- Rodar `rg "if \(.*isLoading.*\)\s*\{?\s*return" src/modules/projects/components/` para identificar outros componentes com early-return seguido de hooks.
- Corrigir caso a caso (mesmo padrão).

### 3. Padronização canônica
- Criar `.lovable/memory/standards/frontend-rules-of-hooks.md`:
  - Regra: **todos os hooks (incluindo `useMemo`/`useCallback`) DEVEM preceder qualquer early-return condicional**.
  - Justificativa: Rules of Hooks do React + prevenção de erros #310/#321 em produção.
  - Pattern recomendado: estados de loading/empty renderizados no JSX final, não como early-return antes de hooks.
- Atualizar `.lovable/memory/index.md` adicionando entrada em **Core**: "Hooks: todos antes de early-returns. Ver mem://standards/frontend-rules-of-hooks."

### 4. Validação pós-fix
- Verificar que abrir/fechar milestone não dispara mais React #310.
- Confirmar que badge de contagem (`KRs vinculadas (N)`) atualiza corretamente após adicionar/remover.

## Arquivos a Modificar
- ✏️ `src/modules/projects/components/MilestoneKrLinkSection.tsx` (refactor hooks)
- ➕ `.lovable/memory/standards/frontend-rules-of-hooks.md` (novo SSOT)
- ✏️ `.lovable/memory/index.md` (adicionar Core rule + entry)
- ✏️ Eventuais componentes detectados na auditoria preventiva (se houver)

## Riscos e Mitigações
- **Risco:** Recálculo de `linkedIdsKey` a cada render. **Mitigação:** operação O(n) trivial; n ≤ 20 KRs/milestone na prática.
- **Risco:** Auditoria pode detectar outros componentes. **Mitigação:** correções são triviais (mesmo padrão); se >3, escalar em PR separado.

## Conformidade Final
- ✅ Rules of Hooks (React)
- ✅ TCR — Frontend Memoization Standard
- ✅ HOOKS_BARREL_STANDARD (imports já corretos)
- ✅ Sem `select('*')`, sem hardcode de roles, sem violação BU
