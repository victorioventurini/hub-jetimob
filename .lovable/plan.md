
# Plano: Completar Governança no EditKpiDialog

## Contexto e Validação

Após análise do **TCR v3.4.3**, **IDENTITY_CONVENTION.md v2.1.1**, e **PERMISSIONS_AND_RBAC_MODEL.md v1.4.0**:

### Situação Atual

| Componente | Status | Campos `responsible_*` |
|------------|--------|------------------------|
| `CreateKpiDialog.tsx` | ✅ Atualizado (v2.90.0) | Implementados |
| `EditKpiDialog.tsx` | ❌ Desatualizado | **NÃO implementados** |
| `useKpiMutations.ts` | ✅ Pronto | Suporta campos |
| Schema `kpi_metrics` | ✅ Pronto | Colunas existem |
| Trigger de governança | ✅ Pronto | Valida `responsible_area_id` |

### Problema
O `EditKpiDialog.tsx` não tem:
1. Campos `responsible_area_id` e `responsible_team_id` no schema Zod
2. Carregamento dos valores no reset do form
3. UI para seleção de Área/Time Responsável quando `scope=org`
4. Validação de obrigatoriedade para KPIs Globais ativos
5. Envio dos campos no submit
6. Escopo como campo readonly (imutável após criação)

---

## Alterações Planejadas

### 1. Atualizar Schema Zod

Adicionar campos no `formSchema`:
```typescript
// v2.90.0: Operational responsibility
responsible_area_id: z.string().optional(),
responsible_team_id: z.string().optional(),
```

Adicionar validação no `superRefine`:
```typescript
// v2.90.0: scope=org ativo → responsible_area_id OBRIGATÓRIO
if (data.lifecycle_status === 'active' && data.scope === 'org' && !data.responsible_area_id) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Área Responsável é obrigatória para KPIs Globais ativos",
    path: ["responsible_area_id"],
  });
}
```

### 2. Atualizar DefaultValues

```typescript
defaultValues: {
  // ... existentes ...
  responsible_area_id: undefined,
  responsible_team_id: undefined,
}
```

### 3. Atualizar Reset do Form

Em `resetFormWithKpiData`:
```typescript
form.reset({
  // ... existentes ...
  responsible_area_id: kpi.responsible_area_id || undefined,
  responsible_team_id: kpi.responsible_team_id || undefined,
});
```

### 4. Adicionar Seção UI para scope=org

Replicar a seção do `CreateKpiDialog.tsx`:
```tsx
{watchScope === 'org' && (
  <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
    <div className="flex items-center gap-2">
      <Info className="h-4 w-4 text-info" />
      <span className="text-sm font-medium">Responsabilidade Operacional</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Esta KPI é Global, mas quem responde por ela no dia a dia é:
    </p>
    
    <div className="grid grid-cols-2 gap-4">
      {/* AreaSelect para responsible_area_id */}
      {/* TeamSelect para responsible_team_id (opcional) */}
    </div>

    <InfoNotice variant="info">
      KPIs Globais impactam toda a organização e requerem uma área 
      operacionalmente responsável por acompanhar e agir em desvios.
    </InfoNotice>
  </div>
)}
```

### 5. Adicionar Campo Opcional para scope=area

```tsx
{watchScope === 'area' && (
  <FormField
    control={form.control}
    name="responsible_team_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Time Responsável (opcional)
          <HelpTooltip content="Qual time é o principal responsável por acompanhar este indicador da área?" />
        </FormLabel>
        <FormControl>
          <TeamSelect ... />
        </FormControl>
      </FormItem>
    )}
  />
)}
```

### 6. Tornar Escopo Readonly

O campo `scope` deve ser desabilitado para manter a regra de imutabilidade:
```tsx
<Select 
  onValueChange={...} 
  value={field.value}
  disabled // Escopo é imutável após criação
>
```

Com tooltip explicativo: "O escopo é definido na criação e não pode ser alterado"

### 7. Atualizar onSubmit

```typescript
await updateKpi.mutateAsync({
  // ... existentes ...
  responsible_area_id: values.responsible_area_id || null,
  responsible_team_id: values.responsible_team_id || null,
});
```

### 8. Adicionar Imports Necessários

```typescript
import { InfoNotice } from "@/components/ui/info-notice";
import { Lock } from "lucide-react"; // se não estiver importado
```

---

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/modules/kpis/components/EditKpiDialog.tsx` | Schema, defaultValues, reset, UI, submit, escopo readonly |

---

## Consistência com Padrões do Hub

| Padrão | Conformidade |
|--------|--------------|
| **IDENTITY_CONVENTION** | ✅ Usa `profiles.id` para `owner_user_id` |
| **PERMISSIONS_RBAC** | ✅ Respeita `kpis.settings.manage:bu` |
| **InfoNotice Component** | ✅ Usa componente canônico |
| **useDialogFormReset** | ✅ Já implementado |
| **Selects Canônicos** | ✅ Usa `AreaSelect` e `TeamSelect` |

---

## Resultado Esperado

- Ao editar um KPI Global (`scope=org`), aparecerá a seção "Responsabilidade Operacional"
- Campo "Área Responsável" será obrigatório para KPIs Globais ativos
- Campo "Time Responsável" será opcional
- Para KPIs de Área (`scope=area`), aparecerá campo opcional de "Time Responsável"
- Escopo será readonly com tooltip explicativo
- Valores existentes de `responsible_area_id` e `responsible_team_id` serão carregados corretamente
