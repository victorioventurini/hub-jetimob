# QA Checklist - URL State

## Testes Obrigatórios

### 1. Persistência de Estado

- [ ] **Refresh**: Aplicar filtros → F5 → Filtros mantidos
- [ ] **Abrir em nova aba**: Copiar URL → Abrir em aba anônima → Estado reproduzido
- [ ] **Back/Forward**: Navegar entre estados → Voltar → Estado restaurado

### 2. Filtros

- [ ] **Busca debounce**: Digitar rápido não causa múltiplos requests
- [ ] **Limpar filtros**: Botão "Limpar" reseta todos os filtros
- [ ] **Filtros múltiplos**: Combinar filtros funciona corretamente
- [ ] **Reset de página**: Alterar filtro volta para página 1

### 3. Paginação

- [ ] **Navegação**: Próxima/Anterior funcionam
- [ ] **Ir para página**: Clicar em número específico funciona
- [ ] **Alterar pageSize**: Muda quantidade e volta para página 1

### 4. Ordenação

- [ ] **Alterar campo**: Ordenar por campo diferente funciona
- [ ] **Toggle direção**: asc/desc funciona
- [ ] **Manter ao filtrar**: Ordenação mantida ao aplicar filtros

### 5. Tabs

- [ ] **Trocar tab**: URL atualiza com `?tab=...`
- [ ] **Link direto**: Abrir URL com tab funciona
- [ ] **Manter filtros**: Filtros mantidos ao trocar de tab (se aplicável)

### 6. Contexto de BU

- [ ] **Trocar BU**: Filtros mantidos, dados recarregados
- [ ] **Sem mix de dados**: Nunca mistura dados de BUs diferentes

### 7. Compartilhamento

- [ ] **Copiar link**: URL copiável inclui todos os filtros
- [ ] **Abrir link**: Usuário diferente vê mesmo estado

## Cenários de Erro

- [ ] **Parâmetros inválidos**: Valores inválidos são ignorados (usa default)
- [ ] **Página inexistente**: Página > total redireciona para última
- [ ] **Status inválido**: Status não existente é ignorado

## Performance

- [ ] **Sem re-renders infinitos**: Console limpo de warnings
- [ ] **Debounce funciona**: Network mostra requests espaçados
- [ ] **Cache funciona**: Mesmos parâmetros não refazem request

## Acessibilidade

- [ ] **Escape em busca**: Limpa campo de busca
- [ ] **Enter em busca**: Funciona normalmente
- [ ] **Focus trap**: Modais de filtro fecham com Escape
