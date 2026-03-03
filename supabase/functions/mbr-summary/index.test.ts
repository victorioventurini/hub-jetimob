/**
 * E2E test for mbr-summary edge function
 *
 * Tests:
 * 1. Missing fields → 400
 * 2. Non-existent session → skipped (session_not_found)
 * 3. Real completed session → success or skipped (already_sent / no_leaders)
 * 4. Idempotency: re-call same session → skipped (already_sent)
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mbr-summary`;

// Helper to get a real completed MBR session from the DB
async function getCompletedMbrSession(): Promise<{ id: string; bu_id: string; cycle_id: string } | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/okr_wizard_sessions?wizard_type=eq.mbr&status=eq.completed&summary_sent_at=is.null&order=completed_at.desc&limit=1&select=id,bu_id,cycle_id`,
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

Deno.test("mbr-summary: missing fields returns 400", async () => {
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
  // Should get 400 for missing cycleId/sessionId
  assertEquals(res.status, 400);
  assertExists(body.error);
});

Deno.test("mbr-summary: non-existent session is skipped", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      bu_id: "00000000-0000-0000-0000-000000000000",
      cycleId: "00000000-0000-0000-0000-000000000001",
      sessionId: "00000000-0000-0000-0000-000000000002",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.data?.skipped, true);
  assertEquals(body.data?.reason, "session_not_found");
});

Deno.test("mbr-summary: real completed session triggers summary", async () => {
  const session = await getCompletedMbrSession();
  if (!session) {
    console.warn("⚠️ No completed MBR session without summary found — skipping live test");
    return;
  }

  console.log(`Testing with session ${session.id}, bu ${session.bu_id}`);

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      bu_id: session.bu_id,
      cycleId: session.cycle_id ?? "no-cycle",
      sessionId: session.id,
    }),
  });
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));
  assertEquals(res.status, 200);

  // Either success or skipped (no_leaders, no_snapshot)
  if (body.data?.success) {
    assertExists(body.data.recipientCount);
    console.log(`✅ MBR summary sent to ${body.data.recipientCount} leaders`);
  } else if (body.data?.skipped) {
    console.log(`⚠️ Skipped: ${body.data.reason}`);
  }
});

Deno.test("mbr-summary: idempotency — re-call returns already_sent", async () => {
  // Find a session that already has summary_sent_at set
  const res1 = await fetch(
    `${SUPABASE_URL}/rest/v1/okr_wizard_sessions?wizard_type=eq.mbr&status=eq.completed&summary_sent_at=not.is.null&order=completed_at.desc&limit=1&select=id,bu_id,cycle_id`,
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
    console.warn("⚠️ No already-sent MBR session found — skipping idempotency test");
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
      cycleId: session.cycle_id ?? "no-cycle",
      sessionId: session.id,
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.data?.skipped, true);
  assertEquals(body.data?.reason, "already_sent");
});
