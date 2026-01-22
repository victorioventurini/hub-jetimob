# Checklist Oficial de Go-Live — Hub Jetimob

> **Versão:** 1.0.0  
> **Base Técnica:** TCR v2.12.0  
> **Ambiente:** Produção  
> **Stack:** Supabase Pro + Postgres 15 + RLS  
> **Responsável:** Engenharia / Tech Lead

---

## 1. Pré-Go-Live — Bloqueios Críticos

- [ ] Todos os PRs mergeados em main
- [ ] Branch main limpa (sem commits pendentes)
- [ ] Build local PASS (`npm run build`)
- [ ] CI/CD PASS (lint + typecheck + build)
- [ ] Nenhuma migration pendente
- [ ] Feature flags avaliadas (nenhuma em estado indefinido)
- [ ] Ambiente correto (PROD) confirmado

---

## 2. Banco de Dados & Migrations

- [ ] Supabase Pro ativo
- [ ] Backup lógico PRÉ-GO-LIVE executado (pg_dump)
- [ ] Backup registrado em `backup_log.txt`
- [ ] PITR habilitado e visível no Dashboard
- [ ] Nenhuma tabela operacional sem RLS
- [ ] Nenhuma coluna `bu_id` NULL em tabelas operacionais
- [ ] Triggers de BU scope ativos
- [ ] Triggers de soft delete ativos
- [ ] Sequences verificadas (sem drift)
- [ ] Views de auditoria acessíveis:
  - `v_bu_id_null_report`
  - `identity_rls_violations`

---

## 3. Segurança & Multi-Tenancy

- [ ] `useBuScopedSupabase()` usado em 100% dos módulos operacionais
- [ ] Nenhum uso indevido do supabase global
- [ ] Header `x-current-bu-id` sendo injetado corretamente
- [ ] `assert_bu_scope` ativo em INSERT/UPDATE
- [ ] RLS policies usam:
  - `user_has_bu_access()`
  - `is_current_bu()`
- [ ] Nenhuma policy com `auth.uid()` comparado direto a colunas de domínio
- [ ] Modelo de identidade respeitado (`profiles.id` vs `auth.users.id`)

---

## 4. Permissões (RBAC)

- [ ] Sistema v2 ativo
- [ ] Sistema v1 congelado (read-only)
- [ ] Triggers de bloqueio V1 funcionando
- [ ] Nenhuma escrita detectada em tabelas V1
- [ ] `permission_migrations` consistente
- [ ] Dashboard de Migração funcional
- [ ] `get_my_permissions()` retorna corretamente
- [ ] `has_permission()` validado
- [ ] Admins recebem wildcard `['*']`
- [ ] Nenhum role hardcoded no frontend
- [ ] `RequirePermission` aplicado nas rotas críticas

---

## 5. URLs, Links e Navegação

- [ ] Nenhuma URL operacional contém `buId`
- [ ] Todas as URLs compartilháveis usam `/go/:entity/:id`
- [ ] `ResolveContextPage` funcionando:
  - Resolve BU
  - Valida acesso
  - Limpa cache
- [ ] `GlobalSearch` retorna apenas links `/go/*`
- [ ] Compatibilidade QR Code mantida:
  - `/assets/:code`
- [ ] Links de notificação usam `context_url` correto

---

## 6. Frontend — Qualidade e UX

- [ ] `PageHeader` centralizado em todas páginas
- [ ] `LoadingState` / `ErrorState` padronizados
- [ ] Estados vazios com `EmptyState`
- [ ] Nenhum `console.error` em produção
- [ ] Tipagem TypeScript sem erros
- [ ] URL State migrado (sem hooks legados)
- [ ] Navegação entre BUs limpa cache corretamente
- [ ] Dark/Light mode consistente (se aplicável)

---

## 7. Funcionalidades Críticas (Smoke Test)

