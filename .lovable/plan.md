
## Plano: Ajuste de Microcopy — Análise no Pré-QBR C-Level, Decisão na Reunião QBR

### Princípio
O **qbr-pre-clevel** é onde a **análise** acontece (individualmente, antes da reunião). O **qbr-meeting** é onde a **decisão** acontece (coletivamente, com a sala toda). Todo microcopy deve reforçar essa distinção.

### Escopo
Apenas textos — **zero alteração de lógica, gates, snapshots ou componentes visuais**.

---

### 1. QbrPreCLevelPage.tsx — Header do wizard
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Pré-QBR C-Level" | "Pré-QBR C-Level" *(mantém — é label do shell)* |
| `subtitle` | "Análise estratégica consolidada e direcionamentos" | "Análise estratégica do quarter — sua visão antes da reunião" |

Adicionar subtítulo descritivo abaixo: *"Registre sua análise agora. Na reunião, a sala decide com base no que você preparou aqui."*
> **Nota:** O `FullPageWizardShell` aceita `subtitle` como string. O subtítulo adicional será concatenado.

### 2. QbrCLevelSystemReadStep.tsx — Step 1
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Leitura do Sistema" | "O que os times reportaram" |
| `description` | Dynamic count | "Leia os dados dos líderes antes de registrar sua análise. Essa é a matéria-prima da sua preparação." |

### 3. QbrCLevelQuarterBalanceStep.tsx — Step 2
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Balanço do Quarter — {cycleName}" | "Como o quarter foi na prática — {cycleName}" |
| `description` | "Desempenho dos OKRs..." | "OKRs organizacionais e entrega de cada time. Analise antes de calibrar as propostas." |
| Bloco A título | "Como foram os OKRs da empresa no {cycleName}" | "OKRs da empresa neste quarter" |
| Bloco A subtítulo | *(nenhum)* | "Progresso real de cada KR org e quais times contribuíram." |
| Bloco B título | "O que cada time entregou" | *(mantém)* |
| Bloco B subtítulo | *(nenhum)* | "Use isso para calibrar as propostas do próximo ciclo." |

### 4. QbrCLevelStrategicStep.tsx — Step 3
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Análise Estratégica" | "Sua análise — o que só você vê daqui" |
| `description` | "Reflexão exclusiva do C-Level sobre direção e prioridades" | "Registre o que a visão consolidada revelou. Esses insights pautam a reunião." |

### 5. QbrCLevelOkrValidationStep.tsx — Step 4
| Campo | Atual | Novo |
|-------|-------|------|
| `title` (2 ocorrências) | "Validação de OKRs" | "Calibração das propostas" |
| `description` (empty state) | "Nenhuma proposta de OKR encontrada" | "Nenhuma proposta de OKR encontrada" *(mantém)* |
| `description` (normal) | "Time X de Y" | *(mantém — é informação contextual)* |
| Texto de instrução | *(nenhum)* | Adicionar `<p>` antes do conteúdo: "Adicione flags onde a proposta precisa de ajuste. Na reunião, a sala vai ver sua análise antes de votar." |

### 6. QbrCLevelDirectivesStep.tsx — Step 5
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Direcionamentos e Decisões" | "Pauta obrigatória da reunião" |
| `description` | "Pauta obrigatória para a reunião QBR" | "Defina o que a sala precisa debater e decidir. Esses itens abrem a reunião." |
| Texto instrução interno | "Defina os temas que devem ser debatidos..." | "Cada item aqui vira pauta obrigatória na Reunião QBR. A sala não avança sem endereçar o que você registrar." |

### 7. WIZARD_STEPS no QbrPreCLevelPage.tsx
| Step | label atual | label novo | description atual | description novo |
|------|-------------|------------|-------------------|-----------------|
| system-read | "Leitura do Sistema" | "Dados dos Times" | "Consolidação dos pré-QBRs" | "O que os times reportaram" |
| quarter-balance | "Balanço do Quarter" | "Balanço do Quarter" | "Desempenho do ciclo" | "Como foi na prática" |
| strategic-analysis | "Análise Estratégica" | "Sua Análise" | "Reflexão C-Level" | "O que só você vê" |
| okr-validation | "Validação de OKRs" | "Calibração" | "Calibração das propostas" | "Flags nas propostas" |
| directives | "Direcionamentos" | "Pauta da Reunião" | "Pauta do QBR" | "O que a sala decide" |

---

### 8. QbrMeetingPage.tsx — Header do wizard
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Reunião QBR" | "Reunião QBR" *(mantém)* |
| `subtitle` | "Revisão e aprovação de OKRs — decisões estratégicas e compromissos cross-área" | "Reunião QBR — decisões com base na análise do C-Level. A análise já foi feita. Agora a sala decide, aprova e compromete." |

