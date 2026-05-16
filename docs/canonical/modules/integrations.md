# Módulo Integrações + Automações — Canonical

**Slugs:** `integrations`, `automations` · **Status:** ✅ Ativo

## Tabelas

`integrations`, `integration_secrets`, `ai_agents`, `automations`, `automation_runs`, `webhooks_in`, `webhooks_out`. Schema: `types.ts`.

## Integrações

- Gerenciamento de credenciais (secrets via Supabase Vault).
- AI Agents configuráveis por BU.
- Página: `/integrations`.

## Automações

- Webhooks de entrada (validação de assinatura nas edge functions).
- Webhooks de saída (HTTP POST configurável).
- Triggers internos (eventos do Hub).
- Logs de execução em `automation_runs`.
- Página: `/automations`.

## AI Agents (Filosofia)

⚠️ **Reutilizar antes de criar.** Nunca criar agente por cadência/rito/persona/formato. Detalhes: `docs/canonical/AI_AGENTS_PHILOSOPHY.md`, `mem://standards/ai/ai-master-standard`.

## Padrão Edge Function

Factory + middleware (auth, BU, correlation-id) + structured logs. Master: `mem://backend/edge-function-standard-v4` + `mem://backend/edge-function-performance-standard` (Promise.all em agregações IA).

## AI Parsing Safety

Sempre `tryParseAiJson` (nunca `JSON.parse` cru). Coerce output a texto via `toText` para evitar React #31. Detalhes: `mem://standards/ai/ai-master-standard`.

## Permissões

`integrations.*`, `automations.*`, `ai_agents.*`. Templates em `RBAC_TEMPLATES_V3.md`.
