# Prompt para o outro projeto: Copy e Assunto do Magic Link

Objetivo: gerar o assunto e corpo do e-mail de magic link (login sem senha) para o outro projeto, usando o envio padrão do Lovable (sem domínio de e-mail personalizado).

---

## Prompt para colar no outro projeto

```text
Crie o copy e o assunto do e-mail de magic link (login sem senha) do app. O envio será feito pelo endereço padrão do Lovable, então não crie um remetente personalizado nem se preocupe com SPF/DKIM.

Requisitos:

1. Assunto
   - O assunto deve ser claro, curto e evitar que o e-mail seja agrupado como thread por clientes de e-mail (gmail, outlook, etc.).
   - Sempre incluir um carimbo de tempo/identificador único, como: "Seu link de acesso - [AppName] - 21/08 às 16:56".
   - Não usar palavras como "grátis", "urgente", "clique aqui" ou emojis no assunto.

2. Saudação
   - Usar apenas o primeiro nome do usuário (primeiro token do nome).
   - Exemplo: "Olá, Victorio!"
   - Se o nome não estiver disponível, fallback para "Olá!" ou "Olá, usuário!" (nunca usar parte do e-mail como nome).

3. Corpo
   - Linguagem direta, calma e de confiança.
   - Incluir frase curta explicando que o link dá acesso ao app sem senha.
   - Incluir tempo de validade do link (recomendado: 10 minutos).
   - Um botão de ação principal (CTA) centralizado, com texto objetivo: "Acessar o [AppName]".
   - Abaixo do botão, incluir o link em texto puro (copiável) para casos de clientes de e-mail que bloqueiam botões.
   - Incluir frase de segurança: "Se você não solicitou este link, pode ignorar este e-mail com segurança."
   - Incluir rodapé curto com o propósito/identidade do app (1 frase).

4. Design/HTML
   - Layout responsivo, centralizado, máximo 480px de largura.
   - Fonte do sistema (San Francisco, Segoe UI, Roboto, Helvetica Neue, Arial).
   - Fundo cinza claro (#f4f4f5), card branco, bordas arredondadas (12px), sombra sutil.
   - Botão: cor primária do app, texto branco, padding confortável, bordas arredondadas (8px).
   - Cores de texto: título escuro (#18181b), corpo (#3f3f46), secundário (#71717a), rodapé (#a1a1aa).
   - Sem imagens externas (evita quebrar se o servidor de imagens estiver indisponível). Logo pode ser tipográfico usando texto.

5. Considerações de entregabilidade
   - Não usar scripts, formulários, iframes ou anexos.
   - Mantenha o HTML simples e com tabelas/inline styles para compatibilidade com Outlook.
   - Texto puro deve ser legível mesmo se o HTML não renderizar.

6. Variáveis dinâmicas que o app irá substituir
   - {{firstName}} — primeiro nome do usuário.
   - {{magicLink}} — URL completa do magic link.
   - {{appName}} — nome do app.
   - {{tagline}} — frase curta do app (ex: "O ponto de encontro para evoluir, executar e simplificar o morar.").
   - {{validityMinutes}} — tempo de validade do link (padrão 10).
   - {{timestamp}} — carimbo de data/hora para o assunto (formato DD/MM às HH:MM).

Entregável esperado:
- Texto do assunto (linha única, com placeholders).
- Corpo completo do e-mail em HTML (com placeholders).
- Versão alternativa em texto puro (plain text).
- Explicação breve de cada escolha de copy.
```

---

## Notas sobre o prompt
- O prompt assume envio pelo endereço padrão do Lovable, por isso **não** pede configuração de domínio/remetente personalizado.
- A estrutura segue o padrão atual do Hub: saudação por primeiro nome, botão centralizado, link copiável, frase de segurança, rodapé com identidade.
- O carimbo de tempo no assunto evita que clientes de e-mail agrupem vários magic links em uma só thread.
- Se o outro app tiver um nome/tagline diferente, basta ajustar `{{appName}}` e `{{tagline}}` na hora de aplicar.
