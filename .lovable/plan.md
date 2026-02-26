

# Modulo "Events" — Jet Experience: Patrocinadores e ROI

## Pre-checklist

| Documento | Verificado | Resultado |
|-----------|-----------|-----------|
| TCR v3.8.0 | Sim | Stack confirmada (React 18 + Vite + shadcn + Recharts). Modulos operacionais sao BU-scoped via `ModuleRoute` + `BuRequiredRoute`. |
| DEVELOPMENT_STANDARDS v1.26.0 | Sim | POST-BU pattern nao se aplica (zero banco). Roteamento via `src/routes/*.routes.tsx`. Sidebar via `buMenuItems` em `DynamicSidebar.tsx`. |
| DATA_MODEL_REGISTRY | Sim | Nenhuma tabela sera criada. Modulo 100% mockado. |
| IDENTITY_CONVENTION | N/A | Sem interacao com auth/profiles (dados fake). |
| PERMISSIONS_AND_RBAC_MODEL | Sim | `ModuleRoute` + `useModuleAccess` sera usado. Slug `events` precisa de entrada no `MODULE_VIEW_PERMISSIONS`. |

## Estrategia Geral

Modulo isolado em `src/modules/events/` com dados 100% hardcoded. Zero migrations, zero banco. A visibilidade no sidebar e controlada por uma entrada no array `buMenuItems` do `DynamicSidebar.tsx` (slug `events`) — que so aparece se o modulo `events` estiver habilitado na BU ativa (via `enabledOperationalModules`). Como o modulo nao existe no banco `hub_modules`, ele simplesmente nao aparece para nenhuma BU ate ser inserido manualmente — o que e o comportamento desejado (so Jet Experience tera).

A rota publica de captura (`/p/events/capture/:eventCode`) segue o padrao existente de `/p/assets/:code`.

## Arquitetura de Arquivos

```text
src/modules/events/
  types.ts                          # Todos os tipos TypeScript
  mocks/
    sponsor.ts                      # Porto Seguro (perfil, LTV, areas)
    events.ts                       # Eventos e Jornadas mock
    participants.ts                 # ~50 participantes com dados completos
    brand-metrics.ts                # Share of Mind, Brand Recall, etc.
    opportunities.ts                # Oportunidades iniciais mock
  context/
    EventsContext.tsx               # State local para oportunidades em sessao
  components/
    dashboard/
      KpiCards.tsx                  # Cards de KPI (oportunidades, ROI, leads)
      ShareOfMindRadar.tsx          # Grafico radar - Share of Mind
      BrandRecallChart.tsx          # Barras - recall espontaneo/estimulado
      BrandPainMatrix.tsx           # Barras empilhadas - marca x dor (100%)
      BaselineEndlineChart.tsx      # Linha/area - evolucao antes/depois
      LeadQualificationFunnel.tsx   # Funil inscritos>participantes>oportunidades
      PipelineRoiChart.tsx          # Barras - ROI estimado por area
      SegmentationCharts.tsx        # Donuts - UF, cargo, tipo empresa
      PainRankingTable.tsx          # Tabela ranking - dores mais citadas
      OpportunitiesVolumeChart.tsx  # Barras - volume por evento/jornada
      BrandRecallLeadsOverlap.tsx   # Barras comparativas - recall x leads
    opportunities/
      OpportunitiesList.tsx         # Tabela de oportunidades com filtros
      OpportunityExportCsv.tsx      # Botao export CSV (blob download)
      WebhookSimulator.tsx          # Config + logs mock de webhook
    capture/
      CaptureForm.tsx               # Form publico de captura
      ParticipantPreview.tsx        # Preview dos dados do participante
      QrSimulator.tsx               # Simulador de scan QR
    participants/
      ParticipantsList.tsx          # Lista de participantes
      ParticipantDetail.tsx         # Perfil detalhado do participante
    shared/
      ViewModeToggle.tsx            # Toggle Sponsor View / Admin View
      ScopeFilter.tsx               # Filtro Evento/Jornada + selecao
      SegmentFilters.tsx            # Filtros UF, cidade, cargo, etc.
      SponsorHeader.tsx             # Header com logo Porto Seguro
  pages/
    EventsDashboardPage.tsx         # Pagina principal (dashboard ROI)
    EventsParticipantsPage.tsx      # Lista de participantes
    EventsParticipantDetailPage.tsx # Detalhe de participante
    EventsOpportunitiesPage.tsx     # Lista de oportunidades + export
    EventsWebhookPage.tsx           # Config webhook + simulador
    EventsCapturePage.tsx           # Pagina publica de captura
  hooks/
    useEventsContext.ts             # Hook para consumir EventsContext
    useAnonymize.ts                 # Hook para anonimizar marcas (Sponsor/Admin view)
    useCsvExport.ts                 # Hook para gerar e baixar CSV
  utils/
    anonymize.ts                    # Logica de anonimizacao consistente
    csv.ts                          # Geracao de CSV no frontend
    webhook.ts                      # Simulacao de payload/envio webhook
```

