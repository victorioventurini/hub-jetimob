-- Drop the old overload with different parameter order (legacy)
DROP FUNCTION IF EXISTS search_mention_candidates(uuid, uuid, text, integer);