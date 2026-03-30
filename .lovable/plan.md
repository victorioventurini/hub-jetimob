

# Fix: Scroll do mouse na lista de times (MultiTeamSelect dentro de Dialog)

## Validação

- **TCR / DEVELOPMENT_STANDARDS**: Componente segue padrão canônico de selects (`src/components/selects/`). Alteração não afeta modelo de dados, RLS, ou identidade.
- **Causa raiz**: Radix UI `Popover` dentro de `Dialog` modal — o overlay captura eventos `wheel`, impedindo scroll no `ScrollArea`.

## Alteração

**Arquivo:** `src/components/selects/MultiTeamSelect.tsx` — linha 63

```tsx
// De:
<Popover open={open} onOpenChange={setOpen}>

// Para:
<Popover open={open} onOpenChange={setOpen} modal={false}>
```

1 linha alterada. Sem efeitos colaterais — o componente já gerencia abertura/fechamento via state próprio.

