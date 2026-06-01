## Objetivo

Não exibir o CPF na tela `/users/:id` (UserProfile).

## Mudanças em `src/pages/UserProfile/index.tsx`

1. Remover o bloco de exibição do CPF (linhas ~760–765) na sidebar do perfil.
2. Remover o `useQuery` que busca `cpf, user_type` da tabela `profiles` (linhas ~135–150) — não é mais necessário no front.
3. Remover imports não utilizados após a limpeza:
   - `formatCpf` de `@/lib/validation/cpf`
   - `useBuScopedSupabase` (se não for usado em outro lugar do arquivo — validar antes de remover)
   - `useQuery` / `profilesKeys` (idem — manter se ainda usados em outro trecho)

## Escopo NÃO incluído

- Não altero outras páginas que tratam CPF de partners/contacts (HubPartners, PartnerCompanyDialog, etc.) — são entidades distintas.
- Não removo a coluna `cpf` do banco nem mexo em RLS.
- Não toco no fluxo de assessments (CPF de identificação de respondente).

## Validação

- Recarregar `/users/7f7e3765-...` e confirmar que o bloco "CPF: ..." não aparece mais.
- Confirmar que nenhum import ficou órfão (tsc/build).
