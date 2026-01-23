import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IntegrationTestStatus } from '../types';

interface TestStatusBadgeProps {
  status: IntegrationTestStatus | null;
  message?: string | null;
  testedAt?: string | null;
  showDetails?: boolean;
}

export function TestStatusBadge({ 
  status, 
  message,
  testedAt,
  showDetails = false,
}: TestStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircle className="w-3 h-3 mr-1" />
        Não testado
      </Badge>
    );
  }
  
  const variants = {
    ok: {
      variant: 'default' as const,
      icon: Check,
      label: 'Conexão OK',
      className: 'bg-success hover:bg-success/90',
    },
    error: {
      variant: 'destructive' as const,
      icon: X,
      label: 'Erro',
      className: '',
    },
    pending: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Testando...',
      className: '',
    },
  };
  
  const config = variants[status];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
      {showDetails && testedAt && (
        <span className="text-xs text-muted-foreground">
          Testado em {format(new Date(testedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </span>
      )}
      {showDetails && message && status === 'error' && (
        <span className="text-xs text-destructive">{message}</span>
      )}
    </div>
  );
}
