
# Plano: Correção Definitiva do Menu Não-Clicável Após Troca de Aba

## Contexto e Análise

### Problema Identificado
O menu da sidebar desktop para de responder a cliques após o usuário trocar de aba no navegador e retornar. O problema só é resolvido com refresh da página.

### Causa Raiz
O Radix UI (biblioteca de componentes usada pelos Tooltips, Popovers e DropdownMenus) manipula `pointer-events` no body para prevenir interações enquanto um overlay está aberto. Quando o usuário troca de aba:
1. O browser suspende a execução de JavaScript
2. Timers e callbacks de animação são pausados
3. Se um Tooltip estava em processo de fechar (animação), o `pointer-events: none` fica residual
4. Ao voltar para a aba, o cleanup não é executado corretamente

### Abordagens Atuais (Problemáticas)
1. **App.tsx**: Listener básico de `visibilitychange` - muito simples, não cobre todos os casos
2. **HubLayout.tsx**: Função agressiva com 6 timers - causa race conditions e pode interferir com overlays legítimos
3. **Remoção forçada de tooltips órfãos** - remove elementos que o Radix ainda pode estar gerenciando

## Solução Proposta

### Abordagem Unificada e Segura

Em vez de múltiplas funções de cleanup espalhadas, criar um **sistema centralizado de recuperação** que:
1. Detecta quando a aba volta ao foco
2. Aguarda um tempo mínimo para garantir que animações completaram
3. Verifica se há bloqueio real (não apenas estilos inline)
4. Limpa apenas se necessário e de forma segura

### Mudanças Técnicas

#### 1. Criar Hook Centralizado `useRadixFocusRecovery`
**Novo arquivo:** `src/hooks/useRadixFocusRecovery.ts`

Responsabilidades:
- Ouvir `visibilitychange` no document
- Quando a aba ficar visível:
  - Aguardar 100ms (tempo para animações do Radix completarem)
  - Verificar computed style do body
  - Se `pointer-events` estiver "none", forçar para "auto"
  - Limpar atributos `data-scroll-locked`, `aria-hidden` e `inert` do body
- Não remover elementos DOM (evitar race conditions)
- Não interferir com overlays abertos legitimamente

#### 2. Simplificar HubLayout.tsx
- Remover a função `forceCleanupPointerEvents()` agressiva
- Remover os múltiplos timers (0, 50, 150, 300, 500, 1000ms)
- Remover o listener global de `mousemove`/`click`
- Usar apenas o hook centralizado

#### 3. Simplificar SettingsLayout.tsx
- Remover a função de cleanup duplicada
- Usar o hook centralizado

#### 4. Manter App.tsx Limpo
- Remover o listener `visibilitychange` existente (será centralizado no hook)

#### 5. Configurar Tooltips do Sidebar
- Manter `disableHoverableContent` (já está correto)
- Adicionar `delayDuration={0}` para resposta imediata
- Garantir `pointer-events-none` no TooltipContent

### Diagrama de Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │          useRadixFocusRecovery() (uma vez)              │ │
│  │   - visibilitychange listener                           │ │
│  │   - cleanup centralizado e seguro                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    HubLayout                             │ │
│  │   - SEM cleanup agressivo                                │ │
│  │   - SEM listeners de mousemove/click                     │ │
│  │   - Apenas fecha menu mobile ao navegar                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  DynamicSidebar                          │ │
│  │   - Tooltips com configuração otimizada                  │ │
│  │   - disableHoverableContent=true                         │ │
│  │   - delayDuration=0                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useRadixFocusRecovery.ts` | **CRIAR** - Hook centralizado |
| `src/App.tsx` | Simplificar, usar hook |
| `src/components/layout/HubLayout.tsx` | Remover cleanup agressivo |
| `src/components/settings/SettingsLayout.tsx` | Remover cleanup duplicado |
| `docs/canonical/UI_COMPONENTS_REGISTRY.md` | Documentar padrão de recovery |

## Lógica do Hook `useRadixFocusRecovery`

```typescript
// Pseudocódigo da lógica
function useRadixFocusRecovery() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      
      // Aguardar animações Radix completarem
      setTimeout(() => {
        // Verificar se há bloqueio real
        const computed = getComputedStyle(document.body);
        if (computed.pointerEvents === 'none') {
          // Forçar recuperação apenas se não houver overlay aberto
          const hasOpenOverlay = document.querySelector(
            '[data-state="open"][data-radix-dialog-content], ' +
            '[data-state="open"][data-radix-popover-content]'
          );
          
          if (!hasOpenOverlay) {
            document.body.style.pointerEvents = 'auto';
            document.body.removeAttribute('data-scroll-locked');
            document.body.removeAttribute('aria-hidden');
            document.body.removeAttribute('inert');
          }
        }
      }, 100);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
```

## Por que Esta Solução é Melhor

1. **Centralizada**: Um único ponto de controle, fácil de debugar e manter
2. **Não-agressiva**: Só age quando há problema real detectado
3. **Respeita overlays legítimos**: Verifica se há dialogs/popovers abertos antes de limpar
4. **Sem race conditions**: Não remove elementos DOM, apenas limpa estilos
5. **Performance**: Sem listeners de mousemove que rodam constantemente

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Overlay legítimo ser afetado | Verificação de `[data-state="open"]` antes de limpar |
| Cleanup não executar | Timeout de 100ms garante execução após animações |
| Múltiplas instâncias do hook | Hook será chamado apenas uma vez no App.tsx |

## Validação Pós-Implementação

1. Abrir app no desktop
2. Navegar para qualquer página com sidebar
3. Trocar de aba do navegador
4. Aguardar alguns segundos
5. Voltar para a aba do Hub
6. Verificar se cliques na sidebar funcionam imediatamente
7. Verificar se popover de notificações ainda funciona
8. Verificar se dropdown do usuário ainda funciona
9. Verificar se tooltips da sidebar ainda aparecem

## Atualização de Documentação

Adicionar ao UI_COMPONENTS_REGISTRY.md uma seção sobre o padrão de focus recovery para componentes Radix, documentando o hook `useRadixFocusRecovery` como solução canônica.
