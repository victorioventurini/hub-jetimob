import type { TcrSection } from "./types.ts";

export const entitiesSection: TcrSection = {
  title: "2. Domínio de Dados",
  content: `
### 2.1 Entidades Principais

#### **bu_units** — Business Units
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome da BU |
| allowed_email_domains | text[] | Domínios permitidos para login |
| logo_url | text | URL do logo |
| primary_color | text | Cor primária (hex) |
| status | enum | \`active\`, \`inactive\` |

#### **profiles** — Perfis de Usuários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| first_name | text | Nome |
| last_name | text | Sobrenome |
| display_name | text | Nome de exibição |
| work_email | text | Email corporativo |
| job_title | text | Cargo |
| team_id | uuid | FK para teams |
| onboarding_completed | bool | Onboarding concluído |

#### **bu_user_memberships** — Memberships por BU
| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | uuid | FK para auth.users |
| bu_id | uuid | FK para bu_units |
| role_in_bu | enum | Role dentro da BU específica |
| is_default | bool | Se é a BU padrão do usuário |

#### **teams** — Times
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do time |
| leader_user_id | uuid | Líder do time |
| parent_team_id | uuid | Time pai (hierarquia) |
| bu_id | uuid | FK para bu_units |

### 2.2 Módulo OKRs

#### **okr_org_objectives** — Objetivos Organizacionais
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| title | text | Título do objetivo |
| year | int | Ano do objetivo |
| owner_user_id | uuid | Responsável |
| status | enum | \`draft\`, \`active\`, \`completed\`, \`cancelled\` |
| bu_id | uuid | FK para bu_units |

#### **okr_team_key_results** — KRs de Time
| Campo | Tipo | Descrição |
|-------|------|-----------|
| team_objective_id | uuid | FK para objetivo do time |
| title | text | Título |
| type | enum | \`contribution\`, \`enabler\`, \`foundational\` |
| baseline | numeric | Valor inicial |
| current_value | numeric | Valor atual |
| target | numeric | Meta |
| direction | enum | \`up\`, \`down\` |
| status | enum | RAG status (\`green\`, \`yellow\`, \`red\`, \`not_started\`) |

#### **okr_checkins** — Check-ins de KRs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| kr_id | uuid | FK para team_key_results |
| current_value | numeric | Valor novo |
| confidence | enum | \`high\`, \`medium\`, \`low\` |
| blockers | text | Bloqueadores |
| comments | text | Comentários/menções |

### 2.3 Módulo KPIs

#### **kpi_metrics** — Métricas/KPIs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | text | Nome do KPI |
| category | enum | \`financeiro\`, \`growth\`, \`cs\`, \`produto\`, \`operacoes\`, \`pessoas\` |
| direction | enum | \`up\`, \`down\` |
| frequency | enum | \`daily\`, \`weekly\`, \`monthly\`, \`quarterly\`, \`manual\` |
| target_value | numeric | Meta |

#### **kpi_values** — Valores de KPIs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| kpi_id | uuid | FK para kpi_metrics |
| value | numeric | Valor |
| reference_date | date | Data de referência |
| source | enum | \`manual\`, \`api\`, \`webhook\`, \`spreadsheet\`, \`database\` |
| input_type | enum | \`consolidated\`, \`partial\` (v3.0.0 — substituiu \`confidence\`) |
`,
};
