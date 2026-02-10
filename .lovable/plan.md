

# Correção: user_type inconsistente em usuários externos

## Status: ✅ COMPLETO (2026-02-10)

## Contexto (Pré-Checklist Validado)

Documentos consultados:
- **TCR v3.4.3** → atualizado para **v3.5.0**
- **IDENTITY_CONVENTION v2.1.1** — Sem menção a `user_type` (foco em `user_id` vs `profile_id`)
- **DATA_MODEL_REGISTRY v1.2.2** — Tabela `profiles` com `user_type` (valores: internal/external)
- **EXTERNAL_USER_IDENTITY_PATTERN v1.0.0** — ✅ Atualizado
- **PERMISSIONS_AND_RBAC_MODEL v1.4.0** — Persona "Externo" identificada por `user_roles.role = 'external'`

## Problema

A trigger `handle_new_user` setava `employment_status = 'external'` corretamente, mas **nunca setava `user_type`**, que tem default `'internal'`. Isso causava duplicação de usuários externos em menções e diretório de participantes.

## Ações Executadas

### ✅ Passo 1: Corrigir dados existentes
- 6 profiles atualizados de `user_type = 'internal'` para `'external'`
- Verificação: 0 linhas inconsistentes

### ✅ Passo 2: Corrigir trigger `handle_new_user`
- `user_type` agora é setado explicitamente no INSERT e UPDATE

### ✅ Passo 3: Corrigir deduplicação em views/RPCs
- `v_all_participants`: Adicionado `AND p.user_type = 'internal'`
- `search_mention_candidates`: Adicionado `AND p.user_type = 'internal'`
- `search_bu_users_for_mention`: Já filtrava corretamente ✅

### ✅ Passo 4: Corrigir referências legadas
- `send-partner-invite` edge function: `partner_companies` → `external_companies`
- `EXTERNAL_USER_IDENTITY_PATTERN.md`: 5 correções (nomes legados + `user_type`)
- `UNIFIED_PARTICIPANT_LAYER.md`: SQL da view atualizado

### ✅ Passo 5: Atualizar documentação
- **TCR**: v3.4.3 → v3.5.0, changelog adicionado, linha 82 atualizada
- **EXTERNAL_USER_IDENTITY_PATTERN.md**: `user_type` documentado
- **UNIFIED_PARTICIPANT_LAYER.md**: SQL corrigido
- **Plan.md**: Finalizado

## Verificação Final
- `SELECT ... WHERE employment_status = 'external' AND user_type != 'external'` → 0 linhas ✅
- `v_all_participants WHERE display_name ILIKE '%luana%'` → 1 linha (external) ✅
- `search_mention_candidates(..., 'luana')` → 1 linha (partner_contact) ✅