- [ ] Login via OTP Code funciona
- [ ] Criação automática de profile via trigger
- [ ] Troca de BU funciona
- [ ] CRUD de Usuários
- [ ] CRUD de Times e Squads
- [ ] **OKRs:**
  - [ ] Criar objetivo
  - [ ] Criar KR
  - [ ] Check-in
- [ ] **KPIs:**
  - [ ] Criar KPI
  - [ ] Registrar valor
- [ ] **Assets:**
  - [ ] Inventário (checkout / return)
  - [ ] Chaves (claviculário)
  - [ ] Brindes (entrada / saída)
- [ ] Permissões respeitadas em todos módulos

---

## 8. Edge Functions & Integrações

- [ ] `request-magic-link` funcionando (envia OTP Code)
- [ ] `global-search` validando BU e permissões
- [ ] `get-public-asset` sanitizando corretamente
- [ ] Nenhuma Edge Function legada ativa
- [ ] Variáveis de ambiente configuradas
- [ ] SendGrid operacional
- [ ] Google Maps API funcionando
- [ ] Lovable AI acessível

---

## 9. Notificações & Eventos

- [ ] `notification_outbox` processando eventos
- [ ] `dedupe_key` evitando duplicatas
- [ ] Notificações obrigatórias ignoram preferências
- [ ] Preferências de usuário respeitadas
- [ ] Notificações in-app renderizam corretamente
- [ ] E-mails enviados com conteúdo correto
- [ ] Eventos outbound emitidos corretamente

---

## 10. Auditorias Obrigatórias

```bash
# Executar todos antes do go-live
npm run build

npx ts-node scripts/audit-bu-scope.ts
npx ts-node scripts/audit-rbac.ts
npx ts-node scripts/audit-query-keys.ts
npx ts-node scripts/audit-identity.ts
npx ts-node scripts/audit-select-star.ts
npx ts-node scripts/audit-permissions-v1-usage.ts
```

- [ ] `npm run build` → PASS
- [ ] `audit-bu-scope.ts` → PASS
- [ ] `audit-rbac.ts` → PASS
- [ ] `audit-query-keys.ts` → PASS
- [ ] `audit-identity.ts` → PASS
- [ ] `audit-select-star.ts` → PASS
- [ ] `audit-permissions-v1-usage.ts` → PASS

---

## 11. Backup & Recovery

- [ ] Backup pré-go-live realizado
- [ ] Backup armazenado com criptografia
- [ ] Equipe conhece o [Playbook de Restore](./BACKUP_RESTORE_PLAYBOOK.md)
- [ ] Responsáveis definidos (Tech Lead / DevOps)
- [ ] PITR testado em staging (se possível)

---

## 12. Comunicação & Governança

- [ ] Stakeholders avisados do go-live
- [ ] Janela de observação definida (24–72h)
- [ ] Monitoramento ativo pós-deploy
- [ ] Canal de incidentes definido
- [ ] Plano de rollback conhecido

---

## 13. Go-Live

- [ ] Deploy realizado
- [ ] Smoke test em produção
- [ ] Logs monitorados (Supabase + App)
- [ ] Métricas estáveis
- [ ] Nenhum erro crítico detectado

---

## 14. Pós-Go-Live (D+1 / D+7)

- [ ] Revisão de logs
- [ ] Revisão de auditorias
- [ ] Verificação de migração de permissões
- [ ] Ajustes finos documentados
- [ ] Atualização de changelog (TCR)

---

## Status Final

| Status | Descrição |
|--------|-----------|
| ☐ APROVADO PARA PRODUÇÃO | Todos os itens verificados |
| ☐ BLOQUEADO | Motivo: __________________ |

---

## Assinaturas

| Papel | Nome | Data |
|-------|------|------|
| Tech Lead | __________________ | ____/____/____ |
| DevOps | __________________ | ____/____/____ |
| QA | __________________ | ____/____/____ |

---

**Última revisão:** 2026-01-08  
**Próxima revisão:** Antes de cada go-live major
