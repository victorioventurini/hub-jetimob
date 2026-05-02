## Objetivo

No step `checkin` do Check-in Individual, manter o campo "Comentário" como **texto puro** (sem autocomplete `@`, sem disparo de menções) e confirmar que o conteúdo segue sendo lido nos demais lugares que já consomem `okr_checkins.comments`.

## Conformidade com docs canônicos (pré-checklist)

- **TCR §okr_checkins (linha 753)**: campo `comments` hoje descrito como "Comentários/menções". Vamos atualizar para "Comentário em texto livre (sem processamento de menções neste fluxo)".
- **TCR §mentions (1345)**: tabela global `mentions` com `context_type='checkin'` permanece intacta — `CheckinDialog` (drawer `/okrs`) continua gravando menções normalmente.
- **IDENTITY / RBAC / BU isolation / RLS**: nenhuma alteração. O insert em `okr_checkins` (RLS v3, permissão `okrs.checkin.create:self_or_owner`) continua igual.
- **DEVELOPMENT_STANDARDS**: mudança limitada a UI + remoção de side-effect cliente. Sem novos query keys, sem novas tabelas.
- **AI_AGENTS / WIZARDS_FRAMEWORK**: não tocados.

## Mudanças

**1. `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx`**
- Remover a linha de microcopy "💡 Use @ para mencionar pessoas".
- Manter `<Textarea>` como está (label "Comentário (opcional)", placeholder neutro).

**2. `src/modules/okrs/hooks/useCreateCheckin.ts`**
- Remover a chamada `processMentions(...)` (linhas ~152–156) e a definição local da função `processMentions` (linhas ~67–...) — usada **apenas** dentro deste hook (auditado).
- Manter o `INSERT` em `okr_checkins.comments` igual: o texto livre continua sendo persistido.
- **Não tocar** em `CheckinDialog.tsx` (drawer do KR em `/okrs`) — segue gravando menções via sua própria cópia de `processMentions`.

**3. `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`**
- Linha 753: trocar `Comentários/menções` por `Comentário em texto livre (menções processadas apenas no drawer /okrs)`.
- Adicionar entrada no changelog na seção apropriada do TCR.

## Reaproveitamento de `okr_checkins.comments` (sem mudança necessária)

| Onde | Arquivo |
|---|---|
| Histórico do KR (drawer/timeline) | `src/modules/okrs/components/KrCheckinsTable.tsx` |
| Feed de check-ins do ciclo | `src/modules/okrs/components/cycle-checkins/CycleCheckinsFeed.tsx` |
| Tabela de check-ins do ciclo | `src/modules/okrs/components/cycle-checkins/CycleCheckinsTable.tsx` |
| Último check-in nos cards do wizard | `useUserKrsForWizard.ts`, `useTeamPendingKrs.ts` (campo `latest_checkin.comments`) |
| E-mail resumo do Check-in Individual | `supabase/functions/collaborator-checkin-summary/index.ts` (lê `comment` do snapshot do wizard) |
| Análise/IA | `supabase/functions/analysis-generate/index.ts` (`CheckinRow.comments`) |

## Validação

- `/rituals/collaborator-checkin?step=checkin`: microcopy de `@` ausente; campo aceita texto puro.
- Salvar check-in com texto contendo `@nome` → **não** dispara notificação de menção; nenhum registro novo em `mentions` para esse insert.
- Drawer do KR em `/okrs` (`CheckinDialog`): @menção continua funcionando (não é tocada).
- Drawer do KR mostra o comentário no histórico; feed e tabela do ciclo idem.
- E-mail `collaborator-checkin-summary` continua incluindo o `comment` no bloco de KRs.

## Não-objetivos

- Não alterar schema de `okr_checkins`.
- Não alterar RLS / permissions.
- Não remover o sistema de menções em outros fluxos (CheckinDialog, projects, tickets).
- Não mexer em `blockers`.
