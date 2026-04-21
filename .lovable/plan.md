

# Padronização de Nomenclatura dos Ritos no Hub

## Decisão sobre o prompt sugerido (Claude/GPT)

A proposta externa cobre apenas **labels visíveis**, sem alterar slugs — o que está alinhado ao TCR e às memórias canônicas. Porém, **2 nomes do mapeamento sugerido divergem dos padrões atuais do projeto** e precisam de ajuste antes da execução:

| Sugestão externa | Estado atual no projeto | Decisão recomendada |
|---|---|---|
| **"Check-in Individual"** (era "Check-in do Colaborador") | Hoje aparece como **"Check-in Semanal"** em `WIZARD_CONFIGS`/cards e como "Check-in do Colaborador" em hooks de availability/history. O nome "Semanal" reforça a cadência canônica documentada em `mem://features/rituals/collaborator-checkin-pending-items-step` e `off-cycle-accessibility-standard`. | **Adotar "Check-in Individual"** conforme a sugestão — é mais claro e neutro de cadência (o rito é acessível off-cycle). Substitui tanto "Check-in Semanal" quanto "Check-in do Colaborador". |
| **"Check-in Executivo"** (era "Check-in C-Level") | Hoje aparece como **"Check-in Estratégico"** em `clevel-checkin` config + page title. | **Adotar "Check-in Executivo"** conforme sugestão — alinha com o nome "Pré-QBR Executivo" e cria família coerente. |

Demais nomes da sugestão são aplicados na íntegra. O termo "Pré Check-in do Time" recebe hífen ("**Pré-Check-in do Time**") para padronizar com `Pré-MBR`/`Pré-QBR`.

## Mapa final de labels (single source of truth)

| Slug técnico (imutável) | Label antiga(s) encontrada(s) | **Label nova** |
|---|---|---|
| `collaborator` | "Check-in Semanal" / "Check-in do Colaborador" / "Check-in Colaborador" | **Check-in Individual** |
| `leader-prep` | "Preparação do Líder" / "Pré Check-in do Time" | **Pré-Check-in do Time** |
| `team-checkin` | "Check-in do Time" | **Check-in do Time** *(mantém)* |
| `clevel-checkin` | "Check-in Estratégico" / "Check-in C-Level" | **Check-in Executivo** |
| `team-okr-creation` | "Criação de OKRs do Time" / "Criar OKRs do Time" | **Criação de OKRs do Time** *(mantém)* |
| `team-kr-creation` | "Criação de KRs do Time" / "Criação de Key Results" | **Criação de KRs do Time** |
| `mbr-pre` | "Pré-MBR" | **Pré-MBR** *(mantém)* |
| `mbr` | "Monthly Business Review" / "MBR — Monthly Business Review" | **MBR** |
| `qbr-pre` | "Pré-QBR do Time" / "Pré-QBR (Líder)" / "QBR — Preparação" | **Pré-QBR** |
| `qbr-pre-clevel` | "Pré-QBR C-Level" / "Pré-QBR (C-Level)" / "QBR Pre — C-Level" | **Pré-QBR Executivo** |
| `qbr-meeting` | "Reunião QBR" / "QBR Meeting" | **QBR** |
| `qbr-post` | "Pós-QBR" / "QBR Post" | **Pós-QBR** *(mantém)* |

### Labels de histórico (back-compat — mantêm sufixo)
- `managers-checkin` → **"Check-in de Gestores (descontinuado)"**
- `mbr-first` → **"MBR (histórico)"**
- `mbr-pre-first` → **"Pré-MBR (histórico)"**

## Regras de implementação (TCR-compliant)

- **Nenhum slug, route, query key, permission key, persona, ID de step ou tipo TS é alterado.** Apenas strings de UI.
- **Fonte única de labels:** consolidar todos os mapas em um único arquivo `src/modules/okrs/constants/ritualLabels.ts` exportando `RITUAL_LABELS: Record<WizardPersona, string>` + helper `getRitualLabel(persona)`. Os hooks/configs passam a importar dele.
- **Texto auxiliar:** descriptions e tooltips que mencionem o nome do rito também são atualizados (ex.: "preparação para o **MBR**" em vez de "Monthly Business Review").
- **Histórico em banco:** os slugs em `okr_wizard_sessions.wizard_type`, `ritual_occurrences.wizard_type`, `ritual_cadences.wizard_type` permanecem inalterados — UI faz tradução via `RITUAL_LABELS`.

## Arquivos afetados

### 1. Novo arquivo (SSOT)
- **`src/modules/okrs/constants/ritualLabels.ts`** — criar com `RITUAL_LABELS` final + `getRitualLabel(persona)`.

### 2. Atualização de fontes de labels (passam a importar do SSOT)
- `src/modules/okrs/types/wizard.ts` — atualizar `title` em `WIZARD_CONFIGS` (12 personas) usando `RITUAL_LABELS`.
- `src/modules/okrs/hooks/useRitualHistory.ts` — substituir `WIZARD_TYPE_LABELS` local pelo import do SSOT.
- `src/modules/okrs/hooks/useRitualAvailability.ts` — substituir `RITUAL_LABELS` local pelo import do SSOT.
- `src/modules/okrs/components/wizards/shared/CompletedRitualView.tsx` — substituir `RITUAL_LABELS` local pelo import do SSOT.

