# CHECKLIST QA MANUAL — Hub da Jet

**Versão:** 1.0  
**Data:** 2026-01-07  
**TCR Referência:** v2.7.0

---

## 📋 INSTRUÇÕES

Este checklist deve ser executado manualmente antes de releases importantes.
Marcar cada item como:
- ✅ PASS — Funcionando corretamente
- ❌ FAIL — Problema encontrado (documentar)
- ⬜ N/T — Não testado

---

## 1. AUTENTICAÇÃO

### 1.1 Login

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 1.1.1 | Email com domínio válido recebe Magic Link | ⬜ | |
| 1.1.2 | Email com domínio inválido é rejeitado | ⬜ | Mensagem clara de erro |
| 1.1.3 | Magic Link expira após 1 hora | ⬜ | |
| 1.1.4 | Usuário novo cria profile automaticamente | ⬜ | Trigger handle_new_user |
| 1.1.5 | Sessão persiste após refresh | ⬜ | |

### 1.2 Logout

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 1.2.1 | Logout limpa sessão | ⬜ | |
| 1.2.2 | Redirecionamento para /auth | ⬜ | |
| 1.2.3 | Tentativa de acessar rota protegida redireciona | ⬜ | |

---

## 2. TROCA DE BU

### 2.1 Seleção de BU

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 2.1.1 | Dropdown mostra apenas BUs do usuário | ⬜ | |
| 2.1.2 | Trocar BU atualiza dados na tela | ⬜ | |
| 2.1.3 | Cache é limpo ao trocar BU | ⬜ | queryClient.clear() |
| 2.1.4 | BU atual persiste no localStorage | ⬜ | |
| 2.1.5 | Refresh mantém BU selecionada | ⬜ | |

### 2.2 Isolamento de Dados

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 2.2.1 | Times da BU A não aparecem na BU B | ⬜ | |
| 2.2.2 | OKRs da BU A não aparecem na BU B | ⬜ | |
| 2.2.3 | Tickets da BU A não aparecem na BU B | ⬜ | |
| 2.2.4 | Assets da BU A não aparecem na BU B | ⬜ | |
| 2.2.5 | Pessoas da BU A não aparecem na BU B | ⬜ | |

---

## 3. PERMISSÕES

### 3.1 Super Admin

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 3.1.1 | Acessa /hub (configurações globais) | ⬜ | |
| 3.1.2 | Vê todas as BUs | ⬜ | |
| 3.1.3 | Gerencia catálogo de permissões | ⬜ | |
| 3.1.4 | Gerencia catálogo de notificações | ⬜ | |
| 3.1.5 | Wildcard ativo (sem verificação individual) | ⬜ | |

### 3.2 Admin de BU

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 3.2.1 | NÃO acessa /hub | ⬜ | Redirect ou 403 |
| 3.2.2 | Acessa /settings | ⬜ | |
| 3.2.3 | Gerencia times da BU | ⬜ | |
| 3.2.4 | Gerencia usuários da BU | ⬜ | |
| 3.2.5 | Configura notificações da BU | ⬜ | |
| 3.2.6 | Wildcard ativo na BU | ⬜ | |

### 3.3 Colaborador

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 3.3.1 | NÃO acessa /hub | ⬜ | |
| 3.3.2 | NÃO acessa /settings (exceto perfil) | ⬜ | |
| 3.3.3 | Vê apenas dados permitidos | ⬜ | |
| 3.3.4 | Botões de ação respeitam permissões | ⬜ | |

### 3.4 Líder de Time

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 3.4.1 | Gerencia próprio time | ⬜ | |
| 3.4.2 | Gerencia times filhos | ⬜ | |
| 3.4.3 | NÃO gerencia time pai | ⬜ | |
| 3.4.4 | NÃO gerencia times irmãos | ⬜ | |
| 3.4.5 | Botão editar aparece só em times gerenciáveis | ⬜ | |

---

## 4. LINKS /go

### 4.1 Resolução de Contexto

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 4.1.1 | `/go/team/:id` resolve para BU correta | ⬜ | |
| 4.1.2 | `/go/asset/:id` resolve para BU correta | ⬜ | |
| 4.1.3 | `/go/ticket/:id` resolve para BU correta | ⬜ | |
| 4.1.4 | `/go/okr_org_objective/:id` resolve | ⬜ | |
| 4.1.5 | `/go/user/:id` resolve para BU correta | ⬜ | |
| 4.1.6 | Usuário sem acesso à BU vê erro | ⬜ | |

### 4.2 QR Codes de Assets

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 4.2.1 | `/assets/0001` redireciona para /go/asset/:uuid | ⬜ | |
| 4.2.2 | Código inválido mostra erro | ⬜ | |
| 4.2.3 | Usuário não autenticado vê página pública | ⬜ | |

---

## 5. NOTIFICAÇÕES

