## Objetivo

Garantir que o card **All Hands** apareça em `/rituals` para qualquer usuário que seja admin da BU ativa (ou super_admin), sem depender de outras roles intermediárias e sem duplicar componentes.

## Diagnóstico

- O código em `src/pages/Wizards.tsx` (linhas 195–206) já registra o wizard `all-hands` dentro da seção `OKRs – Gestores e Executivos`, com `requiredRole: 'admin'`.
- `victorio@jetimob.com` tem `role_in_bu='admin'` na BU jetimob → `get_my_permissions` retorna `['*']` → `isWildcard=true`.
- Logo, em código ele deveria ver o card. Se não está aparecendo, as causas restantes são:
  1. **Cache/deploy**: build publicada (`hub.jetimob.com`) ainda sem o código novo, ou bundle antigo no navegador.
  2. **Acoplamento de seção**: o card depende da seção "OKRs – Gestores e Executivos" estar visível, o que hoje exige `manager` OU `isWildcard`. Para um admin de BU "puro", isso funciona via wildcard, mas qualquer regressão na regra de seção esconderia o card silenciosamente.

## Mudanças (apenas frontend, sem novos componentes)

### 1. Mover All Hands para uma seção própria "Comunicação da BU"

Em `src/pages/Wizards.tsx`:

- Adicionar uma nova `WizardSection` ao final de `WIZARD_SECTIONS`:
  - `title: 'Comunicação da BU'`
  - `description: 'Rituais abertos da BU'`
  - `icon: Megaphone`
  - `wizards: [<All Hands>]` (mover o objeto atual, mantendo `requiredRole: 'admin'`, `route: '/rituals/all-hands'`).
- Remover o card All Hands de "OKRs – Gestores e Executivos".

Justificativa: card passa a ser visualmente distinto, não compete com MBR/QBR e a regra de visibilidade fica isolada.

### 2. Tornar a regra de seção explícita para admin

No filtro `visibleSections`:

- Adicionar caso para `'Comunicação da BU'`: visível somente quando `isWildcard === true` (ou seja, super_admin global ou admin da BU). Sem dependência de `manager`/`executive`.

```ts
if (section.title === 'Comunicação da BU' && !isWildcard) {
  return false;
}
```

Isso garante que admins puros de BU vejam o card mesmo se a regra da seção "Gestores e Executivos" mudar.

### 3. Sem mudanças em backend, rotas, RBAC ou componentes do wizard

- A rota `/rituals/all-hands` (com `RitualRoute requiresBuAdmin`) já está correta e protege o acesso server-side.
- `useRitualAvailability['all-hands']`, `ritualLabels['all-hands']` e `wizard-configs['all-hands']` permanecem inalterados.
- Nenhum novo componente. O card reusa o mesmo `Card`/`CardHeader` da grade existente.

### 4. Pós-deploy

- Republicar (`hub.jetimob.com`) e instruir refresh com cache limpo, para descartar a hipótese (1) acima.

## Critério de aceite

- Logado como `victorio@jetimob.com` na BU jetimob, em `/rituals`, aparece a seção **Comunicação da BU** com o card **All Hands**, ícone `Megaphone`, badge "Mensal", botão "Iniciar ritual" navegando para `/rituals/all-hands`.
- Usuários sem `admin`/`super_admin` na BU não veem a seção nem o card.
- Nenhuma outra seção/card é alterado.

## Fora de escopo

- Janela de disponibilidade do ritual (`useRitualAvailability`).
- Alterações em RLS, edge functions, esquema, rotas ou Pré-MBR/MBR/QBR.
- Mudanças visuais nos demais cards.