### 9. WIZARD_STEPS no QbrMeetingPage.tsx
| Step | label atual | label novo | description atual | description novo |
|------|-------------|------------|-------------------|-----------------|
| opening | "Abertura" | "Contexto" | "Pauta e direcionamentos" | "Análise do C-Level" |
| okr-review | "Revisão OKRs" | "Aprovação OKRs" | "Aprovação por time" | "Time por time" |
| decisions | "Decisões" | "Decisões" | "Decisões estratégicas" | "Dono e prazo" |
| commitments | "Compromissos" | "Compromissos" | "Cross-área" | "Entre times" |
| closing | "Encerramento" | "Encerramento" | "Governança" | "Governança" |

### 10. QbrMeetingOpeningStep.tsx — Step 1
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Abertura do QBR" | "Contexto da reunião" |
| `description` | "Contexto e direcionamentos estratégicos" | "O C-Level analisou o quarter e definiu a pauta. Aqui está o que você precisa saber antes de começar." |
| Bloco Scorecard título | "Scorecard do Quarter" | *(mantém — informacional)* |
| Bloco retrospectiva título | "Como Chegamos Aqui" | "Entrega do quarter por time" |
| Bloco retrospectiva subtítulo | *(nenhum)* | "Contexto pré-analisado. A sala usa isso para calibrar as aprovações." |
| Bloco OKRs org título | "OKRs da Empresa neste Quarter" | "Como chegamos aqui — OKRs da empresa" |
| Bloco OKRs org subtítulo | *(nenhum)* | "Analisado pelo C-Level no Pré-QBR. Use como contexto, não para reanalisar." |
| Bloco vetos label | "Vetos estratégicos" | "Vetos do C-Level — não entra no próximo ciclo" |
| Bloco pauta título | "Pauta Obrigatória" | "O que o C-Level quer que a sala decida" |
| Bloco pauta subtítulo | *(nenhum)* | "Cada item abaixo é pauta obrigatória. Não saia da reunião sem endereçar." |

### 11. QbrMeetingOkrReviewStep.tsx — Step 2
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Revisão de OKRs por Time" | "Aprovação de OKRs — time por time" |
| `description` | Dynamic count | *(mantém — contextual)* |
| Bloco flags título | *(inline, sem título)* | *(manter como está — são badges inline)* |
| Bloco cobertura título | "Contribuições para OKRs organizacionais" | "KRs organizacionais que esta proposta cobre" |
| Bloco cobertura subtítulo | *(nenhum)* | "Aprovando esta proposta, estes objetivos da empresa ganham contribuição." |
| Bloco cobertura reversa título | "KRs org sem cobertura até agora" | *(mantém)* |
| Bloco cobertura reversa subtítulo | *(nenhum)* | "Atualizado em tempo real conforme as aprovações avançam." |

### 12. QbrMeetingDecisionsStep.tsx — Step 3
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Decisões Estratégicas" | "Decisões da reunião" |
| `description` | "Toda decisão precisa de dono e prazo" | "Cada decisão precisa de dono e prazo. Sem isso, não é decisão — é intenção." |

### 13. QbrMeetingCommitmentsStep.tsx — Step 4
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Compromissos Cross-Área" | "Compromissos entre times" |
| `description` | "Dependências formalizadas entre times" | "O que um time precisa do outro para cumprir o que foi aprovado." |

### 14. QbrMeetingClosingStep.tsx — Step 5
| Campo | Atual | Novo |
|-------|-------|------|
| `title` | "Encerramento" | "Encerramento e governança" |
| `description` | "Checklist de governança e feedback do rito" | "Confirme que a reunião gerou o que precisa antes de fechar." |

---

### Arquivos impactados (13 arquivos, apenas texto)
1. `src/modules/okrs/pages/QbrPreCLevelPage.tsx`
2. `src/modules/okrs/pages/QbrMeetingPage.tsx`
3. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelSystemReadStep.tsx`
4. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelQuarterBalanceStep.tsx`
5. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelStrategicStep.tsx`
6. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelOkrValidationStep.tsx`
7. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelDirectivesStep.tsx`
8. `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingOpeningStep.tsx`
9. `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingOkrReviewStep.tsx`
10. `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingDecisionsStep.tsx`
11. `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingCommitmentsStep.tsx`
12. `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingClosingStep.tsx`

### O que NÃO muda
- Lógica de nenhum step
- Gates de navegação
- Snapshots e reflection_data
- Componentes visuais
- Testes (textos nos testes serão atualizados onde necessário para manter coerência)

### Conformidade TCR
- ✅ Sem alteração de lógica, queries, RLS ou schema
- ✅ Sem novos componentes ou hooks
- ✅ Sem alteração de identity/RBAC
- ✅ Semantic tokens preservados
- ✅ Barrel exports intactos
