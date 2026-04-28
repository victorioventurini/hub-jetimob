# Campo "Atualizado por" em KPIs

## Objetivo
Separar visualmente e tecnicamente o **Responsável pelo resultado** (`owner_user_id`) do **Responsável por atualizar os dados** (contribuidor `data_entry`), reusando a infraestrutura `kpi_data_contributors` que já existe mas estava órfã na UI.

## Decisões aprovadas
- **Cardinalidade:** 1 único usuário no campo "Atualizado por".
- **Backfill:** copiar `owner_user_id` para `kpi_data_contributors` (role=`data_entry`) em todas as KPIs ativas que ainda não possuem contribuidor.
- **Obrigatoriedade:** obrigatório quando `lifecycle_status='active'` (mesma regra do Responsável).

## Mudanças

### 1. UI — EditKpiDialog
Em `src/modules/kpis/components/edit-kpi/EditKpiOwnershipSection.tsx`:
- Adicionar 3º campo `updated_by_user_id` (BuUserSelect, `excludeExternal`) ao lado de "Responsável".
- Layout: grid passa a ter 3 colunas quando scope=team, 2 quando scope=area/org (ou empilhar em mobile).
- Tooltip esclarecendo: "Responsável" = dono do resultado; "Atualizado por" = quem alimenta os dados do indicador.

Em `editKpiSchema.ts`:
- Novo campo opcional `updated_by_user_id: z.string().optional()`.
- `superRefine`: exigir quando `lifecycle_status === 'active'`.

Em `useEditKpiForm.ts`:
- Hidratar `updated_by_user_id` a partir do primeiro contribuidor `data_entry` ativo do KPI (via prop ou query auxiliar).

Em `EditKpiDialog.tsx` (`onSubmit`):
- Após `updateKpi`, sincronizar `kpi_data_contributors`:
  - Se mudou: soft-delete contribuidores `data_entry` ativos atuais e inserir o novo.
  - Reusar `useKpiContributors` (add/remove) ou criar um helper `upsertPrimaryDataEntry(kpiId, userId)` em `useKpiContributors.ts`.

### 2. UI — CreateKpiDialog
- Mesmo campo `updated_by_user_id` ao lado de Responsável.
- No submit: após criar a KPI, inserir o contribuidor `data_entry` se preenchido.

### 3. Hook
Em `src/modules/kpis/hooks/useKpiContributors.ts`:
- Adicionar mutation `upsertPrimaryDataEntry({ kpiId, userId | null })` que:
  - Se `userId` vier null/undefined: soft-delete dos `data_entry` atuais.
  - Se houver outro contribuidor `data_entry` diferente: soft-delete antigos + insert novo.
  - Idempotente: se já é o atual, no-op.
- Invalidar `kpisKeys.contributors(kpiId)` e `kpisKeys.list(...)`.

### 4. KpiDetailContent / KpiSidePanel
- Exibir "Atualizado por" como linha dedicada (read-only) ao lado de "Responsável", para visibilidade mesmo sem abrir o editor.

### 5. Backfill (migração de dados)
Migration SQL idempotente:
```sql
INSERT INTO public.kpi_data_contributors (kpi_id, contributor_user_id, role, bu_id, created_by, notes)
SELECT km.id, km.owner_user_id, 'data_entry', km.bu_id, km.owner_user_id,
       'Backfill v2.92.0 — copiado do responsável'
FROM public.kpi_metrics km
WHERE km.deleted_at IS NULL
  AND km.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.kpi_data_contributors c
    WHERE c.kpi_id = km.id
      AND c.role = 'data_entry'
      AND c.deleted_at IS NULL
  );
```
- Confere a unique constraint `uq_kpi_contributor (kpi_id, contributor_user_id, deleted_at)` — `ON CONFLICT DO NOTHING` como guarda extra.

### 6. Documentação canônica (pré-checklist)
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`: registrar campo "Atualizado por" e relação com `kpi_data_contributors`.
- `docs/canonical/UI_COMPONENTS_REGISTRY.md`: documentar o novo campo no Edit/Create KPI Dialog.
- `mem://features/kpis/kpis-master-standard`: adicionar seção "Responsável vs Atualizado por (data_entry)" — semântica, obrigatoriedade, backfill, fonte da verdade (kpi_data_contributors role=data_entry, 1 ativo por KPI por convenção da UI atual).

## Fora de escopo
- Múltiplos contribuidores / role `reviewer` (infra existe, UI continua orphaned por enquanto).
- Renderizar o `KpiContributorsManager` completo.
- Permissões de quem pode lançar dados (continua via RLS + RBAC atuais).

## Critérios de aceite
- Campo "Atualizado por" visível e editável em Criar e Editar KPI.
- Validação obrigatória quando KPI está ativo.
- Persistência verificável em `kpi_data_contributors` (1 registro `data_entry` ativo por KPI).
- Após backfill: 31/31 KPIs ativos com `owner_user_id` possuem contribuidor `data_entry`.
- TCR + UI Components Registry + memória `kpis-master-standard` atualizados.