## Rotas

### Rotas autenticadas (novo arquivo `src/routes/events.routes.tsx`)

| Rota | Pagina | Guards |
|------|--------|--------|
| `/events` | EventsDashboardPage | ProtectedRoute + BuRequiredRoute + ModuleRoute(events) |
| `/events/participants` | EventsParticipantsPage | idem |
| `/events/participants/:id` | EventsParticipantDetailPage | idem |
| `/events/opportunities` | EventsOpportunitiesPage | idem |
| `/events/webhook` | EventsWebhookPage | idem |

### Rota publica (adicionada em `public.routes.tsx`)

| Rota | Pagina | Guards |
|------|--------|--------|
| `/p/events/capture/:eventCode` | EventsCapturePage | Nenhum (publica) |

## Alteracoes em Arquivos Existentes (minimas e removiveis)

### 1. `src/components/layout/DynamicSidebar.tsx`
Adicionar entrada no array `buMenuItems`:
```typescript
{ name: "Events", href: "/events", icon: Calendar, slug: "events" },
```
Adicionar `Calendar` ao `iconMap`:
```typescript
events: Calendar,
```

### 2. `src/hooks/useModuleAccess.ts`
Adicionar entrada no `MODULE_VIEW_PERMISSIONS`:
```typescript
events: ["events:view:bu"],
```

### 3. `src/App.tsx`
Importar e renderizar `eventsRoutes` junto aos demais modulos.

### 4. `src/routes/index.ts`
Exportar `eventsRoutes`.

### 5. `src/routes/public.routes.tsx`
Adicionar rota publica de captura.

**Total de arquivos existentes tocados: 5** (todos com alteracoes de 1-3 linhas, facilmente reversiveis).

## Dados Mockados

### Patrocinador (Porto Seguro)
- Nome: Porto Seguro
- Razao Social: Porto Seguro Cia de Seguros Gerais
- CNPJ: 61.198.164/0001-60
- Logo: `https://brandeps.com/logo/P/Porto-Seguro-01`
- Areas de atuacao com LTV mock:
  - Garantia locaticia (LTV R$ 18.000)
  - Corretora de seguros (LTV R$ 12.000)
  - Seguradora (LTV R$ 25.000)
  - Consorcio (LTV R$ 15.000)

### Competidores (anonimizados na Sponsor View)
- Loft (Competidor A)
- QuintoAndar (Competidor B)
- Kenlo (Competidor C)
- Vista (Competidor D)
- Arbo (Competidor E)

### Eventos mock (3-4)
- Jet Experience Floripa 2026
- Jet Experience SP 2026
- Jet Experience POA 2026

### Jornadas mock (2)
- Jornada Gestao Imobiliaria 2026
- Jornada Performance Comercial 2026

