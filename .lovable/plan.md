## Objetivo
No step `org-okrs` do MBR (`/rituals/mbr?step=org-okrs`), exibir **um Objetivo Organizacional por página**, com navegação interna "Anterior / Próximo" — mesmo padrão do `MbrKpiDeepDiveStep` (1 KPI fora da meta por página).

## Escopo
Apenas `src/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep.tsx`. Sem alterar:
- Ordem de steps (`STEP_ORDER`/`WIZARD_STEPS`)
- `MbrPage.tsx` (props do step inalteradas)
- Tipos `MbrOrgOkrSnapshot` / `MbrDraftData`
- Canônicos: `WizardStepScaffold`, `WizardStepFooter`, `OkrProgressBar`, `OkrStatusBadge`, `InlineDecisionInput`

## Mudanças no `MbrOrgOkrsStep.tsx`
1. **Estado de paginação local** (efêmero, igual ao KPI deep-dive):
   - `const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0)`
   - `useEffect` para clampar quando `orgOkrSnapshots.length` mudar.
2. **Header** (`WizardStepHeader`): badge passa a `${idx+1} / ${total}` (mantém `TeamKrsToggle`).
3. **Render**: substituir `.map(...)` por render do único `okr = orgOkrSnapshots[currentObjectiveIndex]`. Conteúdo do card preservado (título, trend, status, % badge, lista de KRs com `OkrProgressBar` + contribuições por time via `showTeamKrs`). Empty state preservado.
4. **Gate por página + footer**:
   - `currentNeedsDecision` = objetivo da página marcado "não é mais prioridade" e sem decisão `sourceStep === 'org-okrs'` ligada ao seu título.
   - `handlePrimary`: bloqueia se `currentNeedsDecision`; senão, se `!isLast` avança índice; se `isLast` chama `onContinue()`.
   - `handleBack`: se `isFirst` chama `onBack()`; senão recua índice.
   - `WizardStepFooter`: `backLabel = isFirst ? 'Voltar' : 'Anterior'`; `primaryLabel = isLast ? 'Consolidar Diretrizes' : 'Próximo Objetivo'`; `primaryDisabled = currentNeedsDecision`.
   - Mensagem amber só aparece quando `currentNeedsDecision`.
5. **InlineDecisionInput**: `sourceStep="org-okrs"` mantido; placeholder pode contextualizar com o título do objetivo atual (somente UX).

## Conformidade canônica (verificada)
- TCR v3.30.x: framework v4 do MBR mantém `org-okrs` como step próprio — sem mudança estrutural.
- `WIZARDS_FRAMEWORK_BOUNDARY.md`: scaffold/footer canônicos preservados.
- Padrão `rich-paginated` (1 item/página) já é canônico em `KpiGateStep`/`MbrKpiDeepDiveStep`.
- Sem queries novas → sem impacto em BU isolation, RLS, identity, query keys.

## QA manual
- `/rituals/mbr?step=org-okrs` com ≥ 2 objetivos org: badge `1/N` correto; "Próximo Objetivo" navega; no último vira "Consolidar Diretrizes" e avança para `decisions`.
- "Anterior" recua; no primeiro vira "Voltar" e sai do step.
- Marcar "não é mais prioridade" sem decisão bloqueia o botão e mostra msg amber.
- Toggle "KRs dos times" continua funcionando dentro da página.
- Empty state (0 objetivos) inalterado.
