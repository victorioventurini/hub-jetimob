import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw } from 'lucide-react';
import { OkrStatusBadge } from './OkrStatusBadge';
import { useCanEditKr } from '../hooks/useCanEditKr';
import type { OkrRagStatus, OkrDirection, OkrKrType } from '../types';

interface KrData {
  id: string;
  team_id: string;
  team_objective_id?: string | null;
  title: string;
  type?: OkrKrType;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection | 'up' | 'down';
  unit: string;
  status: OkrRagStatus | 'green' | 'yellow' | 'red' | 'not_started';
  owner_user_id?: string | null;
  co_responsibles?: string[] | null;
}

interface KrActionButtonsProps {
  kr: KrData;
  onEdit: () => void;
  onCheckin: () => void;
}

/**
 * Componente que renderiza os botões de ação de um KR
 * condicionados às permissões do usuário.
 * 
 * Regras de permissão:
 * - Owner pode editar/check-in
 * - Co-responsável pode editar/check-in
 * - Líder do time pode editar/check-in
 */
export function KrActionButtons({ kr, onEdit, onCheckin }: KrActionButtonsProps) {
  const { canEdit, isLoading } = useCanEditKr(kr);

  // Sempre mostra o badge de status
  const statusBadge = (
    <OkrStatusBadge 
      status={kr.status as 'green' | 'yellow' | 'red' | 'not_started'} 
      type="kr" 
    />
  );

  // Durante loading ou sem permissão, mostra apenas o badge
  if (isLoading || !canEdit) {
    return statusBadge;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        title="Editar KR"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          onCheckin();
        }}
        title="Registrar check-in"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
      {statusBadge}
    </>
  );
}
