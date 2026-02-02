
# Plano: Atualização da Documentação Técnica (TCR v2.78.0)

## 1. Objetivo

Atualizar toda a documentação técnica do projeto para refletir as implementações recentes:
- **Organogram Text Export v1.0** — Exportação do organograma em formato ASCII
- **Dashboard Ticket Links v1.0** — Links filtrados nos contadores de tickets
- **PII Security Views Update v1.0** — Views atualizadas para remover campos sensíveis
- **OKR Wizards Documentation** — Documentação dos 5 wizards existentes

---

## 2. Análise do Pré-Checklist (Documentos Consultados)

| Documento | Versão Atual | Status |
|-----------|--------------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | v2.77.0 | Precisa atualização para v2.78.0 |
| `UI_COMPONENTS_REGISTRY.md` | v1.2.0 (2026-02-02) | ✅ Atualizado |
| `DOCUMENTATION_INDEX.md` | TCR v2.72.0 | Desatualizado → v2.78.0 |
| `docs/canonical/README.md` | v2.77.0 | Precisa atualização para v2.78.0 |

### 2.1 Verificação de Componentes

**Nenhum componente novo foi criado.** Todas as alterações usaram componentes canônicos existentes:

| Alteração | Componentes Utilizados |
|-----------|----------------------|
| Botão de export no organograma | `Button`, `Tooltip`, `Copy` (lucide) — existentes |
| Links nos contadores do dashboard | `Link` (react-router-dom) — existente |
| Toast de confirmação | `toast` de `sonner` — existente |

**Utilitário criado:** `src/modules/teams/utils/organogramToText.ts` (função pura, não componente)

---

## 3. Arquivos a Modificar

| Arquivo | Ação | Mudança |
|---------|------|---------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Atualizar | Header v2.78.0, seção 4.8 OKR Wizards, seção Teams export, changelog |
| `docs/DOCUMENTATION_INDEX.md` | Atualizar | Versões e referências |
| `docs/canonical/README.md` | Atualizar | Versão TCR |

---

## 4. Detalhes das Atualizações

### 4.1 TECHNICAL_CONTEXT_REGISTRY.md

**A. Header — Linhas 1-6**

Atualizar versão e status:
```text
**Versão:** 2.78.0  
**Última atualização:** 2026-02-02 (v2.78.0 - OKR Wizards Docs + Organogram Text Export + PII Security Views)
**Status:** ... | **Organogram Text Export v1.0** | **Dashboard Ticket Links v1.0** | **PII Security Views Update v1.0** | **System Health Score 9.5/10** ✅
```

**B. Expandir Seção 4.8 — OKR Wizards (após linha ~1720)**

Renomear de "Wizard Colaborador — Filtro de KRs" para "OKR Wizards — Rituais de Gestão" e expandir:

```markdown
### 4.8 OKR Wizards — Rituais de Gestão

O Hub implementa 5 wizards full-page para rituais de OKRs, cada um com propósito e periodicidade específicos.

| Wizard | Rota | Propósito | Frequência | Participante |
|--------|------|-----------|------------|--------------|
| **Collaborator Check-in** | `/okrs/collaborator-checkin` | Atualização individual de KRs, iniciativas e reflexão | Semanal (sextas) | Colaborador |
| **Leader Prep** | `/okrs/leader-prep` | Preparação do líder para rituais do time | Semanal (segundas) | Líder de time |
| **Team Check-in** | `/okrs/team-checkin` | Ritual síncrono de revisão coletiva | Semanal | Líder + membros |
| **Managers Check-in** | `/okrs/managers-checkin` | Alinhamento cross-time e resolução de dependências | Quinzenal/Mensal | Gestores de área |
| **C-Level Check-in** | `/okrs/clevel-checkin` | Revisão estratégica de OKRs organizacionais | Mensal | C-Level/Diretores |

**Localização:** `src/modules/okrs/components/wizards/` e `src/modules/okrs/pages/`

**Características comuns:**
- Formato full-page (modal removido em v2.27.0)
- Salvamento de draft automático
- Navegação step-based com validação
- Integração com ciclo trimestral ativo

#### Collaborator Check-in — Filtro de KRs

O wizard de check-in semanal (`/okrs/collaborator-checkin`) busca KRs onde o usuário efetivo:

1. ✅ É **owner** da KR (`owner_user_id = effectiveUserId`)
2. ✅ É **co-responsável** da KR (`co_responsibles` contém `effectiveUserId`)
3. ✅ É **owner de pelo menos uma iniciativa** vinculada à KR

**Hook:** `useUserKrsForWizard` (src/modules/okrs/hooks/useUserKrsForWizard.ts)
```

