# Pré-MBR do time Comercial: por que o Vitor não conseguiu preencher

## O que foi verificado

Não houve erro de permissão nem de RLS. O Vitor tem as permissões de KPI necessárias (`kpis.value.create:bu`, `kpis.value.add:bu`, `kpis.settings.manage:bu` via templates "KPIs: Admin v2" e "Operador v2") e a janela do rito está aberta (override de 11 a 15/08/2026). Não existe sessão de Pré-MBR criada por ele no ciclo atual.

O bloqueio é a etapa **"Validação de Dados"**, que abre o Pré-MBR e impede o avanço enquanto houver qualquer pendência (o botão vira "Resolver pendências (N)" e apenas super admin tem a opção de pular). Para o time Comercial, com mês de referência julho/2026, há 3 pendências:

| Pendência | Situação |
|---|---|
| KPI "Ciclo de vendas" | último valor em 21/06/2026 — sem valor consolidado de julho |
| KPI "Taxa de Win" | último valor em 30/06/2026 — sem valor consolidado de julho |
| KR "Aumentar a receita oriunda de novos produtos de R$3.243 para R$15.000" | nunca recebeu check-in |

Os outros 6 KRs do Comercial têm check-in de 10/08 e passam na regra. Os KPIs "New Logos" e "MMR de parceiros" têm consolidado de julho e estão em dia.

Observação secundária: o `profiles.team_id` do Vitor aponta para **Marketing**, embora ele lidere **Comercial**. Ao abrir o rito sem `?team=`, ele pode cair no contexto de Marketing (cujo Pré-MBR já foi enviado por outra pessoa), o que reforça a impressão de "não consigo preencher".

## Ajustes propostos

### 1. Destravar agora (dados)
Registrar, com o Vitor, o valor consolidado de julho de "Ciclo de vendas" e "Taxa de Win" e o check-in do KR de novos produtos — tudo direto na própria etapa de validação (os diálogos de registro e check-in já existem ali). Isso libera o Pré-MBR do Comercial imediatamente.

### 2. Corrigir o time do perfil
Ajustar `profiles.team_id` do Vitor para Comercial, para que o rito, os check-ins e os filtros por time o coloquem no contexto correto por padrão.

### 3. Tornar o gate explicável e não-cego (frontend)
- Mostrar no topo da etapa o motivo textual do bloqueio já expandido (hoje o detalhe só aparece em toast ao clicar no botão), com o mês de referência em destaque.
- Quando o time do usuário no perfil for diferente do time do rito, exibir aviso "Você está preenchendo o Pré-MBR do time X" com o seletor de time visível.

### 4. Permitir "sem dados" justificado no gate (opcional — decidir)
Hoje um KPI sem valor no mês fechado bloqueia o rito de forma absoluta. Alternativa: permitir que o líder marque o KPI como "sem dados no mês" com justificativa obrigatória, que já é um campo existente do Pré-MBR (`kpiNoDataReasons`), e liberar o avanço. KRs sem check-in continuariam bloqueando.

## Notas técnicas

- Gate: `src/modules/okrs/components/wizards/mbr-pre/MbrPreDataValidationStep.tsx` (`handlePrimary` bloqueia quando `totalPending > 0`).
- Regras: `src/modules/okrs/hooks/useMbrPreValidationData.ts` — KPI pendente quando `update_overdue` ou sem consolidado do `referenceMonth`; KR pendente quando nunca teve check-in ou último check-in anterior ao início do mês de referência.
- Itens 3 e 4 são mudanças de apresentação/gate no wizard; nenhuma migração de schema é necessária. O item 2 é correção de dado no perfil.
