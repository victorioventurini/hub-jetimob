

## Fase 2 — Responsável e Prazo nas Decisões

### Resumo

Adicionar `deadline` ao type `TeamCheckinDecision`, ativar o campo `owner` já existente na UI, e centralizar a lógica em um `DecisionCard` compartilhado. Três locais consomem decisões com cards: `MbrDecisionsStep`, `TeamDecisionsStep` e `InlineDecisionInput` (modo compacto).

---

### 1. Tipagem — `src/modules/okrs/types/wizard.ts`

Expandir `TeamCheckinDecision` (linhas 282-291):

```typescript
export interface TeamCheckinDecision {
  id: string;
  text: string;
  category: 'decision' | 'focus_adjustment' | 'next_step';
  sourceStep?: TeamCheckinDecisionSourceStep;
  owner?: {
    id: string;
    name: string;
  };
  deadline?: string | null; // ISO date format
}
```

Única adição: campo `deadline?: string | null`.

---

### 2. Componente compartilhado — `src/modules/okrs/components/wizards/shared/DecisionCard.tsx` (novo)

Extrair e centralizar a lógica de `MbrDecisionCard` (de `MbrDecisionsStep`) e `DecisionCard` (de `TeamDecisionsStep`) num único componente reutilizável:

**Props:**
```typescript
interface DecisionCardProps {
  decision: TeamCheckinDecision;
  onUpdate: (id: string, updates: Partial<TeamCheckinDecision>) => void;
  onRemove: (id: string) => void;
  showReclassify?: boolean;       // MBR usa, team check-in não
  showOwnerDeadline?: boolean;    // true por padrão
  compact?: boolean;              // para uso inline (menor padding)
}
```

**UI do card:**
- Linha 1: Ícone da categoria + texto (editável inline via `TextareaAutoSubmit`)
- Linha 2: Badges de reclassificação (quando `showReclassify`)
- Linha 3 (nova): Responsável (`BuUserSelect` compacto, `allowNone`, `placeholder="Responsável"`) + Prazo (`Popover` + `Calendar` mode single, formato `dd/MM`)
  - Quando vazio: texto sutil "Sem responsável" / "Sem prazo" em `text-muted-foreground` como incentivo
- Botões de ação: Editar, Remover (já existentes)

**Reclassificação preserva owner e deadline**: o `onUpdate` recebe `Partial<TeamCheckinDecision>`, então reclassificar só altera `category`.

**Componentes reutilizados (zero criação de UI):**
- `BuUserSelect` (canônico, de `@/components/selects`)
- `Calendar` + `Popover` (shadcn, já instalados)
- `TextareaAutoSubmit`, `Badge`, `Card`, `Button`

---

### 3. Atualização dos consumidores

**`MbrDecisionsStep.tsx`:**
- Substituir `MbrDecisionCard` local pelo `DecisionCard` compartilhado com `showReclassify={true}`
- Atualizar `handleAdd` para incluir `owner: undefined, deadline: null`
- Simplificar handlers: `handleUpdate`, `handleRemove` (reclassify vira parte do `onUpdate`)

**`TeamDecisionsStep.tsx`:**
- Substituir `DecisionCard` local pelo compartilhado com `showReclassify={false}`
- Mesma simplificação de handlers

**`InlineDecisionInput.tsx`:**
- Sem alteração visual (modo compacto, sem owner/deadline inline)
- O `handleAdd` já cria decisões sem owner/deadline, que ficam `undefined`/`null` — compatível

---

### 4. Exportação — `src/modules/okrs/components/wizards/shared/index.ts`

Adicionar `export { DecisionCard } from './DecisionCard'`.

---

### 5. Testes

- Atualizar `MbrDecisionsStep.test.tsx`: mock do `BuUserSelect` e `Calendar`, verificar que reclassificação preserva owner/deadline
- Atualizar `TeamDecisionsStep.test.tsx`: verificar rendering do card compartilhado
- Adicionar teste unitário para `DecisionCard` em `shared/__tests__/DecisionCard.test.tsx`

---

### Arquivos tocados

| Arquivo | Ação |
|---|---|
| `src/modules/okrs/types/wizard.ts` | Adicionar `deadline` ao type |
| `src/modules/okrs/components/wizards/shared/DecisionCard.tsx` | **Novo** — card compartilhado |
| `src/modules/okrs/components/wizards/shared/index.ts` | Exportar `DecisionCard` |
| `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx` | Usar `DecisionCard` compartilhado |
| `src/modules/okrs/components/wizards/team-checkin/TeamDecisionsStep.tsx` | Usar `DecisionCard` compartilhado |
| `src/modules/okrs/components/wizards/shared/__tests__/DecisionCard.test.tsx` | **Novo** — testes do card |
| `src/modules/okrs/components/wizards/mbr/__tests__/MbrDecisionsStep.test.tsx` | Atualizar mocks |
| `src/modules/okrs/components/wizards/team-checkin/__tests__/TeamDecisionsStep.test.tsx` | Atualizar mocks |

