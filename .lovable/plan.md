## Contexto

No step `Iniciativas` do Check-in Individual, o copy ainda diz "Revise as iniciativas e marque as que precisam de atenção". A funcionalidade de "marcar como atenção" foi removida — o usuário hoje só revisa e (se for owner) faz quick update. O badge vermelho "X atenção" no header continua existindo, mas é derivado automaticamente do status (`blocked` + `overdue`), não de uma ação manual.

## Mudança

Atualizar o copy nos dois pontos do `CollaboratorInitiativesStep.tsx` para refletir que a revisão é passiva (sem marcação manual), mantendo o badge automático.

**Arquivo:** `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`

- **Linha 261** (header do estado vazio / scaffold):
  - **De:** `Revise as iniciativas e marque as que precisam de atenção`
  - **Para:** `Revise o andamento das suas iniciativas no ciclo`

- **Linha 315** (subtítulo do header com lista):
  - **De:** `Revise as iniciativas e marque as que precisam de atenção.`
  - **Para:** `Revise o andamento das suas iniciativas. Bloqueadas e atrasadas já vêm sinalizadas.`

Sem outras mudanças — botões, badges automáticos e quick update permanecem como estão.