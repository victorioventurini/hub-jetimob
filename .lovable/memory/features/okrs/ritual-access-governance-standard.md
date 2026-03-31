# Memory: features/okrs/ritual-access-governance-standard
Updated: 2026-03-31

O acesso aos rituais de gestão é controlado por janelas temporais rigorosas baseadas nas datas do ciclo, contabilizadas em **dias úteis (seg–sex)**. O hook 'useRitualAvailability' bloqueia o acesso fora desses períodos, exibindo a tela informativa 'RitualUnavailableScreen' com a data de abertura prevista. O helper 'addBusinessDaysToDate' garante que todas as janelas respeitem apenas dias úteis.

**Modelo de 2 MBRs por quarter:**
- MBR₁ (`review_date_first_month`): Revisão do 1º mês — 1ª terça-feira do 2º mês do quarter
- MBR₂ (`review_date`): Revisão do 2º mês — 1ª terça-feira do 3º mês do quarter
- O 3º mês é dedicado ao QBR (sem MBR)

**Mapeamento de janelas (dias úteis):**
- `mbr-pre-first`: review_date_first_month -5du a -1du
- `mbr-first`: review_date_first_month a +2du
- `mbr-pre`: review_date -5du a -1du
- `mbr`: review_date a +2du
- `qbr-pre`: planning_date a retro_date -1du
- `qbr-pre-clevel`: planning_date +5du a retro_date -1du
- `qbr-meeting`: retro_date a +2du
- `qbr-post`: retro_date a +5du
- Check-ins: start_date a end_date

**Regra QBR block**: MBR e MBR-pre ficam bloqueados quando `today >= planning_date` (reason: 'qbr_period').

**Reuniões**: Sempre na 1ª terça-feira do mês seguinte ao período revisado (`firstTuesdayOfMonth`).

**Geração automática**: Popula 3 anos de ciclos (Anual + 4 Trimestrais) com fórmulas: `review_date_first_month = firstTuesday(M2)`, `review_date = firstTuesday(M3)`, `planning_date = dia 16 de M3 (Q4: dia 7)`, `retro_date = firstTuesday(M seguinte ao quarter)`.

**Unificação com calendário operacional**: Ao gerar ciclos, o sistema automaticamente atualiza as `ritual_cadences` (MBR = monthly, 1ª terça) e regenera `ritual_occurrences`, populando a página `/settings/rituals`.
