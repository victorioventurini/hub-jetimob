---
name: BU API Keys
description: Chaves de API por BU (Configurações > Chaves de API), gateway bu-api, escopos por módulo e regras de segurança
type: feature
---

# Chaves de API por BU

- UI: `/settings/api-keys` (rota protegida por `BuAdminRoute`; card aparece em `/settings` só para `isWildcard`).
- Tabelas: `bu_api_keys` (hash SHA-256, nunca a chave em texto) e `bu_api_key_usage_logs`. RLS somente admin da BU / admin de plataforma.
- Formato da chave: `jet_<6>_<40>`; `key_prefix = jet_<6>` é o único trecho exibido depois da criação.
- Gestão: edge function `bu-api-keys` (JWT + checagem de admin via `bu_user_memberships`/`user_roles`, service role para escrever). Ações: `create`, `update`, `revoke`.
- Consumo: edge function `bu-api` (`/functions/v1/bu-api/...`), header `x-api-key`. Escopo `<modulo>:<read|write>`; `write` sempre implica `read`.
- Módulos expostos: `users` (users/teams/areas), `okrs`, `kpis`, `projects`, `tickets`, `rituals`. Escrita apenas em `okrs` (check-in de KR), `kpis` (valor) e `tickets` (criação).
- Rate limit por chave (default 60/min) contado sobre `bu_api_key_usage_logs` na janela de 1 minuto; retorna 429 com `Retry-After`.
- Catálogo de escopos: fonte de verdade em `supabase/functions/_shared/bu-api-scopes.ts`, espelho em `src/modules/settings/api-keys/scopes.ts` (sincronia garantida por `scopes.test.ts`).
- Toda query do gateway filtra `bu_id` da chave — nunca aceitar `bu_id` do request.
