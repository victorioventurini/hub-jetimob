# Wave 6 — Permissions QA Checklist

**Data:** 2026-01-08  
**Status:** READY FOR TESTING

---

## Cenários de Teste

| # | Cenário | Resultado | Notas |
|---|---------|-----------|-------|
| 1 | Líder edita OKR do próprio time | PENDING | Scope :team via user_can_manage_team |
| 2 | Líder NÃO edita time pai | PENDING | RLS bloqueia |
| 3 | Colaborador cria ticket interno | PENDING | collaborator_base inclui tickets.thread.create |
| 4 | External só vê tickets que participa | PENDING | RLS + self_or_owner |
| 5 | Asset manager opera submódulos | PENDING | OPERATE surface |
| 6 | BU admin acessa tudo da BU | PENDING | Wildcard * |
| 7 | Aliases resolvem corretamente | PENDING | read → view |
| 8 | Troca de BU reseta permissões | PENDING | Query key inclui buId |
| 9 | Templates v2 atribuíveis | PENDING | UI funcional |
| 10 | Preview de permissões efetivas | PENDING | UI funcional |

---

*QA preparado para Wave 6*
