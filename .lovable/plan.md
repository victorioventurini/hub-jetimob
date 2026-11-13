# Corrigir conclusão do Check-in Individual sem ciclo trimestral ativo (BU Soul)

## Diagnóstico (confirmado)
- João (joao@jetxp.com.br) está na BU Soul, que hoje só tem o ciclo anual 2026 ativo; o Q4 2026 está "em planejamento". Não há ciclo trimestral ativo.
- Sem ciclo trimestral, a página de check-in usa o texto fixo `'no-cycle'` como identificador do ciclo. Esse texto é enviado ao banco no campo do ciclo, que só aceita um ID válido, então a gravação falha.
- Na Soul não existe nenhum check-in individual gravado (nenhum rascunho nem concluído), o que confirma que toda gravação falha. O rascunho do João fica só no navegador.
- O botão "Confirmar conclusão" não mostra mensagem de erro porque a falha não é tratada na tela; o usuário fica parado sem retorno.

## O que será feito
1. Quando não houver ciclo trimestral ativo, gravar o check-in sem ciclo (vazio) em vez de `'no-cycle'`. O identificador `'no-cycle'` continua só para guardar o rascunho no navegador, assim o rascunho atual do João é preservado.
2. Tratar a falha ao concluir: mostrar mensagem clara ("Não foi possível concluir o check-in, seu rascunho foi preservado") em vez de travar em silêncio.
3. Adicionar teste garantindo que, sem ciclo ativo, o valor enviado ao banco é vazio e nunca `'no-cycle'`.
4. Verificar se outros ritos que usam o mesmo mecanismo de rascunho têm o mesmo problema e aplicar a mesma correção.

## Detalhes técnicos
- `CollaboratorCheckinPage.tsx`: `cycleId: quarterlyCycle?.id || 'no-cycle'` passa a `quarterlyCycle?.id ?? null`; ajustar `useGenericWizardDraft` para usar `'no-cycle'` apenas na chave de localStorage (mantendo compatibilidade com a chave existente) e enviar `null` em `useGenericWizardDraft.session.ts` (insert/update/complete).
- `handleComplete`: adicionar `catch` com `handleError`/toast em torno de `clearDraft`.
- Teste unitário no `__tests__` existente do hook.

## Após publicar
João deve reabrir o check-in (rascunho continuará lá) e clicar em Concluir novamente. Alternativa imediata sem código: ativar o ciclo Q4 2026 da Soul.
