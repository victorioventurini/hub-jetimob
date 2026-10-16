# AGENTS.md

- Team co-leadership uses `teams.co_leader_user_id`; every leader check must accept `leader_user_id` OR `co_leader_user_id` — a co-leader has full leader rights without replacing the leader.
- Ritual window overrides (`ritual_window_overrides`) may target one profile via `profile_id` (NULL = whole BU); profile-specific rows take precedence.
- Internal users (corporate domains in `src/lib/authPolicy.ts` + `supabase/functions/_shared/internal-domains.ts`, kept in sync) sign in only via Google; partners use the magic link — enforced in request-magic-link, AuthCallback and Auth (`checkSessionPolicy` on JWT `amr`).
- Google sign-in session lands in the generated client; `syncOAuthSessionToGlobal()` copies it to `globalClient` so the shared `.jetimob.com` SSO cookie keeps working.
