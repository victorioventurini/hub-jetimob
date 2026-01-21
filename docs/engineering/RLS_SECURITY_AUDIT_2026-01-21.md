# RLS Security Audit — 2026-01-21

**Data:** 2026-01-21  
**Status:** ✅ Auditoria Completa  
**TCR Version:** v2.49.0

---

## 1. Resumo Executivo

Auditoria completa de segurança RLS identificou e corrigiu **6 problemas críticos** em policies de Row Level Security.

### Problemas Corrigidos

| # | Categoria | Tabela | Policy | Problema | Correção |
|---|-----------|--------|--------|----------|----------|
| 1 | Recursão Infinita | `partner_contact_bu_associations` | External users SELECT | Consultava `partner_contacts` que consultava de volta | Usar `get_user_partner_contact_id(auth.uid())` |
| 2 | Recursão Infinita | `partner_contacts` | Users can view with BU association | JOIN circular com `partner_contact_bu_associations` | Usar `current_bu_id()` direto |
| 3 | Identity Mismatch | `ticket_internal_routing_rules` | UPDATE/DELETE | `has_permission(auth.uid(), ...)` | `has_permission(my_profile_id(), ...)` |
| 4 | Identity Mismatch | `tickets` | SELECT policy | `is_bu_admin(auth.uid(), bu_id)` | `is_bu_admin(my_profile_id(), bu_id)` |
| 5 | Self-Reference Bug | `partner_contacts` | UPDATE policy | `pcba.partner_contact_id = pcba.id` | `pcba.partner_contact_id = partner_contacts.id` |
| 6 | Overly Permissive | 3 tabelas de audit | INSERT policies | `WITH CHECK (true)` | `WITH CHECK (auth.uid() IS NOT NULL)` |

---

## 2. Análise Detalhada

### 2.1 Recursão Infinita (Crítico)

**Causa raiz:** Policies RLS que referenciavam tabelas cujas próprias policies referenciavam a tabela original.

```
partner_contacts RLS → SELECT FROM partner_contact_bu_associations
                                    ↓
partner_contact_bu_associations RLS → SELECT FROM partner_contacts
                                    ↓
                              INFINITE LOOP
```

**Correção:** Substituir consultas diretas por funções `SECURITY DEFINER` que não disparam RLS internamente:
- `get_user_partner_contact_id(auth.uid())` — retorna o `partner_contact_id` do usuário
- `current_bu_id()` — retorna a BU atual do contexto

### 2.2 Identity Mismatch (Alto Risco)

**Causa raiz:** Funções como `has_permission()` e `is_bu_admin()` esperam `profiles.id`, mas estavam recebendo `auth.uid()`.

| Função | Parâmetro Esperado | Erro Comum |
|--------|-------------------|------------|
| `has_permission(p_profile_id, ...)` | `profiles.id` | Passar `auth.uid()` |
| `is_bu_admin(p_profile_id, bu_id)` | `profiles.id` | Passar `auth.uid()` |
| `is_profile_bu_member(p_profile_id, bu_id)` | `profiles.id` | Passar `auth.uid()` |

**Correção:** Sempre usar `my_profile_id()` que converte `auth.uid()` para `profiles.id`.

### 2.3 Self-Reference Bug (Médio)

**Causa raiz:** Typo em policy — `pcba.id` ao invés de `partner_contacts.id`.

```sql
-- ❌ ERRADO (self-reference)
WHERE pcba.partner_contact_id = pcba.id

-- ✅ CORRETO
WHERE pcba.partner_contact_id = partner_contacts.id
```

### 2.4 Overly Permissive Policies (Baixo)

**Causa raiz:** Policies de INSERT com `WITH CHECK (true)` em tabelas de audit log.

**Correção:** Adicionar validação mínima `auth.uid() IS NOT NULL` + permissões específicas onde aplicável.

---

## 3. Migrations Aplicadas

| Migration | Descrição |
|-----------|-----------|
| `20260121211712_*.sql` | Fix recursão infinita partner_contacts ↔ partner_contact_bu_associations |
| `20260121212924_*.sql` | Fix identity mismatch (has_permission, is_bu_admin) + self-reference bug |
| `20260121213xxx_*.sql` | Fix overly permissive INSERT policies em audit tables |
| `20260121220904_*.sql` | Pinned messages: colunas + função `can_pin_ticket_message` + trigger |
| `20260121223844_*.sql` | **ticket_attachments_insert_v3**: permite contatos externos participantes fazer upload |
| `20260121223914_*.sql` | **ticket_attachments_select_v3**: usa `can_view_ticket()` para acesso de leitura |

---

## 4. Padrões Obrigatórios (Reforço)

### 4.1 Uso de Funções de Identidade

| Contexto | Função Correta | ❌ Não Usar |
|----------|----------------|-------------|
| Policies comparando com `profiles.id` | `my_profile_id()` | `auth.uid()` |
| Policies comparando com `auth.users.id` | `auth.uid()` | `my_profile_id()` |
| Funções `has_permission`, `is_bu_admin`, etc | `my_profile_id()` | `auth.uid()` |

### 4.2 Evitar Recursão

**Regra:** Se uma policy precisa consultar outra tabela com RLS, usar função `SECURITY DEFINER`:

```sql
-- ✅ CORRETO: Função SECURITY DEFINER
CREATE FUNCTION get_user_partner_contact_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER  -- ← Não dispara RLS
SET search_path TO 'public'
AS $$ ... $$;

-- Policy usa a função
CREATE POLICY "..." ON partner_contact_bu_associations
  FOR SELECT USING (
    partner_contact_id = get_user_partner_contact_id(auth.uid())
  );
```

### 4.3 Validação de Audit Tables

Tabelas de audit log devem ter políticas mínimas:

```sql
-- INSERT: Apenas usuários autenticados
CREATE POLICY "..." ON audit_table
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: Apenas admins ou scoped por BU
CREATE POLICY "..." ON audit_table
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'module.audit.view:bu'));
```

---

## 5. Warnings Pendentes (Não Críticos)

| Warning | Razão para Ignorar |
|---------|-------------------|
| Leaked Password Protection Disabled | Plataforma usa OTP (sem senhas tradicionais) |

---

## 6. Próximas Ações Recomendadas

1. **Criar script de auditoria periódica** — Verificar padrões de RLS automaticamente
2. **Documentar exceções** — Qualquer policy que fuja do padrão deve ter comentário explicativo
3. **Testar com múltiplos perfis** — Validar policies com usuários internos e externos

---

## 7. Referências

- `docs/IDENTITY_RLS_FINDINGS.md` — Auditoria anterior de identidade (2026-01-08)
- `docs/engineering/RLS_V2_MIGRATION_FINAL_REPORT.md` — Migração RLS V2
- `docs/engineering/PERMISSIONS_AND_RBAC_MODEL.md` — Modelo de permissões

---

*Documento gerado em 2026-01-21*
