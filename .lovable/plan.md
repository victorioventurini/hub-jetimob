

## Fase: Step 4 — Análise por Time com navegação 1-por-vez

### Problema atual

O `MbrTeamOkrsDetailStep` renderiza **todos os times** num grid scrollável. Com muitos times, a revisão fica superficial e o conteúdo denso.

### Solução

Usar o `currentTeamIndex` (já existe no `MbrDraftData`) para exibir **um time por vez** dentro do mesmo step, com navegação interna prev/next. Tudo permanece dentro do wizard — sem rotas extras.

### Alteração única: `MbrTeamOkrsDetailStep.tsx`

**Layout por time (1/N):**
- Header mostra `"Time 1 de N — [Nome do Time]"` com barra de progresso de revisão
- Área de conteúdo mostra apenas os OKRs/KRs do time atual (usando a mesma estrutura de cards já existente)
- Checkbox "Revisado" fixo no `topFixed` junto com o nome do time
- `InlineDecisionInput` no `bottomFixed` (já existente)

**Navegação interna (dentro do step):**
- Botões "← Time anterior" / "Próximo time →" no footer
- Ao marcar "Revisado" e clicar próximo, avança `currentTeamIndex`
- O botão "Prosseguir para OKRs Org" só aparece quando no último time E todos revisados
- Botão "Voltar" no primeiro time retorna ao step anterior (overview)

**Props inalteradas** — o componente já recebe `currentTeamIndex` e `onCurrentTeamIndexChange`. Basta ativá-los (atualmente ignorados com `_prefix`).

### Detalhes técnicos

```text
┌─────────────────────────────────┐
│ Header: "Análise por Time"      │
│ "Time 2 de 5 — Comercial"      │
├─────────────────────────────────┤
│ [■■■■░░░░░] 1/5 revisados      │
│ ☑ Marcar como revisado          │
├─────────────────────────────────┤
│                                 │
│   OKR 1 do time atual           │
│     └─ KR 1 [====▓░░] 67%      │
│     └─ KR 2 [==▓░░░░] 40%      │
│                                 │
│   OKR 2 do time atual           │
│     └─ KR 1 ...                 │
│                                 │
├─────────────────────────────────┤
│ [Nota sobre este time...]       │
├─────────────────────────────────┤
│ ← Time anterior  Próximo time → │
│        (ou "OKRs Org →")        │
└─────────────────────────────────┘
```

### Regras de navegação

- `onBack`: se `currentTeamIndex > 0` → decrementa index; se `== 0` → chama `onBack()` (volta ao overview)
- `onNext`: se `currentTeamIndex < N-1` → incrementa index; se `== N-1` e todos revisados → chama `onContinue()` (avança ao step org-okrs)
- Gate: botão primário desabilitado no último time se algum time não foi revisado
- Times sem OKRs: pular automaticamente (não contam para revisão)

### Arquivos tocados

| Arquivo | Ação |
|---|---|
| `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx` | Refatorar para exibir 1 time por vez |
| `src/modules/okrs/components/wizards/mbr/__tests__/MbrTeamOkrsDetailStep.test.tsx` | Atualizar testes para nova navegação |

Zero componentes novos. Zero alterações de tipo. O `currentTeamIndex` e `onCurrentTeamIndexChange` já existem na interface.

