/**
 * E2E test for team-checkin-summary edge function
 *
 * Tests:
 * 1. Missing fields → 400
 * 2. Non-existent session → skipped (session_not_found)
 * 3. Real completed session → success or skipped
 * 4. Idempotency: re-call same session → skipped (already_sent)
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/team-checkin-summary`;

async function getCompletedTeamSession(): Promise<{ id: string; bu_id: string; cycle_id: string; team_id: string } | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/okr_wizard_sessions?wizard_type=eq.team-checkin&status=eq.completed&summary_sent_at=is.null&order=completed_at.desc&limit=1&select=id,bu_id,cycle_id,team_id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const body = await res.json();
  return body?.[0] ?? null;
}

Deno.test("team-checkin-summary: missing fields returns 400", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ bu_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertExists(body.error);
});

Deno.test("team-checkin-summary: non-existent session is skipped", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      bu_id: "00000000-0000-0000-0000-000000000000",
      teamId: "00000000-0000-0000-0000-000000000001",
      cycleId: "00000000-0000-0000-0000-000000000002",
      sessionId: "00000000-0000-0000-0000-000000000003",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.data?.skipped, true);
  assertEquals(body.data?.reason, "session_not_found");
});

Deno.test("team-checkin-summary: real completed session triggers summary", async () => {
  const session = await getCompletedTeamSession();
  if (!session) {
    console.warn("⚠️ No completed team session without summary found — skipping live test");
    return;
  }

  console.log(`Testing with session ${session.id}, bu ${session.bu_id}, team ${session.team_id}`);

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      bu_id: session.bu_id,
      teamId: session.team_id,
      cycleId: session.cycle_id ?? "no-cycle",
      sessionId: session.id,
    }),
  });
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));
  assertEquals(res.status, 200);

  if (body.data?.success) {
    assertExists(body.data.recipientCount);
    console.log(`✅ Team summary sent to ${body.data.recipientCount} members`);
  } else if (body.data?.skipped) {
    console.log(`⚠️ Skipped: ${body.data.reason}`);
  }
});

Deno.test("team-checkin-summary: idempotency — re-call returns already_sent", async () => {
  const res1 = await fetch(
    `${SUPABASE_URL}/rest/v1/okr_wizard_sessions?wizard_type=eq.team-checkin&status=eq.completed&summary_sent_at=not.is.null&order=completed_at.desc&limit=1&select=id,bu_id,cycle_id,team_id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const sessions = await res1.json();
  const session = sessions?.[0];

  if (!session) {
    console.warn("⚠️ No already-sent team session found — skipping idempotency test");
    return;
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      bu_id: session.bu_id,
      teamId: session.team_id,
      cycleId: session.cycle_id ?? "no-cycle",
      sessionId: session.id,
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.data?.skipped, true);
  assertEquals(body.data?.reason, "already_sent");
});
