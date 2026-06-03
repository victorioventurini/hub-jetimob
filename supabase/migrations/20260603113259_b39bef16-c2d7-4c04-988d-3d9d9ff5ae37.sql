-- Allow users to read sessions where they own (or are mentioned in) a decision
-- inside `decisions` or `reflection_data.data.decisions`.
CREATE POLICY "Decision owners can view session"
ON public.okr_wizard_sessions FOR SELECT
USING (
  status IN ('completed','in_progress')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(
        CASE
          WHEN jsonb_typeof(okr_wizard_sessions.decisions) = 'array'
           AND jsonb_array_length(okr_wizard_sessions.decisions) > 0
          THEN okr_wizard_sessions.decisions
          ELSE NULL
        END,
        CASE
          WHEN okr_wizard_sessions.reflection_data ? 'data'
           AND jsonb_typeof(okr_wizard_sessions.reflection_data->'data'->'decisions') = 'array'
          THEN okr_wizard_sessions.reflection_data->'data'->'decisions'
          ELSE '[]'::jsonb
        END
      )
    ) d
    WHERE
      (NULLIF(d->'owner'->>'id','')::uuid = my_profile_id())
      OR (
        jsonb_typeof(d->'mentions') = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(d->'mentions') m(val)
          WHERE m.val = my_profile_id()::text
        )
      )
  )
);

-- Allow the same users to update the session (needed for follow-up resolution
-- on their own decisions). Mutation logic continues to mutate the JSONB array
-- they already own.
CREATE POLICY "Decision owners can update session"
ON public.okr_wizard_sessions FOR UPDATE
USING (
  status IN ('completed','in_progress')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(
        CASE
          WHEN jsonb_typeof(okr_wizard_sessions.decisions) = 'array'
           AND jsonb_array_length(okr_wizard_sessions.decisions) > 0
          THEN okr_wizard_sessions.decisions
          ELSE NULL
        END,
        CASE
          WHEN okr_wizard_sessions.reflection_data ? 'data'
           AND jsonb_typeof(okr_wizard_sessions.reflection_data->'data'->'decisions') = 'array'
          THEN okr_wizard_sessions.reflection_data->'data'->'decisions'
          ELSE '[]'::jsonb
        END
      )
    ) d
    WHERE NULLIF(d->'owner'->>'id','')::uuid = my_profile_id()
  )
);