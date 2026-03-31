
-- 1) Add config jsonb column to bu_module_configs
ALTER TABLE bu_module_configs 
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';

-- 2) Create auto_transition_cycle_statuses() RPC
CREATE OR REPLACE FUNCTION public.auto_transition_cycle_statuses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activated int := 0;
  v_closed int := 0;
  v_today date := current_date;
  rec record;
  v_closed_in_loop int;
BEGIN
  -- 1) Activate planning cycles whose start_date has arrived
  --    (close the existing active of same type/BU first)
  FOR rec IN 
    SELECT c.id, c.type, c.bu_id
    FROM cycles c
    WHERE c.status = 'planning'
      AND c.start_date <= v_today
      AND c.bu_id IN (
        SELECT bmc.bu_id 
        FROM bu_module_configs bmc
        JOIN modules m ON m.id = bmc.module_id
        WHERE m.slug = 'okrs' 
          AND bmc.is_enabled = true
          AND (bmc.config->>'auto_cycle_transition')::boolean = true
      )
    ORDER BY c.start_date
  LOOP
    -- Close active cycle of same type/BU
    UPDATE cycles SET status = 'closed'
    WHERE bu_id = rec.bu_id 
      AND type = rec.type 
      AND status = 'active';
    GET DIAGNOSTICS v_closed_in_loop = ROW_COUNT;
    v_closed := v_closed + v_closed_in_loop;

    -- Activate the new cycle
    UPDATE cycles SET status = 'active' WHERE id = rec.id;
    v_activated := v_activated + 1;
  END LOOP;

  -- 2) Close active cycles whose end_date has passed (no successor)
  UPDATE cycles SET status = 'closed'
  WHERE status = 'active' 
    AND end_date < v_today
    AND bu_id IN (
      SELECT bmc.bu_id 
      FROM bu_module_configs bmc
      JOIN modules m ON m.id = bmc.module_id
      WHERE m.slug = 'okrs' 
        AND bmc.is_enabled = true
        AND (bmc.config->>'auto_cycle_transition')::boolean = true
    );
  GET DIAGNOSTICS v_closed_in_loop = ROW_COUNT;
  v_closed := v_closed + v_closed_in_loop;

  RETURN jsonb_build_object('activated', v_activated, 'closed', v_closed);
END;
$$;
