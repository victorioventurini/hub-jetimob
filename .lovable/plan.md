# Plano — super_admin/admin podem atuar livremente em qualquer ticket

## Pré-checklist (executado)
- ✅ TCR: módulo Tickets ativo; Pinned Messages v1.0, Transfer System v1.0, RLS Audit v1.0.
- ✅ `PERMISSIONS_AND_RBAC_MODEL.md`: anti-pattern explícito proíbe `if (role === 'admin')`. Usar **permission keys** + `isWildcard` (que cobre `*`).
- ✅ `RBAC_TEMPLATES_V3.md`: template `tickets_admin_v2` contém `tickets.ticket.update_status:bu` e `tickets.settings.manage:bu`.
- ✅ Catálogo (`permission_catalog`): chaves canônicas confirmadas.
- ✅ DB: função `can_update_ticket_status(ticket_id, profile_id)` **já trata admin** via `tickets.settings.manage:bu` (Check 4). RLS de `tickets` UPDATE permite qualquer membro da BU. **Não precisa migration para mudar status**.
- ✅ DB: função `can_pin_ticket_message` **NÃO trata admin** e é usada na RLS `ticket_messages_update_v3`. Para admin fixar mensagens, é preciso migration.
- ✅ Front hoje (`TicketDetailPage.canChangeStatus` e `usePinMessage.canUserPinMessages`) duplica a regra antiga sem o admin override → este é o bug.

## Diagnóstico do bug
O super_admin/admin não consegue mudar status porque a verificação **client-side** em `TicketDetailPage` ignora admins. Mesma lacuna em `canUserPinMessages`. RLS de tickets já permite a operação — o bloqueio é puramente de UX.

## Mudanças

### 1. Front: alinhar com a regra canônica do banco
`src/modules/tickets/pages/TicketDetailPage.tsx`
- Importar `usePermissions`. Ler `isWildcard` e `has`.
- Adicionar override admin em `canChangeStatus`:
  ```ts
  if (isWildcard) return true;
  if (has('tickets.settings.manage:bu')) return true;
  ```
  (mantém regras atuais: criador, owner, contato externo assignado).
- Em `canPin`, propagar admin para a função pura (ver item 2).

### 2. Hook `canUserPinMessages` aceita admin
`src/modules/tickets/hooks/usePinMessage.ts`
- Adicionar parâmetro opcional `isAdmin: boolean = false`. Se `true`, retornar `true` cedo (após o guard `!profileId`).
- JSDoc atualizado.
`src/modules/tickets/hooks/usePinMessage.test.ts`
- Cobrir: admin sem ser criador/owner pode fixar; comportamento sem flag preservado.
`src/modules/tickets/pages/TicketDetailPage.tsx`
- Passar `isWildcard || has('tickets.settings.manage:bu')` como `isAdmin` ao chamar `canUserPinMessages(...)`.

### 3. Backend: incluir admin na função do banco (para liberar UPDATE de pin via RLS)
Migration nova (sem alterar tipos gerados):
```sql
CREATE OR REPLACE FUNCTION public.can_pin_ticket_message(p_ticket_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_contact_profile_id uuid;
BEGIN
  SELECT created_by_user_id, owner_user_id, assigned_contact_id, type, bu_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Admin override (espelha can_update_ticket_status)
  IF has_permission(p_profile_id, v_ticket.bu_id, 'tickets.settings.manage:bu') THEN
    RETURN true;
  END IF;

  -- Criador / owner
  IF v_ticket.created_by_user_id = p_profile_id THEN RETURN true; END IF;
  IF v_ticket.owner_user_id = p_profile_id THEN RETURN true; END IF;

  -- Externo: contato assignee (mesmo critério atual)
  IF v_ticket.type = 'external' AND v_ticket.assigned_contact_id IS NOT NULL THEN
    SELECT pr.id INTO v_contact_profile_id
    FROM public.partner_contacts pc
    JOIN public.profiles pr ON pr.user_id = pc.user_id
    WHERE pc.id = v_ticket.assigned_contact_id AND pc.user_id IS NOT NULL;
    IF v_contact_profile_id = p_profile_id THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.can_pin_ticket_message IS
'Pinning gate: admin com tickets.settings.manage:bu, criador, owner ou contato externo assignado.';
```

### 4. Não-objetivos
- Não mudar RLS de `tickets` (UPDATE já cobre admin via `user_has_bu_access`).
- Não criar nova permission key (já temos `tickets.settings.manage:bu`).
- Não tocar em listagem, criação, transferência ou anexos — admin já passa pelas RLS dessas operações; nenhum bloqueio client-side reportado.
- Não alterar `tickets.ts` types (auto-gerado).

## Validação
- Como super_admin (e como BU admin) em ticket criado por outro usuário:
  1. Selector de status habilitado e troca persiste (toast de sucesso, log de auditoria).
  2. Botão "Fixar" aparece e funciona em mensagens (RLS aceita após migration).
- Como usuário comum (não criador/owner/contato): comportamento atual preservado (status read-only, sem pin).
- Rodar `usePinMessage.test.ts`.
- Smoke do link reportado: `/tickets/b22c4726-54b7-4b84-84d1-eb36e618c8ee` logado como admin.

## Arquivos
- **Editar**: `src/modules/tickets/pages/TicketDetailPage.tsx`, `src/modules/tickets/hooks/usePinMessage.ts`, `src/modules/tickets/hooks/usePinMessage.test.ts`
- **Migration nova**: `supabase/migrations/<timestamp>_admin_can_pin_ticket_message.sql`
