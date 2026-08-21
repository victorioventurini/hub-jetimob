# Ajustar símbolo na página /auth e favicon

## O que vou fazer
1. Substituir o SVG atual em `src/assets/jetimob-icon.svg` pelo novo símbolo enviado (`jetimob-simbolo.svg`).
2. Criar `public/favicon.svg` a partir do mesmo símbolo.
3. Atualizar `index.html` para usar o novo favicon local (`/favicon.svg`) em vez do favicon externo.
4. Remover o favicon antigo `public/favicon.ico` (PNG mascarado) para evitar conflito.
5. Ajustar os filtros CSS em `src/pages/Auth.tsx` e `src/pages/SelectBu.tsx` que hoje forçam o ícone a branco (`brightness(0) invert(1)`); o novo símbolo tem preenchimento azul fixo (`#2A64F6`), então o filtro deixa de fazer sentido e pode distorcer a cor.

## Resultado esperado
- `/auth` exibe o novo símbolo azul no branding (desktop e mobile).
- Favicon da aplicação passa a ser o novo símbolo.
- Página de seleção de BU (`/select-bu`) mantém a consistência visual, já que usa o mesmo arquivo de ícone.
