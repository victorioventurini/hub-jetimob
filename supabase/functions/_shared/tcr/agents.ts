import type { TcrSection } from "./types.ts";

export const agentsSection: TcrSection = {
  title: "6. Agentes de IA",
  content: `
### 6.1 Arquitetura de Agentes

Os agentes são configurados na tabela \`ai_agents\` e invocados via edge function \`invoke-vic\`.
Todos os agentes utilizam o modelo \`google/gemini-3-flash-preview\` via Lovable AI (sem API key do usuário).

| Campo | Descrição |
|-------|-----------|
| \`slug\` | Identificador único do agente |
| \`integration_key\` | Qual LLM usar (\`lovable-ai\`) |
| \`model_name\` | Modelo: \`google/gemini-3-flash-preview\` |
| \`system_prompt\` | Prompt base do agente |
| \`output_format\` | \`text\`, \`json\`, \`structured\` |
| \`scope\` | \`global\` ou \`bu\` |

### 6.2 Agentes Ativos (11)

| Slug | Descrição | Uso |
|------|-----------|-----|
| \`persona-vic\` | Assistente principal do Next (Vic) | Chat, sidebar |
| \`coach-okrs\` | Coach de OKRs | Wizards de check-in |
| \`kr-advisor\` | Assistente de Key Results | Criação de KRs |
| \`initiative-validator\` | Validador de iniciativas | Wizard de OKRs |
| \`analista-kpis\` | Analista de indicadores | MBR, QBR |
| \`alinhamento-estrategico\` | Alinhamento estratégico | MBR, QBR |
| \`facilitador-decisoes\` | Facilitador de decisões | MBR, QBR |
| \`revisor-comunicacao\` | Revisor de comunicação interna | QBR summaries |
| \`hr-onboarding-assistant\` | Assistente de onboarding RH | Onboarding |
| \`ticket-assistant\` | Assistente de tickets | Tickets |
| \`hub-admin-assistant\` | Assistente administrativo | Next admin |

### 6.3 Invocação

\`\`\`typescript
const { data } = await supabase.functions.invoke('invoke-vic', {
  body: {
    agent_slug: 'coach-okrs',
    context: { objective_id: '...' },
    user_message: 'Como melhorar este objetivo?',
  },
});
\`\`\`

### 6.4 Edge Functions de Resumo (IA)

| Function | Ritual | Agentes utilizados |
|----------|--------|--------------------|
| \`collaborator-checkin-summary\` | Check-in Colaborador | coach-okrs |
| \`team-checkin-summary\` | Check-in Time | coach-okrs, alinhamento-estrategico |
| \`clevel-checkin-summary\` | Check-in C-Level | analista-kpis, alinhamento-estrategico |
| \`mbr-summary\` | MBR | analista-kpis, alinhamento-estrategico, facilitador-decisoes |
| \`qbr-pre-summary\` | QBR Pré-Líderes | analista-kpis, facilitador-decisoes, revisor-comunicacao |
| \`qbr-meeting-summary\` | QBR Reunião | analista-kpis, facilitador-decisoes, revisor-comunicacao |
| \`qbr-post-summary\` | QBR Pós | analista-kpis, facilitador-decisoes, revisor-comunicacao |
`,
};
