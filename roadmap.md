# MBR team analysis order
- [x] Define canonical team sequence (Tecnologia → Gente & Cultura) and apply to MBR team steps, panorama submissions panel and report.
- [x] Reorder existing drafts, preserving the team under review; add ordering test (6 passed).
- [x] Verify rendered order in the preview for both "OKRs dos Times" and "Análise por Time".
- [x] Map the canonical "Design" slot to the registered team "Product Design" (alias + test, 7 passed; rendered in position 3).

# Session cookie isolation
- [x] Audit auth clients and tracking cookie configuration.
- [x] Switch SPA auth to default origin-local storage and migrate/expire legacy domain cookies.
- [x] Test migration, chunk cleanup, host-only preservation, and login screen (7 unit tests plus real browser cookie simulation).
- [x] Update architecture and session documentation; report before/after configuration.

# Soul ticket access
- [x] Reproduce Victorio's private-ticket denial with an authenticated session.
- [x] Restore existing platform administrative access without widening other users' access.
- [x] Prevent same-unit tickets from displaying a cross-unit switch notice (10 tests passed).
- [x] Verify the ticket opens for Victorio and verify denied access boundaries (authenticated browser plus profile-spoof denial).
- [ ] Google Chat: lembretes automáticos de ritos (aguardando aprovação do texto de teste)
