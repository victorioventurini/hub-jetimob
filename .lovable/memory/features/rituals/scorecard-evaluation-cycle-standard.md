# Memory: features/rituals/scorecard-evaluation-cycle-standard
Updated: 2026-04-07

Os scorecards de performance exibidos em rituais de revisão (como 'QBR Meeting' e 'QBR C-Level Quarter Balance') utilizam o último ciclo trimestral **fechado** ('closed') como fonte de dados prioritária, com fallback para o ciclo ativo. O hook `useActiveCycle` expõe `lastClosedQuarterlyCycle` (query ao ciclo `closed` + `quarter` mais recente). O `QbrMeetingPage` usa `lastClosedQuarterlyCycle || activeQuarterlyCycle` como `quarterlyCycle`, garantindo que as métricas reflitam o período que se encerrou mesmo após a transição automática de ciclos.
