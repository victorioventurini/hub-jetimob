

# Plano: Página Tutorial — Ciclos e Rituais no Hub

## O que será criado

Uma nova aba **"Guia"** na página de Configurações de OKRs (`/hub/modules/okrs/settings?tab=guide`), seguindo o padrão visual da `RulesInfoTab` (cards informativos com ícones e badges).

## Conteúdo do tutorial

O guia será dividido em seções visuais (cards) cobrindo:

1. **Ciclo de vida dos Ciclos** — Diagrama dos 3 estados (`Planejamento → Em execução → Encerrado`) com explicação de cada transição e quem pode executar
2. **Transição automática** — Como funciona o toggle de auto-gestão, quando o cron ativa/encerra, e o comportamento opt-in
3. **Rituais e disponibilidade** — Tabela dos 6 rituais (Colaborador, Líder, Time, Gestores, C-Level, MBR) com frequência sugerida e pré-requisito (ciclo ativo)
4. **QBR — Fluxo especial** — Máquina de estados do QBR (closed → open → collecting → reviewing → ready → done) e por que a abertura é manual
5. **Fluxo recomendado** — Passo a passo visual: criar ciclos → ativar toggle (ou ativar manual) → rituais ficam disponíveis → executar rituais → encerrar ciclo
6. **Dicas e boas práticas** — Criar ciclos com antecedência em `planning`, não sobrepor ciclos do mesmo tipo, usar o calendário de rituais para acompanhamento

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/modules/okrs/components/settings/CyclesRitualsGuideTab.tsx` | **Novo** — Componente com o conteúdo do tutorial |
| `src/modules/okrs/pages/OkrsSettingsPage.tsx` | Adicionar aba "Guia" com ícone `BookOpen` ou `GraduationCap` |

## Detalhes técnicos

- Componente puramente visual (sem queries, sem estado) — apenas cards, badges, ícones e texto
- Segue o padrão da `RulesInfoTab` (cards com `CardHeader`/`CardContent`, badges coloridos, ícones Lucide)
- O diagrama de estados será feito com flexbox + setas (ícones `ChevronRight`/`ArrowRight`)
- Responsivo por padrão via Tailwind grid

