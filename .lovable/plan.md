
Diagnóstico confirmado após pré-checklist canônico:
- TCR v3.25.0 lido, incluindo a seção de URL Detonation Mitigation.
- DEVELOPMENT_STANDARDS v1.29.0, IDENTITY_CONVENTION v2.2.0, PERMISSIONS_AND_RBAC_MODEL v1.5.0 e DATA_MODEL_REGISTRY consultados.
- Fluxo atual revisado em `src/App.tsx`, `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx`, `src/pages/AuthConfirm.tsx`, `src/routes/public.routes.tsx` e `supabase/functions/request-magic-link/index.ts`.

Problema real:
- O domínio `ferrigoloadvogados.com.br` já está configurado para cair em `/auth/confirm`.
- Porém a rota `/auth/confirm` foi adicionada apenas em `src/routes/public.routes.tsx`.
- O app real não usa esse arquivo no bootstrap público: `src/App.tsx` ainda hardcodeia as rotas públicas e NÃO registra `/auth/confirm`.
- Resultado: quando Mariana abre o magic link, a URL `/auth/confirm?...` não encontra rota pública e cai no catch-all autenticado. Isso quebra justamente a mitigação criada para ela.

Plano de correção:
1. Corrigir o roteamento público em `src/App.tsx`
   - Registrar explicitamente `/auth/confirm` junto de `/auth` e `/auth/callback`, ou
   - Preferencialmente passar a consumir `publicRoutes` centralizado para evitar divergência futura entre `App.tsx` e `src/routes/public.routes.tsx`.

2. Eliminar a duplicação de fonte de verdade das rotas públicas
   - Unificar o bootstrap para que novas rotas públicas sejam definidas em um único lugar.
   - Isso evita regressão igual à atual quando uma rota é criada mas não é realmente montada no app.

3. Ajustar pequenos pontos de UX do fluxo de auth
   - Fazer `/auth` ler `?email=` para o CTA “Solicitar novo link” funcionar de ponta a ponta.
   - Garantir que `/auth/confirm` preserve `next` e leve corretamente para `/auth/callback`.

4. Revisar o erro de runtime visto no console
   - O log mostra erro em `<AppRoutes>`, coerente com problema de roteamento.
   - Na implementação, validar se o crash desaparece após registrar a rota pública corretamente.

Arquivos a alterar:
- `src/App.tsx` — correção principal
- `src/pages/Auth.tsx` — suporte a `?email=` e refinamento do retry
- Opcionalmente `src/routes/public.routes.tsx` / `src/routes/index.ts` — consolidar fonte única de verdade

Validação após implementar:
- Abrir um link `/auth/confirm?...` e verificar que a tela “Confirme seu acesso” aparece.
- Clicar em “Acessar o Hub” e confirmar navegação para `/auth/callback`.
- Validar que o fluxo continua normal para domínios fora de `URL_DETONATION_DOMAINS`.
- Validar que “Solicitar novo link” volta para `/auth` com e-mail preenchido.

Impacto esperado:
- Corrige o bloqueio específico da Mariana sem mexer em banco nem em permissões.
- Mantém compatibilidade com os outros domínios.
- Fecha a principal regressão do v3.25.0: rota criada, mas não montada no app.
