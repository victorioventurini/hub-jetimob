# Reordenar nav do Summary + adicionar contador de Iniciativas

## Objetivo

No Summary do Check-in Individual, o nav inferior de stats hoje tem 5 items numa ordem arbitrária (KRs, Pulados, KPIs, Marcos, Pendências). Falta **Iniciativas** (apesar de já existir a `section-initiatives` no scaffold com `initiativesAtRisk`). Deixar a sequência espelhar a ordem real do rito.

## Ordem do rito (SSOT em `wizardSteps.ts`)

`context → kpis → projects → initiatives → checkin (KRs) → decisions (pendências) → reflection → summary`

## Nova ordem do nav (filtrando "context", "reflection" e "summary" — não geram contador)

1. **KPIs** → `#section-kpis` — `Activity` — `stats.kpisCompleted`
2. **Marcos** → `#section-projects` — `FolderKanban` — `stats.milestoneChanges`
3. **Iniciativas** → `#section-initiatives` — `Rocket` — `stats.initiativesAtRisk` *(novo item)*
4. **KRs** → `#section-krs` — `CheckCircle2` — `stats.krsCompleted`
5. **Pulados** → `#section-krs` — `SkipForward` — `stats.krsSkipped` *(fica logo após KRs porque é pulados de KR)*
6. **Pendências** → `#section-pendencies` — `ClipboardCheck` — `stats.pendencies`

## Mudanças (arquivo único)

`src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`

- **Imports**: adicionar `Rocket` em `lucide-react`.
- **Bloco `topFixed` (linhas ~754–790)**: reordenar os 5 `<a>` existentes na sequência acima e inserir o novo item "Iniciativas" entre "Marcos" e "KRs". Manter o grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` (já cabe 6).
- Tom de cor do ícone "Iniciativas": `text-warning` quando `stats.initiativesAtRisk > 0`, senão `text-muted-foreground` (mesmo padrão dos demais sinalizadores).

## O que NÃO muda

- `wizardSteps.ts` — ordem canônica intacta.
- Cálculo de `stats` — `initiativesAtRisk` já existe; nada novo no `useMemo`.
- Scaffold (`renderSection` case `initiatives`) — `section-initiatives` já renderiza, só ganha link no nav.
- Markdown copy — linha de iniciativas sinalizadas já existe.

## Validação

- `/rituals/collaborator-checkin?step=summary`: nav inferior mostra 6 items na nova ordem; clique em "Iniciativas" rola para `#section-initiatives`.
- Sem regressão em mobile (grid colapsa para 2/3 colunas).
- TypeScript build limpo.