### 5.1 Configuração Global (/hub/notifications)

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 5.1.1 | Lista eventos do catálogo | ⬜ | |
| 5.1.2 | Lista canais do catálogo | ⬜ | |
| 5.1.3 | Apenas super_admin acessa | ⬜ | |

### 5.2 Configuração de BU (/settings/notifications)

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 5.2.1 | Admin BU pode ativar/desativar canais | ⬜ | |
| 5.2.2 | Colaborador NÃO acessa | ⬜ | |
| 5.2.3 | Configuração isolada por BU | ⬜ | |

### 5.3 Preferências do Usuário (/me/notifications)

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 5.3.1 | Usuário vê eventos permitidos | ⬜ | |
| 5.3.2 | Eventos obrigatórios não são editáveis | ⬜ | |
| 5.3.3 | Externos veem apenas external/both | ⬜ | |
| 5.3.4 | Toggle salva preferência | ⬜ | |

### 5.4 Disparo de Notificações

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 5.4.1 | Menção gera notificação in-app | ⬜ | |
| 5.4.2 | Notificação aparece no bell | ⬜ | |
| 5.4.3 | Email é enviado (se canal ativo) | ⬜ | |
| 5.4.4 | Duplicatas são bloqueadas (dedupe_key) | ⬜ | |

---

## 6. MÓDULOS

### 6.1 OKRs

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.1.1 | Criar objetivo organizacional | ⬜ | |
| 6.1.2 | Criar KR organizacional | ⬜ | |
| 6.1.3 | Criar objetivo de time | ⬜ | |
| 6.1.4 | Fazer check-in de KR | ⬜ | |
| 6.1.5 | Cancelar objetivo (soft delete) | ⬜ | |
| 6.1.6 | Limite de 3 objetivos por time | ⬜ | |
| 6.1.7 | Limite de 3 KRs por objetivo | ⬜ | |

### 6.2 Tickets

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.2.1 | Criar ticket | ⬜ | |
| 6.2.2 | Adicionar mensagem | ⬜ | |
| 6.2.3 | Alterar status | ⬜ | |
| 6.2.4 | Atribuir responsável | ⬜ | |
| 6.2.5 | Mencionar usuário | ⬜ | |

### 6.3 Assets - Inventário

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.3.1 | Criar item de inventário | ⬜ | |
| 6.3.2 | Fazer checkout | ⬜ | |
| 6.3.3 | Fazer checkin | ⬜ | |
| 6.3.4 | Visualizar QR code | ⬜ | |

### 6.4 Assets - Chaves

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.4.1 | Criar claviculário | ⬜ | |
| 6.4.2 | Criar chaveiro | ⬜ | |
| 6.4.3 | Registrar retirada | ⬜ | |
| 6.4.4 | Registrar devolução | ⬜ | |

### 6.5 Teams

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.5.1 | Criar time | ⬜ | |
| 6.5.2 | Editar time | ⬜ | |
| 6.5.3 | Adicionar membro | ⬜ | |
| 6.5.4 | Hierarquia visual correta | ⬜ | |

### 6.6 KPIs

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 6.6.1 | Criar KPI | ⬜ | |
| 6.6.2 | Registrar valor | ⬜ | |
| 6.6.3 | Visualizar gráfico | ⬜ | |

---

## 7. BUSCA GLOBAL

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 7.1 | Buscar pessoa retorna resultados | ⬜ | |
| 7.2 | Buscar time retorna resultados | ⬜ | |
| 7.3 | Buscar asset retorna resultados | ⬜ | |
| 7.4 | Resultados respeitam permissões de Assets | ⬜ | |
| 7.5 | Clicar em resultado navega corretamente | ⬜ | /go/:entity/:id |
| 7.6 | Busca vazia mostra estado adequado | ⬜ | |

---

## 8. RESPONSIVIDADE

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 8.1 | Desktop (1920px) | ⬜ | |
| 8.2 | Laptop (1366px) | ⬜ | |
| 8.3 | Tablet (768px) | ⬜ | |
| 8.4 | Mobile (375px) | ⬜ | |

---

## 9. ESTADOS DE ERRO

| # | Teste | Resultado | Observação |
|---|-------|-----------|------------|
| 9.1 | Erro de rede mostra ErrorState | ⬜ | |
| 9.2 | Lista vazia mostra EmptyState | ⬜ | |
| 9.3 | Erro de permissão mostra mensagem | ⬜ | |
| 9.4 | Página não encontrada (404) | ⬜ | |

---

## 📝 REGISTRO DE EXECUÇÃO

| Campo | Valor |
|-------|-------|
| **Testador** | |
| **Data** | |
| **Ambiente** | |
| **Versão** | |
| **Total PASS** | |
| **Total FAIL** | |
| **Total N/T** | |

### Problemas Encontrados

| # | Teste | Descrição do Problema | Severidade |
|---|-------|----------------------|------------|
| | | | |
| | | | |
| | | | |

### Observações Gerais

```
(Adicionar observações aqui)
```

---

*Checklist gerado automaticamente. Baseado no TCR v2.7.0*
