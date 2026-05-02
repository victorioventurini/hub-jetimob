## Remover botão "Ver OKRs" do Summary do Check-in Individual

No step `summary` do `CollaboratorSummary.tsx`, há um botão secundário **"Ver OKRs"** ao lado de **"Copiar resumo"**. O usuário pediu para removê-lo.

### Mudança

- **Arquivo**: `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`
- Remover o botão "Ver OKRs" (e seu handler/import de ícone se ficarem órfãos).
- Manter o botão "Copiar resumo" e o restante do bloco de ações secundárias intacto.
- Se "Copiar resumo" ficar sozinho, manter o mesmo container (sem refator de layout).

### Fora de escopo

- Sem mudanças em footer, persistência, draft, snapshot ou demais seções do summary.
- Sem mudanças em outros steps ou páginas.
