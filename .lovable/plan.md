

## Feedback com Estrelas no Encerramento do MBR

### Resumo

Substituir o modelo "texto obrigatório" por "rating 1-5 estrelas obrigatório + texto opcional" no feedback anônimo do encerramento. Os dados são persistidos no snapshot JSONB (`reflection_data` em `okr_wizard_sessions`), sem alterações de banco.

---

### 1. Tipagem — `src/modules/okrs/types/wizard.ts` (linhas 228-233)

Adicionar campo `rating` ao `RitualImprovementFeedback`:

```typescript
export interface RitualImprovementFeedback {
  id: string;
  rating: number;  // 1-5 (novo, obrigatório)
  text: string;    // agora pode ser '' (opcional)
  status: 'pending' | 'implement' | 'evaluated' | 'discarded';
  createdAt: string;
}
```

### 2. UI — `MbrClosingStep.tsx`

- **Estado local**: Adicionar `feedbackRating: number` (inicia em 0).
- **Input de estrelas**: 5 ícones `Star` (lucide, já disponível) clicáveis. Preenchidos (`fill="currentColor"`) até o rating selecionado, vazios após. Cor: `text-yellow-400` quando preenchido, `text-muted-foreground` quando vazio.
- **Textarea**: Mantido ao lado, placeholder "Comentário opcional...", sem obrigatoriedade.
- **Botão Enviar**: Habilitado quando `feedbackRating >= 1` (rating selecionado). Ao clicar, cria `RitualImprovementFeedback` com `rating` e `text` (pode ser `''`). Reseta rating e texto.
- **Lista de feedbacks**: Cada card exibe estrelas preenchidas inline + texto (se houver) + botão X para remover.
- **Gate**: `hasFeedback = ritualFeedback.length > 0` — inalterado. Uma avaliação com rating basta.

### 3. Testes — `MbrClosingStep.test.tsx`

- Atualizar fixtures existentes para incluir `rating: 4`.
- Novo teste: clicar na 3a estrela + enviar → `onRitualFeedbackChange` recebe item com `rating: 3`.
- Verificar gate: botão enviar desabilitado sem estrelas selecionadas.

### Arquivos tocados

| Arquivo | Ação |
|---|---|
| `src/modules/okrs/types/wizard.ts` | Adicionar `rating` ao type |
| `src/modules/okrs/components/wizards/mbr/MbrClosingStep.tsx` | UI de estrelas + texto opcional |
| `src/modules/okrs/components/wizards/mbr/__tests__/MbrClosingStep.test.tsx` | Atualizar testes |

Zero componentes novos. Zero alterações de banco. O componente de estrelas é inline (5 botões `Star`).

