
# Plano: Unificação do UnitSelect (KRs + KPIs)

## Resumo Executivo

Criar um componente canônico `UnitSelect` compartilhado entre os módulos de OKRs e KPIs, eliminando duplicação de código e garantindo consistência de UX em todo o sistema.

## Situação Atual

| Local | Implementação | Opções |
|-------|---------------|--------|
| **Modal KR** (`KrUnitSelect`) | Componente com 18 opções categorizadas + custom | Completo |
| **Modal KPI** (`CreateKpiDialog`, `EditKpiDialog`) | Select inline hardcoded | 5 opções fixas (%, R$, pontos, dias, número) |
| **Wizard OKR** (`TeamOkrKrDetailStep`) | Constante `UNITS` local | 8 opções fixas |

**Problema:** KPIs têm apenas 5 unidades, enquanto KRs têm 18+ categorizadas. Isso gera inconsistência quando uma KR está vinculada a uma KPI primária.

## Arquitetura Proposta

```text
src/
├── shared/
│   └── constants/
│       ├── index.ts              # Nova exportação
│       └── units.ts              # Constantes unificadas (NOVO)
├── components/
│   └── selects/
│       ├── UnitSelect.tsx        # Componente canônico (NOVO)
│       └── index.ts              # Atualizar export
└── modules/
    ├── okrs/
    │   ├── constants/
    │   │   └── krUnits.ts        # Re-export (backward compat)
    │   └── components/
    │       ├── KrUnitSelect.tsx  # Wrapper (deprecated)
    │       └── wizards/.../TeamOkrKrDetailStep.tsx
    └── kpis/
        └── components/
            ├── CreateKpiDialog.tsx
            └── EditKpiDialog.tsx
```

## Etapas de Implementação

### Etapa 1: Criar Constantes Unificadas

**Arquivo:** `src/shared/constants/units.ts`

Mover e renomear as constantes de `src/modules/okrs/constants/krUnits.ts`:
- `KR_UNIT_CATEGORIES` -> `UNIT_CATEGORIES`
- Manter mesmas 6 categorias: Financeiro, Volume, Experiência, Tempo, Taxas, Customizada
- Exportar helpers: `ALL_UNITS`, `getUnitLabel`, `formatValueWithUnit`

### Etapa 2: Criar Componente Canônico UnitSelect

**Arquivo:** `src/components/selects/UnitSelect.tsx`

Props:
```typescript
interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showCustomOption?: boolean;  // default: true
  showLabel?: boolean;         // default: true
  label?: string;              // default: "Unidade"
  placeholder?: string;
  className?: string;
}
```

Características:
- Select agrupado por categoria (como `KrUnitSelect` atual)
- Suporte a unidade customizada (input livre)
- Tooltip educativo sobre % vs p.p.
- Compatível com React Hook Form via `onChange`

### Etapa 3: Atualizar Módulo OKRs (Backward Compatibility)

**`src/modules/okrs/constants/krUnits.ts`:**
- Re-exportar de `@/shared/constants/units`
- Manter exports originais como alias deprecated

**`src/modules/okrs/components/KrUnitSelect.tsx`:**
- Marcar como `@deprecated`
- Internamente usar novo `UnitSelect`

**`src/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrDetailStep.tsx`:**
- Remover constante local `UNITS`
- Substituir por `UnitSelect` canônico

### Etapa 4: Atualizar Módulo KPIs

**`src/modules/kpis/components/CreateKpiDialog.tsx`:**
- Remover select inline de unidades (linhas 424-438)
- Substituir por `<UnitSelect value={field.value} onChange={field.onChange} showLabel={false} />`

**`src/modules/kpis/components/EditKpiDialog.tsx`:**
- Mesma substituição (linhas 428-442)

### Etapa 5: Atualizar Exports e Barrel Files

**`src/shared/constants/index.ts` (NOVO):**
```typescript
export * from './units';
```

**`src/shared/index.ts`:**
```typescript
export * from "./constants";
```

**`src/components/selects/index.ts`:**
```typescript
export { UnitSelect } from "./UnitSelect";
export type { UnitSelectProps } from "./UnitSelect";
```

### Etapa 6: Atualizar Testes

**`src/modules/okrs/components/KrUnitSelect.test.tsx`:**
- Atualizar para testar via novo componente se necessário
- Manter testes existentes funcionando

## Categorias de Unidades Unificadas

| Categoria | Opções |
|-----------|--------|
| **Financeiro** | R$, R$ mil, R$ milhão |
| **Volume / Quantidade** | Número, Clientes, Contas, Usuários, Leads, Tickets, Features, Projetos |
| **Experiência / Qualidade** | Pontos (NPS, eNPS), Score, Índice |
| **Tempo** | Dias, Horas, Minutos |
| **Taxas e Proporções** | %, p.p. (pontos percentuais) |
| **Customizada** | Unidade personalizada (input livre) |

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Consistência UX** | 3 implementações diferentes | 1 componente canônico |
| **Manutenção** | Alterações em 3+ lugares | Alteração única |
| **Opções em KPIs** | 5 opções fixas | 18+ opções categorizadas |
| **Customização** | Só KRs suportam | Todos suportam |
| **Documentação** | Inexistente | Componente no TCR |

## Arquivos a Criar

1. `src/shared/constants/units.ts`
2. `src/shared/constants/index.ts`
3. `src/components/selects/UnitSelect.tsx`

## Arquivos a Modificar

1. `src/shared/index.ts` - adicionar export
2. `src/components/selects/index.ts` - adicionar export
3. `src/modules/okrs/constants/krUnits.ts` - re-export com alias
4. `src/modules/okrs/components/KrUnitSelect.tsx` - deprecated wrapper
5. `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrDetailStep.tsx` - usar UnitSelect
6. `src/modules/kpis/components/CreateKpiDialog.tsx` - usar UnitSelect
7. `src/modules/kpis/components/EditKpiDialog.tsx` - usar UnitSelect
8. `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` - documentar componente

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Dados históricos com unidades diferentes | Qualquer string é aceita, compatibilidade mantida |
| Testes existentes quebram | Aliases deprecated mantêm imports funcionais |
| Performance | Constantes são estáticas, sem impacto |

## Validação Pós-Implementação

1. Modal de edição de KR exibe todas as unidades categorizadas
2. Modal de criação/edição de KPI exibe as mesmas unidades
3. Wizard de OKR usa o novo componente
4. Unidades customizadas funcionam em todos os contextos
5. Backward compatibility: imports antigos continuam funcionando
