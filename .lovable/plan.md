
# Plano: Componente Global de Avisos + Alerta de Recomendações

## Contexto

O sistema já possui estilos de alerta definidos em `src/lib/colors.ts` (`ALERT_BANNER_STYLES`) e um `AlertBanner` no módulo OKRs. Porém, esse componente está aninhado em wizards específicos. Para reutilização global, criaremos um componente simples e canônico em `src/components/ui/`.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/ui/info-notice.tsx` | CRIAR | Componente global de avisos informativos |
| `src/modules/assets/pages/RecommendationsPage.tsx` | MODIFICAR | Adicionar aviso no topo da lista |

---

## Implementação

### 1. Novo Componente Global: `InfoNotice`

**Arquivo:** `src/components/ui/info-notice.tsx`

Um componente leve e reutilizável para exibir avisos contextuais em qualquer página.

```tsx
/**
 * InfoNotice - Componente global para avisos informativos
 * 
 * Uso: frases de atenção em páginas, wizards, formulários.
 * Segue o padrão de cores do Hub (ALERT_BANNER_STYLES).
 */

import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALERT_BANNER_STYLES } from '@/lib/colors';

export type InfoNoticeVariant = 'warning' | 'info' | 'success' | 'error';

export interface InfoNoticeProps {
  children: React.ReactNode;
  variant?: InfoNoticeVariant;
  className?: string;
}

const VARIANT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    styles: ALERT_BANNER_STYLES.warning,
  },
  info: {
    icon: Info,
    styles: ALERT_BANNER_STYLES.info,
  },
  success: {
    icon: CheckCircle,
    styles: ALERT_BANNER_STYLES.success,
  },
  error: {
    icon: AlertCircle,
    styles: ALERT_BANNER_STYLES.no_update,
  },
};

export function InfoNotice({ 
  children, 
  variant = 'info',
  className 
}: InfoNoticeProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div 
      role="alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm",
        config.styles.bg,
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", config.styles.icon)} />
      <span>{children}</span>
    </div>
  );
}
```

**Características:**
- Variantes: `warning` (amarelo), `info` (azul), `success` (verde), `error` (vermelho)
- Usa estilos canônicos de `ALERT_BANNER_STYLES`
- Ícones semanticamente corretos (AlertTriangle para warning)
- Acessível com `role="alert"`

---

### 2. Adicionar Aviso na Página de Recomendações

**Arquivo:** `src/modules/assets/pages/RecommendationsPage.tsx`

Inserir o `InfoNotice` entre o header e os filtros:

```tsx
import { InfoNotice } from "@/components/ui/info-notice";

// No JSX, após PageHeader e antes de RecommendationFilters:
<InfoNotice variant="warning">
  Toda compra de múltiplas unidades requer revisão da recomendação, 
  mesmo quando ela estiver dentro do prazo de atualização.
</InfoNotice>
```

**Posição no layout:**
```
PageHeader
InfoNotice (warning)    <-- NOVO
RecommendationFilters
RecommendationsTable
```

---

## Resultado Visual

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Toda compra de múltiplas unidades requer revisão da     │
│    recomendação, mesmo quando ela estiver dentro do prazo  │
│    de atualização.                                          │
└─────────────────────────────────────────────────────────────┘
```

- Fundo amarelo claro (bg-status-yellow-muted)
- Borda amarela sutil
- Ícone de atenção (AlertTriangle) amarelo
- Dark mode suportado automaticamente

---

## Benefícios

1. **Reutilizável:** Pode ser usado em qualquer página do sistema
2. **Consistente:** Usa tokens de cor canônicos do Hub
3. **Semântico:** Variantes claras (warning, info, success, error)
4. **Acessível:** `role="alert"` para screen readers
5. **Leve:** Componente funcional simples, sem estado

---

## Usos Futuros

O componente `InfoNotice` pode ser usado em:
- Páginas de listagem (avisos de contexto)
- Formulários (orientações importantes)
- Wizards (notas de passos)
- Dashboards (alertas informativos)
