import { useEffect } from 'react';

/**
 * Hook centralizado para recuperação de pointer-events após troca de aba.
 * 
 * Resolve o problema de menus não-clicáveis quando o usuário troca de aba
 * enquanto um overlay Radix (Tooltip, Popover, Dialog) está em transição.
 * 
 * @see docs/canonical/UI_COMPONENTS_REGISTRY.md - Seção "Focus Recovery"
 * 
 * Comportamento:
 * 1. Detecta quando a aba volta ao foco (visibilitychange)
 * 2. Aguarda 100ms para animações do Radix completarem
 * 3. Verifica se há bloqueio real (pointer-events: none no body)
 * 4. Só limpa se NÃO houver overlay legítimo aberto
 * 5. Não remove elementos DOM (evita race conditions com Radix)
 * 
 * Uso:
 * - Chamar UMA VEZ no App.tsx (nível raiz)
 * - Não chamar em layouts individuais
 */
export function useRadixFocusRecovery(): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Só processar quando a aba ficar visível
      if (document.visibilityState !== 'visible') return;

      // Aguardar animações Radix completarem (debounce de 100ms)
      setTimeout(() => {
        performRecoveryIfNeeded();
      }, 100);
    };

    // Também recuperar no focus da janela (para casos de alt+tab)
    const handleWindowFocus = () => {
      setTimeout(() => {
        performRecoveryIfNeeded();
      }, 100);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);
}

/**
 * Verifica se há bloqueio real e executa cleanup se necessário.
 * Não age se houver overlay legítimo aberto.
 */
function performRecoveryIfNeeded(): void {
  // Verificar se há bloqueio real no body
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);
  
  const bodyBlocked = bodyStyle.pointerEvents === 'none';
  const htmlBlocked = htmlStyle.pointerEvents === 'none';
  
  if (!bodyBlocked && !htmlBlocked) {
    // Sem bloqueio, nada a fazer
    return;
  }

  // Verificar se há overlay legítimo aberto (não queremos interferir)
  const hasOpenOverlay = document.querySelector(
    // Dialogs e Sheets abertos
    '[data-state="open"][data-radix-dialog-content], ' +
    '[data-state="open"][role="dialog"], ' +
    // Popovers e DropdownMenus abertos
    '[data-state="open"][data-radix-popover-content], ' +
    '[data-state="open"][data-radix-dropdown-menu-content], ' +
    // AlertDialogs abertos
    '[data-state="open"][data-radix-alert-dialog-content]'
  );

  if (hasOpenOverlay) {
    // Há overlay legítimo aberto, não interferir
    return;
  }

  // Executar cleanup seguro
  cleanupRadixLocks();
}

/**
 * Limpa locks residuais do Radix de forma segura.
 * Não remove elementos DOM, apenas limpa estilos e atributos.
 */
function cleanupRadixLocks(): void {
  // Limpar pointer-events do body e html
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
  
  // Limpar scroll lock residual (usado por Dialog/Sheet)
  if (document.body.hasAttribute('data-scroll-locked')) {
    document.body.removeAttribute('data-scroll-locked');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.marginRight = '';
  }
  
  // Limpar aria-hidden residual (usado por Dialog para acessibilidade)
  if (document.body.hasAttribute('aria-hidden')) {
    document.body.removeAttribute('aria-hidden');
  }
  
  // Limpar inert residual (usado por alguns componentes Radix)
  if (document.body.hasAttribute('inert')) {
    document.body.removeAttribute('inert');
  }
  
  // Limpar pointer-events em wrappers de popper (sem remover elementos)
  document.querySelectorAll('[data-radix-popper-content-wrapper]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.pointerEvents = '';
    }
  });
  
  // Limpar overlays com state closed que podem ter pointer-events travado
  document.querySelectorAll('[data-state="closed"]').forEach((el) => {
    if (el instanceof HTMLElement && el.style.pointerEvents === 'none') {
      el.style.pointerEvents = '';
    }
  });
}
