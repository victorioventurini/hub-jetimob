
## Objetivo

Trocar **apenas o termo de marca exibido ao usuário** de "Hub" para "Next" em todo o front-end e em todas as notificações enviadas pelo sistema. Identificadores técnicos (`/hub/...`, `HubLayout`, `useHubBranding`, `hub_integrations_catalog`, etc.) **não serão alterados** — manter o build estável e evitar quebrar RLS, rotas, query keys e tipos gerados.

## Escopo

### Incluído (substituições de texto)
1. **Strings visíveis no front-end** (~128 ocorrências em `src/`):
   - Logos/sidebars: `HubGlobalSidebar.tsx`, `HubGlobalMobileSidebar.tsx`, `Sidebar.tsx` (texto "Hub" no logo já está como "Next" — auditar restantes).
   - Títulos de página e meta descriptions: `src/hooks/usePageTitle.ts` (template `"… | Hub <BU>"` → `"… | Next <BU>"`, ~30 strings).
   - PageHeaders/descriptions em páginas: `SettingsHome`, `SettingsIntegrations`, `SettingsUiCatalog`, `Modules`, `AutomationsPage`, `AssessmentsPage`, `AssetsPage`, `AreasPage`, `GlobalPermissionsPage`, `GlobalUsersPage`, `PerfDashboardPage`, `Profile`, `NotificationsPage`, `AnalysisResultPage`, `ProjectDetailPage`, etc.
   - Greetings: `useGreeting.ts`, `useGreetingSubtext.ts` ("Seu dia no Hub" → "Seu dia no Next").
   - Toasts/mensagens: `useRevokeBuAccess` ("não tem mais acesso ao Hub"), `useGenerateAnalysis` ("Adicione créditos no Hub"), `SettingsLayout` ("Você saiu do Hub"), etc.
   - Placeholder de configuração de canal: `ChannelConfigDialog.tsx` ("Hub Jet" → "Next Jet").
   - Stories/MDX visíveis: `Introduction.mdx`, `StatusBadge.stories.tsx`.
   - Comentários JSDoc que aparecem em hover/IDE são **opcionais** — proponho atualizar para consistência de marca.

2. **Notificações (edge functions)**:
   - `_shared/email-sender.ts`: `from` default, `<h1>Hub</h1>`, "Acessar o Hub", "Clique no botão abaixo para acessar o Hub".
   - `_shared/notification-providers/templates.ts`: `<h1>Hub</h1>`, "Ver no Hub", fallback `"Hub"` para nome de BU.
   - `_shared/notification-providers/email.ts`: `from` default `"Hub <…>"`.
   - `_shared/notification-providers/slack.ts`: link "Ver no Hub".
   - `process-notification-outbox/index.ts`: subject prefix `[Hub]` → `[Next]`.
   - `request-magic-link/index.ts`: subject "Seu link de acesso ao Hub" e mensagem de domínio não autorizado.
   - `auth-email-hook/index.ts`: subject, `from.name` `Hub <BU>` e mensagem de domínio.
   - `send-partner-invite/index.ts`: subject, corpo HTML e `from.name`.

### Excluído (mantido como está)
- Rotas (`/hub/...`), nomes de arquivo (`HubLayout.tsx`, `HubGlobalSidebar.tsx`, `useHubBranding.ts`), componentes, hooks, contextos (`HubModule`, `HubContextConfig`, `HUB_TOOLS`).
- Tabelas e colunas DB (`hub_integrations_catalog`, `hub_integrations_global_config`, etc.).
- Query keys e identificadores internos.
- Logger tags, nomes de tipos, testes que validam estrutura técnica.
- Termo "Hub de Rituais" se for nome funcional do módulo — **confirmar** (ver pergunta abaixo).
- `GitHub` em URLs/labels de integrações externas (`github.com` → "GitHub").

## Execução

```text
1. Auditoria final
   └─ Listar todas as strings com regex que case "Hub" como termo de marca
      (excluindo HubLayout/HubGlobal/useHub/hub_/HubModule/GitHub/…)
2. Substituições UI
   ├─ src/hooks/usePageTitle.ts          (templates e descriptions)
   ├─ src/hooks/useGreeting*.ts          (mensagens de saudação)
   ├─ src/components/layout/*Sidebar.tsx (textos do logo, se houver)
   ├─ src/pages/**, src/modules/**       (PageHeaders, toasts, copy)
   └─ src/pages/settings/notifications/ChannelConfigDialog.tsx (placeholder)
3. Substituições Notificações
   ├─ supabase/functions/_shared/email-sender.ts
   ├─ supabase/functions/_shared/notification-providers/{email,slack,templates}.ts
   ├─ supabase/functions/process-notification-outbox/index.ts
   ├─ supabase/functions/request-magic-link/index.ts
   ├─ supabase/functions/auth-email-hook/index.ts
   └─ supabase/functions/send-partner-invite/index.ts
4. Verificação
   ├─ rg final confirmando que não restou "Hub" como marca visível
   └─ Build (TypeScript) sem erros
```

## Riscos e mitigação
- **Não tocar** em `HubLayout`, `useHubBranding`, `hub_*` tabelas → preserva tipos gerados do Supabase e rotas.
- Templates de e-mail são puramente cosméticos → sem impacto em deliverability.
- Subject prefix `[Hub]` → `[Next]` pode quebrar regras de filtro/inbox que clientes externos tenham criado; aceitável dado o rebrand.

## Perguntas antes de implementar

1. **Domínio "Hub"** — manter a marca interna do produto (componentes, rotas `/hub`, hooks `useHubBranding`) como está, ou você quer também renomear identificadores? *(recomendação: manter — escopo já tem ~140 strings só de UI/notificações).*
2. **"Hub de Rituais"** (`src/routes/rituals.routes.tsx`) — é um nome funcional do módulo. Renomear para "Next de Rituais"? *(soa estranho — sugiro deixar ou trocar para "Central de Rituais").*
3. **Comentários JSDoc / cabeçalhos de arquivo** ("Hub da Jet") — atualizar também ou só o que o usuário vê em runtime?
