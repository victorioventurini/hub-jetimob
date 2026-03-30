/**
 * Edge Function: generate-ritual-occurrences
 * 
 * Generates ritual occurrence dates from a cadence configuration.
 * Called when admin creates/updates a cadence.
 * 
 * @module ritual-calendar
 * @version 1.0.0
 * 
 * ## Request
 * - Method: POST
 * - Body: { cadence_id: string, bu_id: string }
 * - Auth: JWT required
 * 
 * ## Response
 * - Success: { generated: number, preserved: number, removed: number }
 */

import { withMiddleware, logRequestCompletion } from "../_shared/middleware.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";

// ============================================================================
// Date Generation Logic
// ============================================================================

interface CadenceConfig {
  id: string;
  bu_id: string;
  wizard_type: string;
  team_id: string | null;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  month_week_ordinal: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

function generateDates(cadence: CadenceConfig): Date[] {
  const start = new Date(cadence.start_date + "T00:00:00Z");
  
  // Default end: end of current year + 1 quarter
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 15); // ~end of year + 1Q
  const end = cadence.end_date 
    ? new Date(cadence.end_date + "T23:59:59Z") 
    : defaultEnd;

  const dates: Date[] = [];
  const current = new Date(start);

  switch (cadence.frequency) {
    case "weekly": {
      // Advance to the first matching day_of_week
      const dow = cadence.day_of_week ?? 1; // default Monday
      while (current.getUTCDay() !== dow) {
        current.setUTCDate(current.getUTCDate() + 1);
      }
      while (current <= end) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 7);
      }
      break;
    }
    case "biweekly": {
      const dow = cadence.day_of_week ?? 1;
      while (current.getUTCDay() !== dow) {
        current.setUTCDate(current.getUTCDate() + 1);
      }
      while (current <= end) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 14);
      }
      break;
    }
    case "monthly": {
      if (cadence.month_week_ordinal != null && cadence.day_of_week != null) {
        // "Nth weekday of month" (e.g. 1st Monday)
        while (current <= end) {
          const nthDate = getNthWeekdayOfMonth(
            current.getUTCFullYear(),
            current.getUTCMonth(),
            cadence.day_of_week,
            cadence.month_week_ordinal
          );
          if (nthDate && nthDate >= start && nthDate <= end) {
            dates.push(nthDate);
          }
          current.setUTCMonth(current.getUTCMonth() + 1);
          current.setUTCDate(1);
        }
      } else {
        // Fixed day_of_month
        const dom = cadence.day_of_month ?? 1;
        current.setUTCDate(dom);
        if (current < start) {
          current.setUTCMonth(current.getUTCMonth() + 1);
          current.setUTCDate(dom);
        }
        while (current <= end) {
          dates.push(new Date(current));
          current.setUTCMonth(current.getUTCMonth() + 1);
          current.setUTCDate(dom);
        }
      }
      break;
    }
    case "quarterly": {
      // Quarterly: months 0,3,6,9 (Jan,Apr,Jul,Oct)
      const dom = cadence.day_of_month ?? 1;
      const quarterMonths = [0, 3, 6, 9];
      const year = current.getUTCFullYear();
      
      for (let y = year; y <= end.getUTCFullYear() + 1; y++) {
        for (const m of quarterMonths) {
          const d = new Date(Date.UTC(y, m, dom));
          if (d >= start && d <= end) {
            dates.push(d);
          }
        }
      }
      break;
    }
  }

  return dates;
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  ordinal: number
): Date | null {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  let firstDow = firstOfMonth.getUTCDay();
  
  // Days until the first occurrence of dayOfWeek
  let diff = dayOfWeek - firstDow;
  if (diff < 0) diff += 7;
  
  const day = 1 + diff + (ordinal - 1) * 7;
  
  // Validate the day is still in the same month
  const result = new Date(Date.UTC(year, month, day));
  if (result.getUTCMonth() !== month) return null;
  
  return result;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
  });

  if (!mw.success) return mw.error!;
  const { context } = mw;

  try {
    const body = await req.json();
    const cadenceId = body.cadence_id;

    if (!cadenceId) {
      return errorResponse("cadence_id is required", 400, "MISSING_PARAM");
    }

    const { serviceClient, buId } = context;

    // Fetch cadence
    const { data: cadence, error: cadenceErr } = await serviceClient
      .from("ritual_cadences")
      .select("id, bu_id, wizard_type, team_id, frequency, day_of_week, day_of_month, month_week_ordinal, start_date, end_date, is_active")
      .eq("id", cadenceId)
      .eq("bu_id", buId)
      .single();

    if (cadenceErr || !cadence) {
      return errorResponse("Cadence not found", 404, "NOT_FOUND");
    }

    if (!cadence.is_active) {
      return successResponse({ generated: 0, preserved: 0, removed: 0, message: "Cadence is inactive" });
    }

    // Generate planned dates
    const plannedDates = generateDates(cadence as CadenceConfig);

    // For global cadences (team_id = null), generate one occurrence per
    // active team in the BU so each team can be tracked independently.
    const isGlobalCadence = !cadence.team_id;
    let teamIds: (string | null)[] = [cadence.team_id]; // default: single entry

    if (isGlobalCadence) {
      const { data: teams } = await serviceClient
        .from("teams")
        .select("id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("status", "active");

      if (teams && teams.length > 0) {
        teamIds = teams.map((t: any) => t.id);
      }
      // else fallback to [null] so at least one set of occurrences is created
    }

    // Fetch existing occurrences for this cadence
    const { data: existing } = await serviceClient
      .from("ritual_occurrences")
      .select("id, planned_date, team_id, session_id, status")
      .eq("cadence_id", cadenceId);

    // Build composite key: "planned_date|team_id"
    const existingMap = new Map(
      (existing ?? []).map((o: any) => [`${o.planned_date}|${o.team_id ?? "null"}`, o])
    );

    const plannedDateStrings = new Set(plannedDates.map(formatDate));
    let generated = 0;
    let preserved = 0;
    let removed = 0;

    // Build the full set of expected keys
    const expectedKeys = new Set<string>();
    for (const d of plannedDates) {
      for (const tid of teamIds) {
        expectedKeys.add(`${formatDate(d)}|${tid ?? "null"}`);
      }
    }

    // Remove future orphans (not in expected set, no session, still scheduled)
    const toRemove = (existing ?? []).filter((o: any) => {
      const key = `${o.planned_date}|${o.team_id ?? "null"}`;
      return !expectedKeys.has(key) && !o.session_id && o.status === "scheduled";
    });

    if (toRemove.length > 0) {
      const { error: delErr } = await serviceClient
        .from("ritual_occurrences")
        .delete()
        .in("id", toRemove.map((o: any) => o.id));

      if (!delErr) removed = toRemove.length;
    }

    // Insert new date+team combinations (skip existing)
    const toInsert: any[] = [];
    for (const d of plannedDates) {
      for (const tid of teamIds) {
        const key = `${formatDate(d)}|${tid ?? "null"}`;
        if (!existingMap.has(key)) {
          toInsert.push({
            bu_id: cadence.bu_id,
            cadence_id: cadenceId,
            wizard_type: cadence.wizard_type,
            team_id: tid,
            planned_date: formatDate(d),
            status: "scheduled",
          });
        }
      }
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await serviceClient
        .from("ritual_occurrences")
        .insert(toInsert);

      if (!insErr) generated = toInsert.length;
    }

    preserved = (existing ?? []).length - removed;

    logRequestCompletion(context, "success", `Generated ${generated}, preserved ${preserved}, removed ${removed}`);

    return successResponse({ generated, preserved, removed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logRequestCompletion(context, "error", msg);
    return errorResponse("Internal error", 500, "INTERNAL_ERROR");
  }
});
