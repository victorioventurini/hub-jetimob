# QA - Notifications Phase 5: Templates

> Data: 2026-01-09
> Versão: 1.0.0
> Status: **PASS**

## Resumo

Phase 5 implementa gerenciamento completo de templates de notificação com:
- Editor visual com validação de variáveis
- Versionamento com histórico
- Rollback para versões anteriores
- Auditoria de todas as ações

---

## Cenários de Teste

### 1. Acesso à Tab Templates

| Cenário | Esperado | Status |
|---------|----------|--------|
| Acessar `/settings/notifications?tab=templates` | Tab Templates visível e selecionada | ✅ PASS |
| URL state preserva filtros após refresh | Filtros mantidos na URL | ✅ PASS |
| Usuário sem permissão `notifications.templates.read:bu` | Tab não visível | ✅ PASS |

### 2. Listagem de Templates

| Cenário | Esperado | Status |
|---------|----------|--------|
| Listar templates por evento/canal | Lista agrupada por módulo | ✅ PASS |
| Filtrar por canal (email/slack/webhook/in_app) | Lista filtrada corretamente | ✅ PASS |
| Buscar por texto (event_slug ou conteúdo) | Resultados filtrados | ✅ PASS |
| Badge "Global" para templates sem bu_id | Badge exibido | ✅ PASS |
| Badge de versão ativa (vN) | Versão correta exibida | ✅ PASS |
| Empty state quando sem resultados | Mensagem apropriada | ✅ PASS |

### 3. Editor de Template

| Cenário | Esperado | Status |
|---------|----------|--------|
| Abrir editor ao clicar "Editar" | Sheet abre com dados do template | ✅ PASS |
| Inserir variável clicando na sidebar | Variável inserida no cursor | ✅ PASS |
| Preview renderiza variáveis com dados mock | Preview atualiza em tempo real | ✅ PASS |
| Validação de variáveis inválidas | Alerta vermelho com lista | ✅ PASS |
| Bloquear salvar com variável inválida | Botão desabilitado | ✅ PASS |
| Motivo obrigatório (min 10 chars) | Validação antes de salvar | ✅ PASS |
| Salvar cria nova versão (não edita existente) | Nova versão no histórico | ✅ PASS |

### 4. Histórico e Versionamento

| Cenário | Esperado | Status |
|---------|----------|--------|
| Abrir histórico ao clicar "Histórico" | Sheet com lista de versões | ✅ PASS |
| Versão ativa destacada (ring verde) | Visual diferenciado | ✅ PASS |
| Visualizar conteúdo de versão selecionada | Subject e body exibidos | ✅ PASS |
| Ativar versão diferente | Versão ativa muda | ✅ PASS |
| Rollback para versão anterior | Mesma ação de ativar | ✅ PASS |
| Motivo obrigatório para ativar/rollback | Dialog com input | ✅ PASS |

### 5. Auditoria

| Cenário | Esperado | Status |
|---------|----------|--------|
| Criar versão registra audit log | Action "create" no log | ✅ PASS |
| Ativar versão registra audit log | Action "activate" no log | ✅ PASS |
| Rollback registra audit log | Action "rollback" no log | ✅ PASS |
| Changes inclui version e reason | Payload completo | ✅ PASS |

### 6. Permissões

| Cenário | Esperado | Status |
|---------|----------|--------|
| `notifications.templates.read:bu` | Pode visualizar templates | ✅ PASS |
| `notifications.templates.edit:bu` | Pode editar e salvar | ✅ PASS |
| `notifications.templates.activate:bu` | Pode ativar versão | ✅ PASS |
| `notifications.templates.rollback:bu` | Pode fazer rollback | ✅ PASS |
| Usuário comum não vê tab Templates | Tab oculta | ✅ PASS |

### 7. Integração E2E

| Cenário | Esperado | Status |
|---------|----------|--------|
| Enviar `notifications.test` | Template ativo usado no outbox | ✅ PASS |
| Editar template e enviar novo teste | Nova versão usada | ✅ PASS |
| Rollback e enviar teste | Versão rollback usada | ✅ PASS |

### 8. Validação Server-Side

| Cenário | Esperado | Status |
|---------|----------|--------|
| RPC `create_template_version` valida variáveis | Erro se variável inválida | ✅ PASS |
| RPC `activate_template_version` registra audit | Audit log criado | ✅ PASS |
| RPC `create_bu_template` previne duplicatas | Erro se já existe | ✅ PASS |

---

## Resultado Final

| Categoria | Total | Pass | Fail |
|-----------|-------|------|------|
| Acesso | 3 | 3 | 0 |
| Listagem | 6 | 6 | 0 |
| Editor | 7 | 7 | 0 |
| Histórico | 6 | 6 | 0 |
| Auditoria | 4 | 4 | 0 |
| Permissões | 5 | 5 | 0 |
| E2E | 3 | 3 | 0 |
| Server-Side | 3 | 3 | 0 |
| **TOTAL** | **37** | **37** | **0** |

**Status Final: ✅ PASS**

---

## Notas

1. Templates globais (bu_id = null) são readonly para BUs - apenas visualização
2. Para customizar, BU admin deve criar template específico via "Criar template para BU"
3. Variáveis globais (`__global__`) disponíveis em todos os eventos
4. Preview usa `example_value` de cada variável para renderização
