Plano para resolver os comentários retroativos:

1. Ajustar a hidratação de citações no thread
- Em Tickets, além do JOIN `reply_to`, usar fallback pelo `reply_to_message_id` procurando a mensagem original já carregada na thread.
- Em Projects, aplicar o mesmo padrão pelo `reply_to_comment_id`.
- Isso cobre comentários antigos/retroativos mesmo quando o embed do backend não vier populado.

2. Incluir anexos da mensagem original na citação
- Ao montar a citação, buscar anexos pelo mapa global de anexos já carregado (`attachmentsByMessage` / attachments do projeto), não depender só dos anexos aninhados no JOIN.
- Exibir citação quando houver texto ou pelo menos um anexo.

3. Manter o comportamento de scroll até a mensagem citada
- Preservar o clique na citação para rolar até a mensagem original.
- Manter highlight temporário e aviso quando a mensagem original não estiver visível.

4. Validar no ticket reportado
- Conferir especificamente o ticket `21810f1f-ff6b-4a82-a310-7aae963b587f`.
- O comentário `6c53e96c-e2bc-4aad-a451-564bcef4feca` já tem `reply_to_message_id` apontando para a mensagem original `e8be230e-e424-4a53-b8b0-f6153794baa3`, e o anexo PDF também existe. A correção será de renderização/hidratação, não de schema.

Detalhes técnicos:
- Não criar migração: os dados retroativos já estão no banco.
- Não alterar RLS/permissões.
- Manter BU isolation e queries explícitas.
- Escopo de arquivos previsto: `TicketDetailPage.tsx`, `TicketMessageBubble.tsx` e `ProjectCommentsSection.tsx`, com possível pequeno helper compartilhado se reduzir duplicação.