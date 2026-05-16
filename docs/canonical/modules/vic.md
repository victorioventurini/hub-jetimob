# Módulo Vic (AI Assistant) — Canonical

**Slug:** `vic` · **Status:** ✅ Ativo

## Propósito

Assistente IA contextual do Hub. Conhece OKRs, KPIs, rituais, cultura, aniversários e novos Jetimobers da BU ativa.

## Tabelas

`vic_conversations`, `vic_messages`, `vic_culture_facts`. Schema: `types.ts`.

## Edge Function

`vic-chat` (Lovable AI Gateway, Gemini default). Recebe contexto da BU + histórico. Streaming opcional.

## Cultura Vic

Sistema de "culture facts" da BU — Vic referencia (aniversários, novos Jetimobers, valores, rituais). Página de gestão: `/settings/vic-culture`.

## AI Safety (obrigatório)

- `tryParseAiJson` (nunca raw `JSON.parse`)
- `toText` para coerção (previne React #31)
- Multi-LLM gateway (`mem://standards/ai/ai-master-standard`)

## Permissões

`vic.chat.use:bu`, `vic.culture.manage:bu`.

## Referências

- AI Master: `mem://standards/ai/ai-master-standard`
- Filosofia: `docs/canonical/AI_AGENTS_PHILOSOPHY.md`
