
# Plano: Validação de Data Consolidada para KPIs

## 1. Contexto e Pré-Checklist ✅

| Documento | Status | Versão |
|-----------|--------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | ✅ Analisado | v2.79.0 |
| DEVELOPMENT_STANDARDS.md | ✅ Analisado | v1.17.0 |
| DATA_MODEL_REGISTRY.md | ✅ Analisado | v2.51.0 |
| validationMessages.ts | ✅ Analisado | Existe infraestrutura |
| AddKpiValueDialog.tsx | ✅ Analisado | Ponto de entrada único |

## 2. Problema Identificado

**Regra de Negócio:** Dados de KPI só podem ser registrados para dias **consolidados** (encerrados).

**Exemplo:**
- Hoje é 13/02
- O dia 13 ainda não acabou → dados ainda não consolidados
- Portanto, só pode registrar dados até o dia **12/02**

**Estado Atual:**
- `AddKpiValueDialog.tsx` não valida esta regra
- Default é o dia atual (incorreto)
- Usuário pode registrar valores para hoje ou futuro

## 3. Solução Proposta

### 3.1 Abordagem: Validação Frontend (Estender, Não Duplicar)

| Camada | Ação | Justificativa |
|--------|------|---------------|
| `validationMessages.ts` | Adicionar mensagem `consolidatedDate` | Centralizar mensagens (padrão Hub) |
| `AddKpiValueDialog.tsx` | Validar data < hoje no schema Zod | Validação no form |
| `AddKpiValueDialog.tsx` | Default = dia anterior (ontem) | UX correta |
| `AddKpiValueDialog.tsx` | Input `max` = dia anterior | Impedir seleção no picker |

### 3.2 Arquivos a Modificar

| Arquivo | Ação | Modificação |
|---------|------|-------------|
| `src/lib/validationMessages.ts` | **MODIFICAR** | +1 mensagem |
| `src/modules/kpis/components/AddKpiValueDialog.tsx` | **MODIFICAR** | +validação +max +default |

## 4. Detalhamento Técnico

### 4.1 `validationMessages.ts` — Adicionar Mensagem

```typescript
// Na seção DATAS (linhas 98-123)

/** Data deve ser consolidada (dia encerrado, não pode ser hoje) */
consolidatedDate: (fieldName?: string) => 
  fieldName 
    ? `${fieldName} deve ser um dia já encerrado (não pode ser hoje)`
    : "Selecione um dia já encerrado (não pode ser hoje)",
```

### 4.2 `AddKpiValueDialog.tsx` — Atualizar Validação

**Imports a adicionar:**
```typescript
import { format, subDays, startOfDay, isBefore } from "date-fns";
import { validation } from "@/lib/validationMessages";
```

**Schema Zod atualizado:**
```typescript
const formSchema = z.object({
  value: z.coerce.number({ required_error: validation.required("Valor") }),
  reference_date: z.string()
    .min(1, validation.required("Data de referência"))
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return isBefore(selectedDate, today);
    }, { message: validation.consolidatedDate("Data de referência") }),
  notes: z.string().max(500).optional(),
});
```

**Default value atualizado:**
```typescript
defaultValues: {
  value: undefined,
  reference_date: format(subDays(new Date(), 1), "yyyy-MM-dd"), // Ontem
  notes: "",
},
```

**Input com `max` attribute:**
```typescript
<Input 
  type="date" 
  max={format(subDays(new Date(), 1), "yyyy-MM-dd")} // Ontem
  {...field} 
/>
```

### 4.3 Texto de Ajuda (Helper Text)

Adicionar texto explicativo ao campo de data:
```tsx
<FormItem>
  <FormLabel>Data de Referência</FormLabel>
  <FormControl>
    <Input 
      type="date" 
      max={format(subDays(new Date(), 1), "yyyy-MM-dd")} 
      {...field} 
    />
  </FormControl>
  <p className="text-xs text-muted-foreground">
    Informe o último dia do período consolidado (até ontem)
  </p>
  <FormMessage />
</FormItem>
```

## 5. Impacto em Outros Componentes

### 5.1 Verificação de Pontos de Entrada

| Componente | Existe? | Precisa Validação? |
|------------|---------|-------------------|
| `AddKpiValueDialog.tsx` | ✅ Sim | ✅ **Implementar** |
| `KpiValueInputCard.tsx` (wizard) | ❌ Não existe | N/A (plano futuro) |
| `EditKpiValueDialog.tsx` | ❌ Não existe | N/A |

**Conclusão:** Apenas `AddKpiValueDialog.tsx` precisa da validação no momento.

### 5.2 Futuro (Wizard Integration)

Quando o step de KPIs for implementado no wizard de check-in, a mesma lógica deverá ser aplicada. A função de validação pode ser extraída para um util se necessário:

```typescript
// src/modules/kpis/utils/dateValidation.ts (futuro, se necessário)
export const isConsolidatedDate = (date: string): boolean => {
  const selectedDate = startOfDay(new Date(date));
  const today = startOfDay(new Date());
  return isBefore(selectedDate, today);
};
```

## 6. Regras Respeitadas

| Regra | Status |
|-------|--------|
| Usar infraestrutura existente (validationMessages) | ✅ |
| Não duplicar componentes | ✅ |
| Mensagens em pt-BR | ✅ |
| date-fns para manipulação de datas | ✅ |
| Validação no frontend (UX) | ✅ |

## 7. Validação Backend (Consideração)

**Pergunta:** Devemos adicionar validação no banco de dados também?

**Recomendação:** Sim, um trigger seria ideal para garantir integridade. Porém, para manter o escopo mínimo, a validação frontend é suficiente para esta iteração.

**Trigger futuro (opcional):**
```sql
CREATE OR REPLACE FUNCTION kpi_value_date_validate()
RETURNS trigger AS $$
BEGIN
  IF NEW.reference_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Data de referência deve ser anterior a hoje (dados consolidados)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 8. Testes de Aceitação

| Cenário | Input | Resultado Esperado |
|---------|-------|-------------------|
| Hoje é 03/02, seleciona 02/02 | 2026-02-02 | ✅ Aceito |
| Hoje é 03/02, seleciona 03/02 | 2026-02-03 | ❌ Erro: "Data de referência deve ser um dia já encerrado" |
| Hoje é 03/02, seleciona 04/02 | 2026-02-04 | ❌ Erro (input bloqueado via `max`) |
| Abre dialog | - | Default = 02/02 (ontem) |

## 9. Estimativa de Implementação

| Item | Complexidade |
|------|-------------|
| Adicionar mensagem em validationMessages | Baixa (1 linha) |
| Atualizar schema Zod | Baixa (5 linhas) |
| Atualizar default | Baixa (1 linha) |
| Adicionar max no input | Baixa (1 linha) |
| Adicionar helper text | Baixa (3 linhas) |
| **Total** | **~15 minutos** |
