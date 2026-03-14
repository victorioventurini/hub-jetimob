-- Hygiene Wave 2026-03-14: Remove unused okr_coaching_events table
-- Justification: 0 rows, 0 code references outside auto-generated types.ts
-- Verified via: grep in src/modules (0 matches), pg_stat_user_tables (0 rows)

DROP TABLE IF EXISTS public.okr_coaching_events;