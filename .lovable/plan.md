
# Plano: Correção do Hover dos Badges

## Resumo Executivo

Corrigir o problema de legibilidade dos badges quando em hover, onde o fundo fica preto dificultando a leitura do texto. A solução remove os estilos de hover padrão do componente base `Badge`, já que badges são indicadores visuais estáticos e não elementos interativos.

---

## Diagnóstico do Problema

### Causa Raiz

O componente base `Badge` (`src/components/ui/badge.tsx`) define estilos de hover nas variantes:

```typescript
variants: {
  variant: {
    default: "... hover:bg-primary/80",      // hover escurece
    secondary: "... hover:bg-secondary/80",  // hover escurece
    destructive: "... hover:bg-destructive/80",
    outline: "text-foreground",  // sem hover (correto)
  },
}
```

Quando um badge usa `variant="secondary"` com classes customizadas de background (ex: `bg-info-muted`), o hover padrão `hover:bg-secondary/80` ainda é aplicado, resultando em:
- Fundo escuro (secondary é azul-cinza no tema)
- Texto ilegível (contraste insuficiente)

### Componentes Afetados

1. **Badge base** - todas as variantes exceto `outline`
2. **InitiativeStatusBadge** - usa `variant="secondary"` + cores customizadas
3. **Qualquer badge** que usa variantes `default`, `secondary` ou `destructive` com cores sobrescritas

---

## Solução Proposta

### Princípio

**Badges são indicadores visuais, não botões.** Não devem ter estados de hover que alterem sua aparência de forma significativa.

### Mudanças

**1. Atualizar `src/components/ui/badge.tsx`**

Remover `hover:bg-*` de todas as variantes. Opcionalmente, adicionar um efeito de hover sutil que não altere cores:

| Variante | Antes | Depois |
|----------|-------|--------|
| default | `hover:bg-primary/80` | (removido) |
| secondary | `hover:bg-secondary/80` | (removido) |
| destructive | `hover:bg-destructive/80` | (removido) |
| outline | (sem hover) | (mantido) |

**2. Atualizar documentação**

Adicionar comentário JSDoc explicando o padrão de badges sem hover.

**3. Verificar Storybook**

Confirmar que os stories do StatusBadge refletem o comportamento correto.

---

## Implementação Técnica

### Arquivo: `src/components/ui/badge.tsx`

```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Removido hover:bg-* de todas as variantes
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/ui/badge.tsx` | **Editar** | Remover `hover:bg-*` de variantes default, secondary, destructive |

---

## Conformidade com Padrões do Hub

| Padrão | Status |
|--------|--------|
| Tokens semânticos de cores | N/A - remove hover, não altera cores |
| Não duplicar componentes | Edita apenas o componente base |
| Design System consistente | Alinha comportamento com princípio de badges como indicadores |

---

## Impacto

### Positivo
- Legibilidade garantida em todos os badges
- Comportamento consistente em todo o sistema
- Padrão claro para futuros desenvolvedores

### Risco
- Nenhum - badges não são elementos clicáveis, hover visual não é esperado

---

## Alternativas Consideradas

1. **Adicionar `hover:bg-inherit` em cada uso** - Rejeitado: solução pontual, não resolve o problema na origem
2. **Criar variante `static`** - Rejeitado: adiciona complexidade desnecessária
3. **Remover hover do base** - **Escolhida**: solução simples e definitiva
