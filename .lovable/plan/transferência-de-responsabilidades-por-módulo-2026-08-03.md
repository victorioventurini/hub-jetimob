# Transferência de responsabilidades por módulo

Reorganizar o modal "Transferir Responsabilidades" (exclusão de usuário) para que a transferência seja feita **por módulo**, com um responsável padrão por módulo e ajuste item a item quando necessário.

## Como fica a experiência

O modal passa a ter um bloco por módulo, cada um em uma seção recolhível com contagem e status ("2 de 5 definidos"):

```text
Transferir Responsabilidades — Guilherme
[!] 12 itens precisam de novo responsável

Transferir tudo para: [ Selecionar pessoa ]      (atalho global, opcional)

▸ OKRs                              8 itens   [3/8]
    Transferir todos deste módulo para: [ ▾ ]
    • Objetivos Organizacionais / KRs Organizacionais
    • Objetivos de Time / Key Results de Time
    • Iniciativas
▸ KPIs                              2 itens   [0/2]
    Transferir todos deste módulo para: [ ▾ ]
▸ Times e Áreas                     3 itens   [1/3]
    Transferir todas as lideranças para: [ ▾ ]
    • Liderança de time — um select por time
    • Liderança / co-liderança de área — um select por área
▸ Assets                            1 item    [0/1]
▸ Tickets                           4 itens   [0/4]
    • Tickets abertos + Regras de roteamento interno
▸ Vínculos removidos automaticamente
    • Co-responsabilidade em KRs, contribuição em KPIs (apenas informativo)
```

Regras:
- Cada módulo tem seu próprio seletor "transferir todos deste módulo para", que preenche apenas os itens daquele módulo (não sobrescreve escolhas de outros módulos).
- O select global continua existindo como atalho para preencher tudo de uma vez.
- Selects individuais seguem funcionando e sobrepõem o padrão do módulo.
- Lideranças de time/área continuam com a opção "Remover liderança (deixar vago)".
- Módulos sem itens não aparecem.
- O botão de confirmar segue bloqueado até todos os itens obrigatórios terem responsável; cada módulo pendente mostra o contador em destaque.

## Correção incluída

Recomendações de Assets (`asset_recommendations` com o usuário como responsável) já são buscadas e contadas no total obrigatório, mas hoje **não aparecem no modal e não são transferidas** — ficam apontando para o usuário removido. O módulo Assets passa a exibi-las e transferi-las de fato.

## Detalhes técnicos

- `src/components/users/UserDependenciesDialog.tsx`: introduzir uma definição declarativa de módulos (`MODULE_GROUPS`) mapeando módulo → seções (título, ícone, lista de itens, chave de transferência, `allowNone`). O render passa a iterar essa estrutura usando `Accordion` (shadcn) em vez do JSX repetido atual; `handleBulkTransfer` é generalizado para `applyBulk(scope)` onde `scope` é global ou um módulo. Contadores de pendência por módulo via `useMemo`.
- Adicionar `assetRecommendations` a `MandatoryDependencyType`, a `EMPTY_TRANSFERS`, à checagem `allMandatoryAssigned` e ao `TransferConfig` montado em `handleConfirm`.
- `src/hooks/useProfiles.ts`: adicionar `assetRecommendations: TransferItem[]` em `TransferConfig.transfers` e o loop de update em `asset_recommendations.owner_user_id` (com `updated_at`), no mesmo padrão dos demais.
- Sem mudanças de banco, RLS ou de dados; `useUserDependencies` permanece como está.
