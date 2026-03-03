# Memory: features/okrs/ritual-history-intent
Updated: 2026-03-03

O sistema possui uma funcionalidade completa de histórico de rituais em `/okrs/ritual-history`. Todos os 4 rituais de conclusão (Team Check-in, MBR, C-Level Check-in, Collaborator Check-in) disparam e-mails de resumo pós-conclusão via Edge Functions dedicadas:

1. **Team Check-in** (`team-checkin-summary`): 4 agentes IA (analista-kpis, facilitador-decisoes, cultura, revisor-comunicacao). Destinatários: membros do time + subtimes sem OKRs + líder.
2. **MBR** (`mbr-summary`): 3 agentes IA (analista-kpis, facilitador-decisoes, revisor-comunicacao). Destinatários: líderes de times diretos (sem sub-times).
3. **C-Level Check-in** (`clevel-checkin-summary`): 3 agentes IA (analista-kpis, facilitador-decisoes, revisor-comunicacao). Destinatários: líderes de áreas + co-líderes + BU admins.
4. **Collaborator Check-in** (`collaborator-checkin-summary`): 2 agentes IA (analista-kpis, revisor-comunicacao). Destinatários: colaborador + líder do time.

Todos os e-mails incluem: resumo gerado por IA no corpo, link para `/okrs/ritual-history?session={id}`, BCC silencioso para `hub@jetimob.com` (via GLOBAL_BCC_EMAIL em email.ts), e idempotência via `summary_sent_at`. Leader Prep é preparatório e NÃO dispara e-mail de resumo.
