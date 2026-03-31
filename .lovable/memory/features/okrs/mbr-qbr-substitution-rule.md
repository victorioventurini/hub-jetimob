# Memory: features/okrs/mbr-qbr-substitution-rule
Updated: 2026-03-31

O sistema de governança de rituais implementa uma regra de substituição para evitar redundância: rituais MBR, MBR-pre, MBR-first e MBR-pre-first são automaticamente bloqueados quando `today >= planning_date` do ciclo trimestral ativo. Isso se deve ao fato de que o 3º mês do quarter é dedicado exclusivamente ao QBR — o MBR que revisaria esse mês é absorvido pelo rito de QBR. Nesses casos, o hook 'useRitualAvailability' retorna a razão 'qbr_period' e a interface 'RitualUnavailableScreen' direciona o usuário para o rito de QBR correspondente. Na listagem de ciclos ('CyclesTab'), os rituais são exibidos com 4 datas: MBR₁ (review_date_first_month), MBR₂ (review_date), QBR-pre (planning_date) e QBR (retro_date).
