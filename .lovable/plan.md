
# Expandir campo de Decisoes por padrao nos steps do Team Check-in

## Pre-checklist

- **TCR v3.8.0**: Consultado. Confirma arquitetura de wizards e componentes shared.
- **WIZARD_DEVELOPMENT_GUIDE v1.0.0**: Consultado. O componente `InlineDecisionInput` ja segue todos os padroes (Shell, Stepper, componentes shared).
- **IDENTITY_CONVENTION / PERMISSIONS**: Nao aplicaveis (sem envolvimento de usuarios/permissoes).
- **DATA_MODEL_REGISTRY**: Nao aplicavel (sem alteracao de schema).

## Alteracao

**Arquivo**: `src/modules/okrs/components/wizards/shared/InlineDecisionInput.tsx`

**Linha 48** - Mudar o estado inicial de `isOpen`:

```typescript
// DE:
const [isOpen, setIsOpen] = useState(false);

// PARA:
const [isOpen, setIsOpen] = useState(true);
```

## Impacto

- Afeta os 3 steps intermediarios que usam o componente: Opening, KR Review e Initiatives.
- O campo de texto, seletor de categoria e lista de registros ficam visiveis imediatamente, sem necessidade de clique.
- O usuario ainda pode colapsar manualmente clicando no header do Collapsible.
- Nenhum outro componente ou arquivo e afetado.
