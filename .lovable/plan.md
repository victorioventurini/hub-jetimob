## Contexto

KPI **MRR Churn + Downsell** continua aparecendo no MBR mesmo "removido" porque `kpi_metrics` tem **dois campos divergentes**:

- `status` (enum `kpi_status`: `active|inactive`) — usado pelo dashboard `/kpis`.
- `lifecycle_status` (enum `kpi_lifecycle_status`: `proposed|active|observing|deprecated`) — **SSOT canônico segundo TCR §kpi_metrics**, usado pelos ritos.

Estado atual no banco (Jetimob, não-deletados): 2 KPIs com `status='inactive'` + `lifecycle='active'` — somem do `/kpis` mas continuam nos ritos.

Pré-checklist: TCR §809/872, DATA_MODEL_REGISTRY §enums (com divergência detectada — doc lista `paused/archived`, banco tem `proposed/observing`), `mem://kpi-value-entry-ssot` (precedente de remoção limpa de campo legado), Core Rules (sem CHECK, soft-delete, sem `select('*')`, sem editar `types.ts`).

## Plano

### Etapa 1 — Correção pontual (dado, via insert tool)
Atualizar os 2 KPIs divergentes: `lifecycle_status='deprecated'` onde `status='inactive'` AND `deleted_at IS NULL`. Resolve o caso reportado e zera divergência atual.

### Etapa 2 — Blindagem dos ritos (frontend)
Adicionar `.eq('status','active')` ao lado dos filtros `lifecycle_status='active'` existentes, evitando regressão se alguém arquivar pelo dashboard:
- `src/modules/okrs/pages/mbr/useMbrDataSources.ts` (`useAllBuKpisForMbr`)
- `src/modules/kpis/hooks/useKpisForWizard.ts`
- `src/modules/kpis/hooks/useKpisForWizardV2.ts`
- Demais hooks identificados via `rg "lifecycle_status.*active"`.

### Etapa 3 — Consolidação no schema (migration)
1. **Backfill idempotente**: `UPDATE kpi_metrics SET lifecycle_status='deprecated' WHERE status='inactive' AND lifecycle_status <> 'deprecated' AND deleted_at IS NULL`.
2. **Trigger de sincronização** `BEFORE INSERT OR UPDATE` em `kpi_metrics` (`SECURITY DEFINER`, `SET search_path=public`, **sem CHECK constraint** — segue Core Rule):
   - `status='inactive'` → força `lifecycle_status='deprecated'`;
   - `lifecycle_status='deprecated'` → força `status='inactive'`;
   - `lifecycle_status IN ('active','proposed','observing')` sem mudança explícita em `status` → mantém `status='active'`.
3. **Comentário SQL** marcando `kpi_metrics.status` como `@deprecated — mantido por trigger; usar lifecycle_status`.

### Etapa 4 — Atualização documental
- **`docs/canonical/DATA_MODEL_REGISTRY.md`**: corrigir enum `kpi_lifecycle_status` para `proposed, active, observing, deprecated` (doc atual está errado) e marcar `kpi_status` como legado.
- **`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`**: nota em `kpi_metrics` — "`status` é legado, sincronizado por trigger; toda lógica nova lê `lifecycle_status`".
- **Memória nova** `mem://standards/kpi-status-consolidation` registrando a regra para sessões futuras.

### Etapa 5 — Fora deste PR (próxima onda)
Mover mutações de "arquivar/ativar KPI" no frontend para escrever em `lifecycle_status` em vez de `status`, e auditar para então droppar fisicamente a coluna `status` em migration futura.

## Detalhes técnicos

- Soft delete continua obrigatório (`deleted_at IS NULL`); `lifecycle_status='deprecated'` é o estado lógico de "arquivado/inativo".
- `types.ts` regenerado automaticamente pós-migration — sem edit manual.
- Etapa 1 usa **insert tool** (data update); Etapa 3 usa **migration tool** (schema/trigger). Etapas serão executadas separadamente, com aprovação do usuário entre elas.
- Sem alteração em RLS, BU isolation, query keys ou contratos públicos de hooks.

## Fora de escopo

- Drop físico da coluna `status` (Etapa 5).
- Refatoração de UI do dashboard `/kpis` para esconder o controle antigo de "ativar/desativar".
- Mudança em outros enums KPI.