### 3. Páginas (page titles + headers)
- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` — `usePageTitle('Check-in Individual')`.
- `src/modules/okrs/pages/CLevelCheckinPage.tsx` — `usePageTitle('Check-in Executivo')`.
- `src/modules/okrs/pages/TeamCheckinPage.tsx` — fallback "Check-in do Time" (inalterado).
- `src/modules/okrs/pages/MbrPage.tsx` — title "MBR".
- `src/modules/okrs/pages/MbrPrePage.tsx` — title "Pré-MBR" (inalterado).
- `src/modules/okrs/pages/LeaderPrepPage.tsx` — title "Pré-Check-in do Time".
- `src/modules/okrs/pages/QbrPrePage.tsx` — title "Pré-QBR" + `FullPageWizardShell title="Pré-QBR"`.
- `src/modules/okrs/pages/QbrPreCLevelPage.tsx` — title "Pré-QBR Executivo".
- `src/modules/okrs/pages/QbrMeetingPage.tsx` — title "QBR".
- `src/modules/okrs/pages/QbrPostPage.tsx` — title "Pós-QBR".
- `src/modules/okrs/pages/ExecutiveQuarterReviewPage.tsx` — referências a "MBR" / "QBR" nos cabeçalhos.

### 4. Hub de Rituais e cards
- `src/pages/Wizards.tsx` — atualizar `WIZARD_SECTIONS` (8 entradas: collaborator, team-okr-creation, leader-prep, team-checkin, mbr-pre, clevel-checkin, mbr) e builders QBR (`getQbrLeaderWizards`, `getQbrExecutiveWizards`).
- `src/pages/Index.tsx` — labels em cards.
- `src/modules/okrs/components/wizards/collaborator/CollaboratorWizardCard.tsx` — "Check-in Individual" (e remover lógica condicional "Atualizar OKRs"/"Check-in Semanal" → ficar "Check-in Individual" sempre, mantendo badge dinâmica).
- `src/modules/okrs/components/wizards/leader-prep/LeaderPrepWizardCard.tsx` — "Pré-Check-in do Time".
- `src/modules/okrs/components/wizards/team-checkin/TeamCheckinWizardCard.tsx` — inalterado.
- `src/modules/okrs/components/wizards/clevel-checkin/CLevelCheckinWizardCard.tsx` — "Check-in Executivo".
- `src/modules/okrs/components/wizards/mbr/MbrWizardCard.tsx` — `CardTitle` "MBR" + descrição mantida.
- `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrCreationWizardCard.tsx` — labels.

### 5. Calendário, settings e auditoria
- `src/modules/okrs/components/settings/RitualsTab.tsx` — labels do timeline QBR (Pré-QBR, Pré-QBR Executivo, QBR, Pós-QBR).
- `src/modules/okrs/components/settings/CycleRitualDates.tsx` — labels.
- `src/modules/okrs/pages/RitualHistoryPage.tsx` — `WIZARD_TYPE_OPTIONS` consome SSOT (mantém histórico de descontinuados).
- Componentes de calendário operacional (busca por `wizard_type` em `src/modules/okrs/components/calendar/*` e `src/modules/calendar/*` se houver) — labels via SSOT.

### 6. Tooltips, AI prompts e relatórios
- `src/modules/okrs/components/wizards/shared/WizardTooltips.tsx` — comentários de seção atualizados (não-funcional, apenas DX).
- `src/modules/okrs/components/ritual-report/renderers/*.tsx` — títulos de seções nos snapshots usam SSOT.
- `supabase/functions/_shared/tcr-content.ts` (linhas 417-421) — labels de IA mantêm os nomes técnicos atuais (texto interno do TCR; **fora do escopo de UI**, não alterar).

### 7. E2E
- `e2e/okr-wizards.spec.ts` — atualizar `label` de "QBR Pre"→"Pré-QBR", "QBR Meeting"→"QBR", "QBR Post"→"Pós-QBR".

## Atualização de memória canônica

- **`mem://features/okrs/management-rituals-standard-v2`** — atualizar tabela de ritos com nova nomenclatura.
- **`mem://index.md`** — adicionar nova entrada **"Ritual Labels SSOT"** apontando para `src/modules/okrs/constants/ritualLabels.ts` como fonte única.

## Critérios de aceite

- ✅ Todos os ritos exibem os novos nomes em hub, cards, headers, calendário, histórico, tooltips de relatório.
- ✅ Nenhum slug, rota, persona, query key ou permission key foi alterado.
- ✅ "Monthly Business Review" não aparece mais como nome de rito (apenas como descrição auxiliar opcional).
- ✅ "Reunião QBR" / "QBR Meeting" / "QBR Pre" / "QBR Post" eliminados da UI.
- ✅ "Check-in C-Level" / "Check-in Estratégico" / "Check-in Semanal" / "Check-in do Colaborador" eliminados da UI.
- ✅ Labels de histórico para ritos descontinuados (`managers-checkin`, `mbr-first`, `mbr-pre-first`) preservam sufixo identificador.
- ✅ Build TypeScript verde; testes E2E atualizados.

## Checklist TCR

- [x] Sem `select('*')`.
- [x] Query keys inalteradas.
- [x] BU-scoping preservado (mudança puramente de UI).
- [x] Sem hardcode de roles.
- [x] Slugs/routes/personas/IDs imutáveis.
- [x] SSOT de labels evita drift futuro.
- [x] Histórico read-only preservado com sufixos identificadores.