### Participantes (~50)
Gerados com nomes, cidades/UF variados, cargos, tipos de empresa, area de atuacao (vendas/alugueis/ambos), telefone e email mock.

## Dashboard ROI — Graficos (Recharts)

O dashboard tera no minimo 12 visualizacoes:

1. **KPI Cards** (4-6): Total oportunidades, ROI estimado, Lead score medio, Leads qualificados %, Brand Recall %, Share of Mind rank
2. **Radar Chart**: Share of Mind por dor/categoria (Porto Seguro vs media do mercado)
3. **Barras agrupadas**: Brand Recall espontaneo vs estimulado (Porto Seguro vs competidores anonimizados)
4. **Barras empilhadas 100%**: Associacao Marca x Dor (share = 100%)
5. **Linha/Area**: Evolucao Baseline vs Endline com delta
6. **Funil**: Inscritos > Participantes > Oportunidades > Fit Alto
7. **Barras horizontais**: Pipeline/ROI estimado por area de atuacao
8. **Donut**: Distribuicao por UF
9. **Donut**: Distribuicao por cargo
10. **Donut**: Distribuicao por tipo de empresa
11. **Tabela ranking**: Dores mais citadas com % e tendencia
12. **Barras comparativas**: Intercessao Brand Recall x Leads Qualificados

## Toggle de Visualizacao

Componente `ViewModeToggle` com estado local:
- **Sponsor View**: Marcas concorrentes aparecem como "Competidor A", "Competidor B"...
- **Admin View**: Nomes reais (Loft, QuintoAndar, etc.)

O mapeamento e determinisitco (mesmo competidor = mesma letra em todo o relatorio).

## Captura de Oportunidades (Pagina Publica)

1. Usuario acessa `/p/events/capture/JEF2026` (codigo do evento)
2. Digita codigo do participante ou simula scan QR
3. Sistema valida (mock) e exibe dados do participante
4. Formulario: Areas de atuacao (multi-select) + Observacoes
5. Ao salvar: adiciona ao state local (EventsContext) + dispara simulador webhook
6. Preview do payload webhook com todos os dados do participante + evento

## Webhook Simulador

Pagina dedicada com:
- URL do webhook (input editavel)
- Secret (input editavel)
- Status (ativo/inativo toggle)
- Logs mock: timestamp, payload preview, status code (200/500 simulado)
- Botao "Testar webhook" que simula envio e mostra resultado

## Export CSV

Gera blob no frontend com colunas:
- Dados do participante (nome, email, telefone, cidade, UF, cargo, tipo empresa, atuacao)
- Dados da oportunidade (areas selecionadas, observacoes, data)
- Metadata do evento/jornada (nome, data, local)

## Sequencia de Implementacao

1. Criar tipos (`types.ts`)
2. Criar todos os mocks (`mocks/*.ts`)
3. Criar context (`EventsContext.tsx`)
4. Criar hooks utilitarios (`useAnonymize`, `useCsvExport`)
5. Criar utils (`anonymize.ts`, `csv.ts`, `webhook.ts`)
6. Criar componentes do dashboard (12 graficos)
7. Criar componentes de oportunidades (lista, export, webhook)
8. Criar componentes de captura (form publico)
9. Criar componentes de participantes (lista, detalhe)
10. Criar paginas
11. Criar rotas (`events.routes.tsx`)
12. Alterar arquivos existentes (sidebar, module access, App.tsx, public routes)

## Remocao Futura

Para remover o modulo completamente:
1. Deletar `src/modules/events/`
2. Deletar `src/routes/events.routes.tsx`
3. Remover 1 linha de `buMenuItems` em `DynamicSidebar.tsx`
4. Remover 1 linha de `MODULE_VIEW_PERMISSIONS` em `useModuleAccess.ts`
5. Remover 2 linhas de `App.tsx` (import + render)
6. Remover 1 linha de `routes/index.ts`
7. Remover 1 linha de `public.routes.tsx`

Total: ~7 linhas em arquivos compartilhados.

