## Objetivo
Exibir o card "All Hands" no hub `/rituals` (`src/pages/Wizards.tsx`), visível apenas para admins da BU — mesmo gate da rota `/rituals/all-hands` (`requiresBuAdmin`).

## Mudança
Arquivo único: `src/pages/Wizards.tsx`.

1. Adicionar import de ícone (`Megaphone` do lucide-react).
2. Acrescentar uma nova `WizardDefinition` na seção `OKRs – Gestores e Executivos`, logo após o card do MBR:
   - `id: 'all-hands'`
   - `name: 'All Hands'`
   - `description: 'Apresentação mensal aberta da BU com KPIs e OKRs organizacionais'`
   - `icon: Megaphone`
   - `requiredRole: 'admin'` (já existe na hierarquia; só `isWildcard` adiciona `admin` aos `userRoles`, garantindo gating BU-admin/super-admin coerente com `requiresBuAdmin`)
   - `badge: 'Mensal'`, `badgeVariant: 'secondary'`
   - `requiresTeam: false`
   - `route: '/rituals/all-hands'`

3. Nada mais muda: `canAccessWizard` já bloqueia quem não tem o role, e a seção "Gestores e Executivos" só aparece para `manager`/`isWildcard`. Como `admin` é setado apenas via `isWildcard`, o card só renderiza para BU admin / super_admin — espelhando o `RitualRoute requiresBuAdmin`.

## Fora de escopo
- Sem alterações em rotas, RBAC, edge functions, schema ou nos steps do All Hands.
- Sem mudanças no MBR ou em outros wizards.
