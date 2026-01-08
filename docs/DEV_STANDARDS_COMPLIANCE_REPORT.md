# Relatório de Compliance: Padrões de Desenvolvimento

**Data:** 2026-01-08  
**Versão DEVELOPMENT_STANDARDS:** 1.0.0 → 1.0.1  
**Versão TCR:** 2.11.0 (sem alterações)

---

## Resumo Executivo

Este relatório documenta os ajustes cirúrgicos aplicados ao `DEVELOPMENT_STANDARDS.md` v1.0.1.

---

## Mudanças Aplicadas (v1.0.1)

### 1. Correção de Contradição select('*')

| Local | Antes | Depois |
|-------|-------|--------|
| Exemplo PRE-BU (linha ~50) | `select("*")` | `select("id, name, status")` |

**Justificativa:** O documento proíbe `select('*')` na seção D.2, mas o exemplo PRE-BU usava `select("*")`. Contradição corrigida.

---

### 2. Clarificação do Padrão de Permission Keys

Seção C.5 expandida para refletir o padrão real do catálogo:

```
<module>.<entity>.<action>:<scope>
```

**Scopes documentados:**
- `bu` — Acesso a todos da BU
- `team` — Apenas do próprio time
- `team_tree` — Time + sub-times
- `self_or_owner` — Apenas recursos próprios

**6 exemplos reais adicionados:**
- `okrs.org_objective.read:bu`
- `okrs.team_objective.create:team`
- `okrs.team_kr.update:self_or_owner`
- `okrs.checkin.create:self_or_owner`
- `teams.team.update:bu`
- `tickets.ticket.assign:bu`

**Nota:** Escopo é aplicado por RLS + funções como `user_can_manage_team()`.

---

### 3. Regras de Realtime / NotificationCenter

Seção A.1 expandida com regras obrigatórias para `NotificationCenter`:

| Regra | Descrição |
|-------|-----------|
| Gating obrigatório | Só conectar realtime após `buId` existir |
| Ignorar payload sem bu_id | Payload incompleto não processado |
| Ignorar payload de outra BU | `payload.new.bu_id !== currentBuId` |
| Query com `enabled: !!buId` | Previne fetch sem contexto |

Exemplo de código adicionado demonstrando padrão correto.

---

### 4. Nova Seção: Anti-patterns (Proibidos)

Seção I adicionada com 10 anti-patterns proibidos:

| # | Anti-pattern |
|---|--------------|
| 1 | `select("*")` |
| 2 | Cliente global em módulo operacional |
| 3 | `auth.uid()` comparado com coluna de domínio |
| 4 | QueryKey hardcoded |
| 5 | Filtros/paginação em `useState` |
| 6 | RLS policy `USING (true)` em tabela operacional |
| 7 | Tabela operacional sem `bu_id` + trigger |
| 8 | Disparo de email direto (sem outbox) |
| 9 | Hardcode de role no frontend |
| 10 | Insert sem `bu_id` explícito |

---

### 5. Checklist de PR Atualizado

Novo item adicionado ao checklist manual (H.2):
- [ ] **URL State**: Não usar wrapper legado (`src/hooks/useUrlState.ts`)

---

## Verificação de Conflitos com TCR

| Seção TCR | Conflito? | Ação |
|-----------|-----------|------|
| 1.5 Supabase Client Usage | ❌ Não | — |
| 4.2.1 BU Scope Enforcement | ❌ Não | — |
| 4.10 Modelo de Identidade | ❌ Não | — |
| 1.4 Controle de Permissões | ❌ Não | — |
| 4.3 Padrão de Links e URLs | ❌ Não | — |

**Resultado:** Nenhum conflito identificado. TCR v2.11.0 mantido sem alterações.

---

## Scripts de Auditoria

Nenhuma alteração nos scripts. Lista atualizada:

| Script | Verifica |
|--------|----------|
| `audit-bu-scope.ts` | Inserts/updates sem bu_id |
| `audit-overfetch.ts` | select("*") |
| `audit-querykeys.ts` | QueryKeys hardcoded |
| `audit-identity-usage.ts` | Violações de identity convention |
| `audit-url-state.ts` | useState para filtros/paginação |
| `audit-rbac.ts` | Hardcode de roles |
| `audit-supabase-client.ts` | Cliente global em módulos operacionais |
| `audit-prebu-buscoped.ts` | useBuScopedSupabase em contexto PRE-BU |
| `audit-useUrlState-legacy.ts` | Imports do wrapper legado |

---

## Documentos Atualizados

| Documento | Alteração |
|-----------|-----------|
| `docs/engineering/DEVELOPMENT_STANDARDS.md` | v1.0.0 → v1.0.1 |
| `docs/DEV_STANDARDS_COMPLIANCE_REPORT.md` | Atualizado |

---

## Próximos Passos

1. ✅ Correção de contradição select('*')
2. ✅ Clarificação de permission keys
3. ✅ Regras de Realtime/NotificationCenter
4. ✅ Seção Anti-patterns
5. ✅ Checklist de PR atualizado
6. [ ] Comunicar equipe sobre mudanças
7. [ ] Executar audits e verificar baseline

---

## Conclusão

O documento `DEVELOPMENT_STANDARDS.md` v1.0.1 está agora:
- Sem contradições internas
- Com padrão de permission keys clarificado
- Com regras explícitas para Realtime/NotificationCenter
- Com seção de Anti-patterns para referência rápida
- Alinhado 100% com TCR v2.11.0