**C. Adicionar Seção de Teams — Utilitários (após seção de Teams existente)**

```markdown
#### Utilitários do Módulo Teams

| Utilitário | Arquivo | Descrição |
|------------|---------|-----------|
| `organogramToText` | `src/modules/teams/utils/organogramToText.ts` | Converte organograma para ASCII tree |

**Formato de Saída:**
- Header com nome da BU e timestamp
- Estrutura hierárquica (CEO → Áreas → Times → Subtimes → Squads → Membros)
- Respeita filtros ativos (`showMembers`, `showSquads`)
- Footer com contagem de pessoas

**Uso:** Botão de cópia nos controles do organograma (normal e fullscreen).
```

**D. Changelog — Adicionar v2.78.0 (antes de v2.77.0)**

```markdown
### v2.78.0 (2026-02-02)
- **Organogram Text Export v1.0**:
  - Novo utilitário `organogramToText.ts` para conversão ASCII
  - Botão de exportar em `OrganogramControls` (normal + fullscreen)
  - Formato legível para análise por LLMs (GPT, Claude)
  - Respeita filtros de visualização (membros, squads)
  - Copia para clipboard com toast de confirmação
- **Dashboard Ticket Links v1.0**:
  - Contadores de tickets na home agora são clicáveis
  - Links navegam para `/tickets` com filtros pré-aplicados
  - "Abertos" → `/tickets`
  - "Vencidos" → `/tickets?overdue=true`
  - "Vence hoje" → `/tickets?due_today=true`
- **PII Security Views Update v1.0**:
  - Views `v_bu_active_profiles` e `v_profiles_directory` atualizadas
  - Removidos campos sensíveis: `whatsapp_personal`, `instagram_id`, `discord_id`
  - Views agora usam `security_invoker = on`
  - Dados PII acessíveis apenas via RPC `get_profile_with_privacy()`
- **OKR Wizards Documentation**:
  - Seção 4.8 expandida com documentação dos 5 wizards
  - Tabela com propósito, frequência e participantes de cada ritual
```

### 4.2 DOCUMENTATION_INDEX.md

**Atualizar linhas 3-5:**
```markdown
**Última atualização:** 2026-02-02  
**TCR Version:** 2.78.0  
**System Health:** 9.5/10 ✅
```

**Atualizar tabela de docs canônicos (linha 32):**
```markdown
| `TECHNICAL_CONTEXT_REGISTRY.md` | **Fonte única de verdade** — arquitetura, entidades, regras | v2.78.0 |
```

**Adicionar UI_COMPONENTS_REGISTRY.md à tabela (após linha 40):**
```markdown
| `UI_COMPONENTS_REGISTRY.md` | Registro de componentes UI canônicos | v1.2.0 |
```

**Atualizar rodapé (linha 99):**
```markdown
*Atualizado em 2026-02-02 — TCR v2.78.0 — Health Score 9.5/10*
```

### 4.3 docs/canonical/README.md

**Atualizar linha 16:**
```markdown
| `TECHNICAL_CONTEXT_REGISTRY.md` | **Fonte única de verdade** — arquitetura, entidades, regras de negócio | v2.78.0 |
```

---

## 5. O Que NÃO Será Alterado

- **UI_COMPONENTS_REGISTRY.md** — Já está atualizado (v1.2.0, 2026-02-02)
- **Nenhum componente novo** será criado — todas as alterações usam componentes canônicos existentes
- **Estrutura de pastas** permanece inalterada

---

## 6. Validação Pós-Implementação

1. ✅ Verificar que versão no header é v2.78.0
2. ✅ Confirmar changelog com as 4 features documentadas
3. ✅ Validar que seção 4.8 OKR Wizards está completa com tabela
4. ✅ Confirmar que DOCUMENTATION_INDEX reflete versão v2.78.0
5. ✅ Verificar que README canonical tem versão v2.78.0
6. ✅ Confirmar que UI_COMPONENTS_REGISTRY NÃO foi alterado (já atualizado)
