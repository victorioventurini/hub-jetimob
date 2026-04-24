---
name: Rules of Hooks — Hooks antes de early-returns
description: Todos os hooks (incluindo useMemo/useCallback/useEffect) devem preceder qualquer early-return condicional, prevenindo React #310 em produção
type: preference
---

**Regra inquebrável:** em todo componente React do Hub, **TODOS os hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useQuery`, `useMutation`, hooks customizados) DEVEM ser chamados ANTES de qualquer `return` condicional**.

**Por quê:**
- React rastreia hooks por **ordem de chamada** entre renders.
- Se um early-return (`if (isLoading) return <Skeleton/>`) for colocado entre hooks, a contagem muda entre renders.
- Em produção, isso dispara **React #310** ("Rendered more/fewer hooks than during the previous render"), que vem minificado e é difícil de debugar.

**Pattern correto:**
```tsx
function MyComponent({ id }: Props) {
  // ✅ TODOS os hooks no topo
  const { data, isLoading } = useMyQuery(id);
  const [state, setState] = useState('');
  const derived = useMemo(() => compute(data), [data]);
  useEffect(() => { /* ... */ }, [data]);

  // ✅ Early returns DEPOIS dos hooks
  if (isLoading) return <Skeleton />;
  if (!data) return <EmptyState />;

  return <div>{derived}</div>;
}
```

**Anti-pattern (PROIBIDO):**
```tsx
function MyComponent({ id }: Props) {
  const { data, isLoading } = useMyQuery(id);

  if (isLoading) return <Skeleton />;  // ⛔ early return antes de outros hooks

  const derived = useMemo(() => compute(data), [data]);  // ⛔ React #310 garantido
  return <div>{derived}</div>;
}
```

**Como aplicar:**
- Em listas/seções com loading state (KR sections, comments, attachments, etc.), renderize o `<Skeleton/>` no JSX final ou imediatamente após o último hook.
- Para deps array de `useMemo`/`useCallback` que dependem de coleções, prefira chaves estáveis (ex: `ids.sort().join(',')`) em vez de `length` — `length` é um proxy frágil que mascara mudanças de identidade.
- Nunca use `eslint-disable react-hooks/exhaustive-deps` para esconder esse problema. Reescreva a deps array.

**Histórico:**
- 2026-04-24 — Reportado por uriel.canfield ao expandir milestones; raiz: `MilestoneKrLinkSection` tinha 2 `useMemo` após `if (isLoading) return`. Corrigido movendo hooks para topo + substituindo `krs.length` por `linkedIdsKey` estável.
