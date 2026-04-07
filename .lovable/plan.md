

## Plano: Página dedicada `/kpis/:kpiId` + Links clicáveis nos rituais

### Pré-checklist confirmado

| Doc | Consultado |
|-----|-----------|
| TCR v3.22.0 | ✅ — §2.3 Módulo KPIs (kpi_metrics, kpi_values schema) |
| DEVELOPMENT_STANDARDS v1.28.0 | ✅ — §A.1 PRE/POST-BU, §L HubLayout obrigatório, §L.6 checklist novas páginas |
| DATA_MODEL_REGISTRY | ✅ — kpi_metrics, kpi_values, kpi_data_contributors |
| IDENTITY_CONVENTION | ✅ — owner_user_id = profiles.id |
| Codebase existente | ✅ — KpiDetailDialog (381 linhas), rotas em core.routes.tsx, hooks existentes |

---

### Escopo

**1. Extrair `KpiDetailContent` de `KpiDetailDialog`**

Novo arquivo `src/modules/kpis/components/KpiDetailContent.tsx`:
- Recebe `kpiId: string`
- Contém todo o JSX que hoje está dentro do `<DialogContent>` (linhas 140-377 de KpiDetailDialog)
- Usa internamente `useKpiDetail`, `useKpiLinkedKrs`, `useCanEditKpi`, `useKpiMutations`
- Inclui chart, metadata, histórico, KRs vinculadas, target history

**2. Refatorar `KpiDetailDialog`**

Simplificar para:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    {kpiId ? <KpiDetailContent kpiId={kpiId} /> : <LoadingState />}
  </DialogContent>
</Dialog>
```

**3. Criar `KpiDetailPage`**

Novo arquivo `src/modules/kpis/pages/KpiDetailPage.tsx`:
- `useParams<{ kpiId: string }>()`
- `usePageTitle()` com nome dinâmico do KPI
- `useSafeBack()` para botão voltar (→ `/kpis`)
- `HubLayout` em TODOS os estados (loading, error, not found, success) — conforme §L.1
- Renderiza `<KpiDetailContent kpiId={kpiId} />`

**4. Registrar rota em `core.routes.tsx`**

```tsx
<Route path="/kpis/:kpiId" element={
  <ProtectedRoute>
    <BuRequiredRoute>
      <ModuleRoute moduleSlug="kpis">
        <KpiDetailPage />
      </ModuleRoute>
    </BuRequiredRoute>
  </ProtectedRoute>
} />
```

**5. Exportar no barrel `src/modules/kpis/index.ts`**

**6. Tornar KPIs clicáveis nos rituais (abrir nova aba)**

Em todos os componentes de wizard que exibem nomes de KPI, envolver o nome com `<a href={/kpis/${id}} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>`:

| Componente | Local do `kpi.name` |
|-----------|---------------------|
| `KpiStatusBlocks.tsx` (shared) | OutdatedKpisBlock, PendingKpisBlock |
| `QbrKpiAnalysisStep.tsx` | Cards de KPIs healthy e no-data |
| `QbrCLevelSystemReadStep.tsx` | Cards de KPIs dos líderes |
| `QbrMeetingOpeningStep.tsx` | Blocos de KPIs no opening |
| `MbrPanoramaStep.tsx` | Cards de panorama |
| `MbrKpiGateStep.tsx` | Lista de KPIs com gate |
| `CollaboratorCheckinStep.tsx` | KPI primária vinculada |
| `KrLinkedKpiCard.tsx` (team-checkin) | Card de KPI vinculada a KR |
| `ManagersSystemicKpisStep.tsx` | KPIs sistêmicas |
| `TeamOkrContextStep.tsx` | KPIs estratégicas no contexto |
| `TeamOkrKrMetricsStep.tsx` | Links de KPI primary/guardrail |
| `CLevelInsightsStep.tsx` | Se exibir nomes de KPI |

Padrão visual: nome com `hover:underline` + ícone `ExternalLink` (3px) ao lado.

---

### Detalhes técnicos

- **Navegação:** Usa `<a>` com `target="_blank"` (não `<Link>`) para abertura em nova aba — os rituais pedem "abrir em nova aba" explicitamente
- **`stopPropagation`:** Necessário para evitar trigger de eventos em cards pai (accordion, collapsible)
- **Componente auxiliar sugerido:** Criar `KpiNameLink` para encapsular o padrão e evitar duplicação em ~12 arquivos:
  ```tsx
  function KpiNameLink({ kpiId, name }: { kpiId: string; name: string }) {
    return (
      <a href={`/kpis/${kpiId}`} target="_blank" rel="noopener noreferrer"
         onClick={e => e.stopPropagation()}
         className="hover:underline inline-flex items-center gap-1">
        {name}
        <ExternalLink className="h-3 w-3 opacity-50" />
      </a>
    );
  }
  ```
- **BU Scope:** `useKpiDetail` já usa `useBuScopedSupabase()` — a página herda o guard via `BuRequiredRoute`
- **Permissões:** Leitura de KPIs não exige permissão específica (RLS permite SELECT para membros da BU)

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/modules/kpis/components/KpiDetailContent.tsx` | **Novo** |
| `src/modules/kpis/components/KpiNameLink.tsx` | **Novo** |
| `src/modules/kpis/pages/KpiDetailPage.tsx` | **Novo** |
| `src/modules/kpis/components/KpiDetailDialog.tsx` | Refatorar (usa KpiDetailContent) |
| `src/routes/core.routes.tsx` | Adicionar rota |
| `src/modules/kpis/index.ts` | Exportar novos componentes |
| ~12 componentes de wizard | Substituir `kpi.name` por `<KpiNameLink>` |

