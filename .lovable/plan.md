
# Plano: Supervisores Internos e Externos para Empresas Parceiras

## 1. Documentação Validada

| Documento | Versão | Status |
|-----------|--------|--------|
| SCHEMA_QUICK_REFERENCE.md | 2026-01-22 | ✅ Analisado |
| DEVELOPMENT_STANDARDS.md | v1.17.0 | ✅ Analisado |
| IDENTITY_CONVENTION.md | Canônico | ✅ Analisado |

---

## 2. Contexto Atual

A implementação atual suporta **apenas supervisores internos** (usuários da BU):
- Coluna `supervisor_profile_ids UUID[]` em `partner_company_bu_associations`
- Trigger `trg_add_supervisors_to_new_ticket()` adiciona-os como watchers

---

## 3. Mudança Solicitada

Expandir para suportar **dois tipos de supervisores**:

| Tipo | Definição | Armazenamento |
|------|-----------|---------------|
| **Supervisores Internos** | Usuários da BU (profiles.id) | `supervisor_profile_ids UUID[]` (existente) |
| **Supervisores Externos** | Contatos da empresa parceira (partner_contacts.id) | `supervisor_contact_ids UUID[]` (nova coluna) |

---

## 4. Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  partner_company_bu_associations                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ supervisor_profile_ids UUID[]  → profiles.id (internos)      │   │
│  │ supervisor_contact_ids UUID[]  → partner_contacts.id (ext.)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Trigger atualizado)
┌─────────────────────────────────────────────────────────────────────┐
│                        ticket_participants                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Internos: participant_type='internal_user', profile_id       │   │
│  │ Externos: participant_type='partner_contact', partner_contact│   │
│  │ role: 'watcher' para ambos                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Plano de Implementação

### Fase 1: Migration — Nova Coluna + Trigger Atualizado

**Nova coluna:**
```sql
ALTER TABLE partner_company_bu_associations 
ADD COLUMN IF NOT EXISTS supervisor_contact_ids UUID[] DEFAULT '{}';
```

**Trigger atualizado** para processar ambos os arrays:
- Supervisores internos → `INSERT INTO ticket_participants` com `participant_type='internal_user'` e `profile_id`
- Supervisores externos → `INSERT INTO ticket_participants` com `participant_type='partner_contact'` e `partner_contact_id`

---

### Fase 2: Hook Atualizado

**Arquivo:** `src/modules/tickets/hooks/usePartnerSupervisors.ts`

Expandir para buscar e atualizar ambos os tipos:

```typescript
interface PartnerSupervisorsData {
  internalSupervisorIds: string[];  // profiles.id
  externalSupervisorIds: string[];  // partner_contacts.id
  internalProfiles: SupervisorProfile[];
  externalContacts: SupervisorContact[];
}
```

---

### Fase 3: UI — SupervisorsEditor Expandido

**Arquivo:** `src/modules/tickets/components/settings/SupervisorsEditor.tsx`

Dividir em duas seções:

1. **Supervisores Internos**: Usa `BuUserMultiSelect` (existente)
2. **Supervisores Externos**: Lista de checkboxes com contatos da empresa (similar a `FallbackContactsEditor`)

Layout proposto:
```
┌─────────────────────────────────────────────────────────────────┐
│  Supervisores                                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Supervisores Internos (Usuários da BU)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [BuUserMultiSelect]                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Supervisores Externos (Contatos da Empresa)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [x] João Silva - joao@parceiro.com                        │  │
│  │ [ ] Maria Santos - maria@parceiro.com                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ℹ️ Supervisores são automaticamente adicionados como          │
│     observadores em todos os novos tickets desta empresa.       │
│                                                                 │
│                                        [Cancelar] [Salvar]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Arquivos a Modificar/Criar

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| Migration SQL | **Criar** | Nova coluna + trigger atualizado |
| `src/modules/tickets/hooks/usePartnerSupervisors.ts` | **Modificar** | Suportar ambos os tipos |
| `src/modules/tickets/components/settings/SupervisorsEditor.tsx` | **Modificar** | UI com duas seções |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | **Modificar** | Documentar nova coluna |

---

## 7. Comportamentos

| Cenário | Comportamento |
|---------|---------------|
| Novo ticket externo | Supervisores internos e externos adicionados como watchers |
| Supervisor interno já é owner | Não duplica (verificação EXISTS) |
| Supervisor externo já é assignee | Não duplica (verificação EXISTS) |
| Empresa sem contatos ativos | Seção "Externos" mostra mensagem informativa |

---

## 8. Padrões Respeitados

| Padrão | Status | Implementação |
|--------|--------|---------------|
| Identity Convention | ✅ | Usa `profile_id` e `partner_contact_id` corretamente |
| BU-Scoped Data | ✅ | Associação por BU |
| Query Keys centralizadas | ✅ | `src/lib/queryKeys` |
| Trigger naming | ✅ | Prefixo `trg_` |
| Reutilização de componentes | ✅ | `BuUserMultiSelect` + padrão `FallbackContactsEditor` |

---

## 9. Ordem de Execução

1. **Migration** — Nova coluna + trigger atualizado
2. **Hook** — Atualizar `usePartnerSupervisors.ts`
3. **UI** — Expandir `SupervisorsEditor.tsx`
4. **Docs** — Atualizar `SCHEMA_QUICK_REFERENCE.md`

---

## 10. Validação Pós-Implementação

| Cenário | Esperado |
|---------|----------|
| Adicionar supervisor interno | ✅ Persiste em `supervisor_profile_ids` |
| Adicionar supervisor externo | ✅ Persiste em `supervisor_contact_ids` |
| Criar ticket externo com ambos | ✅ Ambos adicionados como watchers |
| Supervisor interno vê ticket | ✅ Pode visualizar e interagir |
| Supervisor externo vê ticket | ✅ Pode visualizar e interagir |
| Empresa sem contatos | ✅ Seção mostra alerta informativo |
