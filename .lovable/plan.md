

# Plano: Documentação Deep Dive do /hub (Admin)

## Contexto

O `docs/HUB_TECHNICAL_DEEP_DIVE.md` existente já cobre o Hub na PARTE X (linhas 1775-1992), mas de forma resumida e misturada com 12 outras partes. O objetivo é criar um documento **dedicado e detalhado** exclusivamente para a área administrativa `/hub`, servindo como referência completa para assistentes de IA.

## O que será criado

**Arquivo:** `docs/HUB_ADMIN_DEEP_DIVE.md`

### Estrutura do documento

```text
1. Visão Geral e Filosofia
   - Hub vs BU Settings (escopo, acesso, guards)
   - Controle de acesso (HubRoute, AdminRoute, ProtectedRoute)

2. Layout e Navegação
   - SettingsLayout (sidebar + header + mobile)
   - HubGlobalSidebar (mainItems + platformItems + externalLinks)
   - Mapa completo de 19 rotas

3. Home do Hub (/hub)
   - Stats cards (BUs, módulos, integrações, usuários)
   - Quick access cards
   - Queries e cache keys

4. Business Units (/hub/business-units)
   - CRUD com branding (logo, cores, allowed_email_domains)
   - Dialogs: Create, Edit, Detail
   - handle_new_user trigger e resolução de domínio
   - bu_user_memberships e role_in_bu

5. Módulos (/hub/modules)
   - Tabs: Configuração por BU / Catálogo
   - Toggle de módulos operacionais por BU (bu_module_configs)
   - Módulos globais (sempre ativos)
   - Sub-rota: /hub/modules/okrs/settings
     - Aba Ciclos (CRUD de cycles)
     - Aba Rituais (máquina de estados QBR)
     - Aba Limites (MAX_OBJECTIVES, MAX_KRS, MAX_CONTRIBUTIONS)
     - Aba Regras de Vínculo (contribution/enabler/foundational)

6. Configurações de OKRs (/hub/modules/okrs/settings)
   [Seção expandida — vínculos OKR ↔ Rituais]
   - Ciclos: trimestre, semestre, anual
   - QBR Status Machine: closed → open → collecting → reviewing → ready → done
   - Fluxo de Wizards do QBR (4 fases com requiredStatus)
   - Cadências de rituais (ritual_cadences → ritual_occurrences)
   - Mapa completo: wizard_type ↔ persona ↔ frequência ↔ cadência

7. Integrações (/hub/integrations)
   - Catálogo (hub_integrations_catalog)
   - Config global vs override por BU
   - Agentes de IA (CRUD, instruction sources, logs)
   - Cron Jobs
   - Sub-rotas (7 rotas)

8. Automações (/hub/automations)
   - Outbound: eventos → webhooks
   - Inbound: tokens → ações
   - Logs de execução

9. Permissões (/hub/permissions)
   - 6 tabs: catálogo, templates-v2, presets, governance, surfaces, audit
   - Nomenclatura: módulo.recurso.ação:escopo
   - RBAC V3

10. Cargos (/hub/job-titles)
    - CRUD multi-BU
    - Contagem de uso

11. Usuários (/hub/users)
    - Filtros: tipo, BU, onboarding, terminated
    - Sheet de detalhes

12. Parceiros (/hub/partners)
    - Empresas (PF/PJ) com documento
    - Associações multi-BU
    - Detalhe do parceiro

13. Notificações (/hub/notifications)
    - Eventos, canais, templates
    - Configuração de delivery

14. Performance (/hub/performance)
    - Métricas de banco de dados
    - Latência, índices, tamanho de tabelas

15. UI Catalog (/hub/ui)
    - Referência visual do design system

16. Mapa OKR ↔ Rituais (Seção Especial)
    - Tabela completa: wizard_type, label, persona, frequência,
      rota, dispara email, agentes IA, requiredStatus (se QBR)
    - Diagrama da cadeia: cadence → occurrence → session → reflection_data
    - Tabelas envolvidas e suas relações
```

## Detalhes técnicos

- Formato: Markdown narrativo (mesmo estilo do deep dive existente)
- Inclui diagramas ASCII para fluxos complexos (QBR state machine, sistema de integrações, automações)
- Tabelas de referência para rotas, componentes e hooks
- Seção especial de "Mapa OKR ↔ Rituais" com a tabela completa dos 12 wizard_types
- Referências a arquivos-chave com paths relativos

## Impacto

- Nenhuma alteração de código
- 1 arquivo novo: `docs/HUB_ADMIN_DEEP_DIVE.md`
- Estimativa: ~800-1000 linhas de documentação

