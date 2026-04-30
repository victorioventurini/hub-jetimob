## Onda 4 — Fase 2 (continuação): migrar renderers restantes para `useEntityLookup`

### Contexto

Na primeira parte da Fase 2, 5 renderers já consomem o hook canônico `useEntityLookup` com fallback `runtime → snapshot legado → "(removido)"`. Restam **5 renderers** ainda lendo nomes diretamente de campos `@deprecated` do snapshot.

### Renderers a migrar

| Renderer | Campos legados → lookup canônico |
|---|---|
| `MbrReport.tsx` | `kpiSnapshots[].name` → `useKpiMetrics`; `teamOkrSnapshots[].teamName` → `useTeams`; `teamOkrSnapshots[].objectives[].title` + `orgOkrSnapshots[].title` → `useObjectives`; `qbrFollowUpItems[].owner.name` → `useProfiles` |
| `MbrPreReport.tsx` | `krFinalStates[].krTitle` → `useKeyResults`; `kpiSnapshots[].name` → `useKpiMetrics` |
| `QbrPreReport.tsx` | `krFinalStates[].krTitle` → `useKeyResults`; `kpiSnapshots[].name` → `useKpiMetrics` |
| `QbrCLevelReport.tsx` | Não lê nomes denormalizados hoje (apenas categorias e flags). **Skip** — nada a migrar. |
| `QbrMeetingReport.tsx` | `approvals[].teamId` (atualmente `slice(0,8)`) → `useTeams`; `crossCommitments[].fromTeamId/toTeamId` → `useTeams`; `crossCommitments[].responsibleUserName` → `useProfiles` |
| `CLevelCheckinReport.tsx` | `reviewedOkrs[]` é genérico (string ou objeto) — sem ID confiável. **Skip** parcial; manter como está. |

Resultado: 4 renderers efetivamente refatorados (MbrReport, MbrPreReport, QbrPreReport, QbrMeetingReport). QbrCLevel e CLevelCheckin ficam fora por não consumirem nomes denormalizados.

### Padrão de implementação (já estabelecido)

1. Coletar IDs únicos do snapshot dentro de `useMemo`.
2. Chamar `useEntityLookup({ teamIds, krIds, objectiveIds, profileIds, kpiIds })`.
3. Resolver via `resolveName(map, id, legacyField)` no JSX.
4. Substituir `id?.slice(0,8)…` por nome resolvido (melhoria visível em QbrMeetingReport).

### Etapas

1. Refatorar `MbrReport.tsx`, `MbrPreReport.tsx`, `QbrPreReport.tsx`, `QbrMeetingReport.tsx`.
2. Atualizar `mem://standards/wizard-snapshot-denormalized-fields-deprecation` com:
   - Lista de renderers já migrados (9/11).
   - Renderers intencionalmente fora (`QbrCLevelReport`, `CLevelCheckinReport`).
   - Snippet canônico de uso do hook.
3. Atualizar `.lovable/plan.md` marcando Fase 2 concluída.
4. Rodar `bunx vitest run src/modules/okrs` (esperar 1765/1766 — falha pré-existente).
5. Gerar relatório curto de fechamento da Onda 4 Fase 2 (no chat, sem novo arquivo).

### Fora de escopo

- Parar de gravar campos denormalizados (writers) — fica para sub-onda futura após período de observação.
- Drop dos campos dos types — só após deixar de gravar.
- Edge functions (`mbr-summary`, `qbr-clevel-learnings-summary`, etc.) — escopo separado.
- Aplicar `DIRECTIVE_TO_DECISION_MAP` no QBR Meeting Step 3 — frente independente.

### Risco

**Baixo.** Padrão já validado em 5 renderers na primeira parte; fallback ao campo legado preserva snapshots antigos sem regressão.

### Validação

- `bunx vitest run src/modules/okrs` verde (mantendo baseline).
- Inspeção visual: abrir 1 MBR, 1 QBR Pre, 1 QBR Meeting completados e confirmar nomes renderizados.

---

## Onda 4 — Fase 2 ✅ CONCLUÍDA

### Entregue
- Hook `useEntityLookup` + helper `resolveName` (já entregues na primeira parte).
- 9 renderers migrados: `TeamCheckinReport`, `LeaderPrepReport`, `ManagersCheckinReport`, `QbrPostReport`, `CollaboratorReport`, `MbrReport`, `MbrPreReport`, `QbrPreReport`, `QbrMeetingReport`.
- 2 renderers fora de escopo (intencional): `QbrCLevelReport` (sem IDs), `CLevelCheckinReport` (snapshot genérico sem ID confiável).
- Memory `wizard-snapshot-denormalized-fields-deprecation` atualizada com pattern canônico, lista de migrados e regra do KR ambíguo.

### Validação
- `bunx vitest run src/modules/okrs`: **1766/1766 passing**.
- Fallback `runtime → snapshot legado → '(removido)'` preserva snapshots antigos.
- Bônus: `QbrMeetingReport` antes mostrava `teamId.slice(0,8)…`; agora mostra nome do time.

### Próximas frentes possíveis
- Aplicar `DIRECTIVE_TO_DECISION_MAP` no QBR Meeting Step 3 (vocabulário canônico).
- Sub-onda futura: parar de gravar campos denormalizados nos writers e dropar dos types.
- Edge functions (`mbr-summary`, `qbr-clevel-learnings-summary`) — escopo separado.
