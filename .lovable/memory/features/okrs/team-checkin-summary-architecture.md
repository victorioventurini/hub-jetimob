# Memory: features/okrs/team-checkin-summary-architecture
Updated: 2026-02-07

O "E-mail de Resumo do Check-in do Time" é um rito oficial de fechamento automatizado. Arquitetura: 1) Disparo best-effort no frontend ('TeamCheckinPage.tsx') aciona a Edge Function 'team-checkin-summary'; 2) A função orquestra 4 agentes de IA existentes ('analista-kpis', 'facilitador-decisoes', 'cultura', 'revisor-comunicacao') em paralelo via 'invoke-vic'; 3) Idempotência garantida pela coluna 'summary_sent_at' na tabela 'okr_wizard_sessions'; 4) Entrega via evento de notificação 'team.checkin.summary' no pipeline canônico. O conteúdo foca em gestão por exceção (sinais relevantes, riscos e focos) para leitura rápida.

**REGRA CANÔNICA DE INTERPRETAÇÃO DE PROGRESSO (v2.87.0):**
- KPIs não possuem ciclo próprio; herdam o ciclo da KR vinculada
- Avaliação por RITMO (acima/dentro/abaixo do ritmo), não por valor final
- Metas de longo prazo interpretadas proporcionalmente ao tempo transcorrido
- Linguagem estratégica: evitar "atrasado", usar "abaixo do ritmo esperado"
- Início de ciclo (<15%): não fazer julgamentos precipitados
- As regras são injetadas automaticamente em todos os agentes via 'CANONICAL_PROGRESS_INTERPRETATION_RULES' no 'agent-loader.ts'
