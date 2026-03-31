
Sim — agora está confirmado: o plano **passa a contemplar backfill de todos os wizard types** (não só `mbr/mbr-pre/qbr-pre`), conforme sua resposta.

Também confirmei o pré-checklist canônico antes de seguir:
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `docs/canonical/IDENTITY_CONVENTION.md`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/DATA_MODEL_REGISTRY.md`
- revisão da implementação existente em `sync-ritual-calendar-from-cycles`, `generate-ritual-occurrences`, `useRitualCadences`, `RitualCalendarPage`.

Plano objetivo (revisado com seu escopo):

1) Catálogo canônico de wizard types (fonte única)
- Criar um catálogo único no frontend/backend com todos os wizard types aceitos no módulo de ritos.
- Usar esse catálogo na UI (`RECURRENT_WIZARD_TYPES` + labels) para garantir que `mbr-pre` e demais tipos apareçam nos filtros/listas.

2) Backfill “todos os wizard types” por BU (auto-healing)
- Evoluir a sync function para:
  - identificar wizard types esperados;
  - detectar ausentes em `ritual_cadences` da BU;
  - criar/reativar cadências faltantes de forma idempotente;
  - para tipos derivados de ciclo (MBR/QBR), recalcular datas com base em `cycles`;
  - para tipos não derivados de ciclo, aplicar defaults canônicos (sem sobrescrever customizações existentes).

3) Rebuild completo de ocorrências para os tipos afetados
- Após o backfill/upsert, disparar `generate-ritual-occurrences` em `rebuild_mode='full'` para cada cadence impactada.
- Manter política atual de reconstrução total para consistência entre `/hub/modules/okrs/settings` e `/settings/rituals`.

4) Trigger automático + proteção anti-loop
- Em `useRitualCadences`, se detectar lacuna de wizard types esperados, disparar sync silencioso uma vez por BU/sessão (auto-healing).
- Preservar invalidação de cache canônica (`queryKeys.okrs`) após sync.

5) Conformidade obrigatória (TCR/standards)
- Manter cliente BU-scoped + filtro explícito `.eq('bu_id', currentBuId)` nas queries operacionais.
- Sem `select('*')`.
- Sem alteração estrutural de schema, apenas correção de fluxo e dados.

Critérios de aceite
- Em BU com lacunas, ao abrir `/settings/rituals` os wizard types faltantes passam a aparecer automaticamente.
- `mbr-pre` e demais tipos esperados listados em Cadências/Filtros.
- Sem duplicações após múltiplas aberturas/syncs.
- Sincronização continua imediata após mutações de ciclos/status no Hub.
