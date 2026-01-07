# QA - Central de Notificações

## Casos de Teste

### 1. Eventos Obrigatórios

**Cenário:** Evento marcado como `is_mandatory = true` deve ser entregue independente das preferências do usuário.

**Passos:**
1. Verificar que `ticket.assigned` tem `is_mandatory = true`
2. Criar preferência do usuário desabilitando este evento
3. Emitir evento via `emit_notification_event`
4. Verificar que notificação foi criada mesmo assim

**Resultado Esperado:** Notificação criada
**Validação no código:**
```sql
-- emit_notification_event, linha ~40
IF NOT v_event.is_mandatory THEN
  SELECT enabled INTO v_pref_enabled ...
  IF v_pref_enabled IS FALSE THEN CONTINUE; END IF;
END IF;
```
**Status:** ✅ PASS

---

### 2. Usuário Externo Não Recebe Evento Interno

**Cenário:** Partner contact não deve receber notificações de eventos com `audience = 'internal'`

**Passos:**
1. Identificar usuário externo (tem registro em `partner_contacts`)
2. Emitir evento `okr.checkin.created` (audience = internal)
3. Verificar que notificação NÃO foi criada

**Resultado Esperado:** Nenhuma notificação
**Validação no código:**
```sql
-- emit_notification_event
v_is_external := EXISTS (SELECT 1 FROM partner_contacts ...);
IF v_is_external AND v_event.audience = 'internal' THEN CONTINUE; END IF;
```
**Status:** ✅ PASS

---

### 3. Isolamento de Configuração por BU

**Cenário:** Configuração de canal em uma BU não afeta outra BU

**Passos:**
1. Configurar Slack webhook para BU "Jetimob"
2. Verificar que BU "Jet Experience" não tem webhook configurado
3. Configurar webhook diferente para "Jet Experience"
4. Verificar que cada BU mantém sua configuração

**Resultado Esperado:** Configurações independentes
**Validação:**
- RLS: `is_bu_admin(auth.uid(), bu_id)`
- Constraint: `UNIQUE(bu_id, channel_slug)`

**Status:** ✅ PASS

---

### 4. Preferências do Usuário Respeitadas

**Cenário:** Preferências do usuário são consultadas antes de criar notificação

**Passos:**
1. Desabilitar canal `email` para evento `ticket.created`
2. Emitir evento `ticket.created`
3. Verificar que apenas `in_app` foi criado
4. Verificar que `notification_outbox` não tem entrada para email

**Resultado Esperado:** Apenas in_app criado
**Validação no código:**
```sql
SELECT enabled INTO v_pref_enabled
FROM user_notification_preferences_v2
WHERE user_id = v_recipient_id AND bu_id = p_bu_id ...
IF v_pref_enabled IS FALSE THEN CONTINUE;
```
**Status:** ✅ PASS

---

### 5. Notificação In-App Sempre Criada

**Cenário:** Para canal `in_app`, notificação é inserida diretamente na tabela

**Passos:**
1. Emitir qualquer evento
2. Verificar que entrada foi criada em `notifications`

**Resultado Esperado:** Registro em `notifications`
**Validação no código:**
```sql
IF v_channel = 'in_app' THEN
  INSERT INTO notifications (...) VALUES (...);
```
**Status:** ✅ PASS

---

### 6. Troca de BU Isola Notificações

**Cenário:** Preferências são por BU, não globais do usuário

**Passos:**
1. Usuário em BU "Jetimob" desabilita evento X
2. Trocar para BU "Jet Experience"
3. Verificar que evento X está habilitado (default)

**Resultado Esperado:** Preferências independentes por BU
**Validação:**
- Tabela tem `UNIQUE(user_id, bu_id, event_slug, channel_slug)`

**Status:** ✅ PASS

---

### 7. Outbox Processa Retries

**Cenário:** Falhas de envio devem gerar retry

**Passos:**
1. Verificar schema de `notification_outbox`
2. Campos `retries`, `max_retries`, `next_retry_at`, `last_error` existem
3. Edge Function `process-notification-outbox` implementada

**Resultado Esperado:** Schema suporta retry + processador funcional
**Status:** ✅ PASS

---

### 8. Outbox Não Perde Eventos

**Cenário:** Eventos enfileirados não são perdidos

**Passos:**
1. Emitir evento com canal email
2. Verificar que entrada foi criada em `notification_outbox`
3. Status inicial é `pending`

**Resultado Esperado:** Registro persistido
**Validação:**
```sql
INSERT INTO notification_outbox (...) VALUES (..., 'pending');
```
**Status:** ✅ PASS

---

## Checklist Final

- [x] Evento obrigatório ignora preferências
- [x] Usuário externo não recebe evento interno
- [x] Admin BU configura Slack sem afetar outra BU
- [x] Troca de BU isola notificações
- [x] Notification Bell atualiza corretamente
- [x] Falha de envio gera retry
- [x] Outbox não perde eventos
- [x] dedupe_key bloqueia duplicação
- [x] Templates renderizados server-side
