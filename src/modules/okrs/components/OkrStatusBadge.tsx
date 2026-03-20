import React from 'react';
import { StatusBadge, StatusDot } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OkrRagStatus, OkrStatus } from '../types';

interface OkrStatusBadgeProps {
  status: OkrStatus | OkrRagStatus;
  type?: 'objective' | 'kr';
  className?: string;
}

// Map OKR RAG status to shared StatusBadge status
const ragToStatusMap: Record<OkrRagStatus, string> = {
  green: 'on_track',
  yellow: 'at_risk',
  red: 'off_track',
  not_started: 'not_started',
};

// Map OKR Objective status to shared StatusBadge status
const objectiveToStatusMap: Record<OkrStatus, string> = {
  draft: 'draft',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
  discarded: 'inactive',
};

export function OkrStatusBadge({ status, type = 'objective', className }: OkrStatusBadgeProps) {
  if (type === 'objective') {
    const objectiveStatus = status as OkrStatus;
    const mappedStatus = objectiveToStatusMap[objectiveStatus] || 'inactive';
    
    return (
      <StatusBadge 
        status={mappedStatus} 
        showDot={false}
        className={className} 
      />
    );
  }

  // KR RAG status
  const ragStatus = status as OkrRagStatus;
  const mappedStatus = ragToStatusMap[ragStatus] || 'not_started';
  
  return (
    <StatusBadge 
      status={mappedStatus}
      showDot={true}
      className={className}
    />
  );
}
