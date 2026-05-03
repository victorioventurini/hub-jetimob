## Contexto (verificado)

Pré-checklist canônico cumprido:
- `TECHNICAL_CONTEXT_REGISTRY.md` ✅
- `WIZARDS_FRAMEWORK_BOUNDARY.md` (consumir wizards via shared/scaffolds) ✅
- `PERMISSIONS_AND_RBAC_MODEL.md` / `IDENTITY_CONVENTION.md` (não há mudança em RLS/permissão; apenas UI/UX) ✅
- Memórias `mem://features/rituals/collaborator-step1-order-mirrors-steps` e `collaborator-week-activity-card` (ordem de steps preservada via `STEP_ORDER`) ✅

## Diagnóstico

Hoje em `CollaboratorCheckinPage.tsx` o `visibleSteps` filtra dinamicamente:

```ts
WIZARD_STEPS.filter(s => {
  if (s.id === 'checkin' && !hasKrStep) return false;   // ← oculta KRs
  if (s.id === 'kpis'    && !hasKpiStep) return false;  // ← oculta KPIs
  return true;
});
```

Resultado: o usuário sem KRs sob sua responsabilidade simplesmente **não vê** o passo "KRs" na trilha. Os demais (`projects`, `initiatives`, `decisions`) já permanecem visíveis e usam o componente centralizado `EmptyState` (`@/components/ui/empty-state`) dentro de `WizardStepScaffold` + `WizardStepFooter`.

Quem precisa mudar:
1. `CollaboratorCheckinPage.tsx` — parar de filtrar `kpis`/`checkin`.
2. `CollaboratorCheckinStep.tsx` (KRs) — quando não houver KR, renderizar empty state padronizado.
3. `CollaboratorKpiStep.tsx` (KPIs) — idem.

Não existe duplicação: vou **reutilizar** `EmptyState`, `WizardStepScaffold`, `WizardStepHeader` e `WizardStepFooter` — exatamente o padrão já adotado em `CollaboratorInitiativesStep.tsx` (linhas 324-368).

## Plano de ação

### 1) `CollaboratorCheckinPage.tsx`
- Remover o filtro de `kpis` e `checkin` em `visibleSteps` e `visibleStepOrder` — todos os 8 steps de `WIZARD_STEPS` permanecem visíveis na trilha sempre.
- Manter o `useEffect` de auto-correção (continua válido para drafts antigos com step desconhecido).
- Em `renderStepContent()`:
  - `case 'checkin'` quando `krs.length === 0`: renderizar o `CollaboratorCheckinStep` no modo empty (props novas) em vez de retornar `null`.
  - `case 'kpis'` quando `kpis.length === 0`: idem para `CollaboratorKpiStep`.

### 2) `CollaboratorCheckinStep.tsx` (KRs)
- Tornar `kr`, `currentIndex`, `totalCount` opcionais; quando `kr` for `undefined` (ou `totalCount === 0`), renderizar:
  - `WizardStepScaffold` + `WizardStepHeader` (ícone Target/Sparkles, título "Check-in de KRs") + `WizardStepFooter` (Voltar, Pular, Continuar).
  - Conteúdo: `<EmptyState icon={Target} title="Nenhum KR sob sua responsabilidade" description="Você não é responsável por KRs neste ciclo. Pode pular ou continuar." />`.
- Caminho atual (com KR) permanece intacto.

### 3) `CollaboratorKpiStep.tsx` (KPIs)
- Mesmo tratamento: `kpi` opcional; quando ausente, renderizar `WizardStepScaffold` + header (`BarChart3`, "Indicadores") + `WizardStepFooter` + `EmptyState` ("Nenhum indicador sob sua responsabilidade").
- Preservar `InlineAgendaSuggestionInput` no `bottomFixed` (igual Initiatives) caso as props de agenda venham preenchidas.

### 4) Snapshot/trilha do Step 1
- `CollaboratorContextStep` consome `visibleStepOrder` para montar a trilha. Como a trilha agora terá **todos** os steps, ela passa a refletir o fluxo completo automaticamente — sem mudar o componente. O badge de "pendentes" por step continua válido (zero pendências apenas significa empty state na navegação).

### Detalhes técnicos
- Reutiliza componentes existentes; **nenhum componente novo é criado**.
- Sem mudança em RLS, hooks de dados, edge functions ou tipos persistidos (`okr_checkins`, `kpi_values`).
- Mantém memoização (`React.memo` não é necessário aqui pois steps já são montados sob demanda; callbacks já estabilizados).
- Segue `mem://standards/frontend-memoization-standard` e `WIZARDS_FRAMEWORK_BOUNDARY` (consumo via `@/modules/okrs/components/wizards/shared`).
- Testes existentes em `__tests__/CollaboratorKpiStep.test.tsx` continuam válidos (caminho com KPI inalterado); um novo caso de empty state pode ser adicionado, mas opcional.

### Validação após implementação
- `?step=kpis` sem KPIs → mostra empty state com footer canônico.
- `?step=checkin` sem KRs → mostra empty state com footer canônico.
- Trilha do Step 1 lista todos os 8 steps independentemente de pendências.
- Fluxos com dados continuam idênticos.