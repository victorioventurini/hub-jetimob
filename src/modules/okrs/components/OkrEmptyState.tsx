import { Target } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface OkrEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function OkrEmptyState({ title, description, actionLabel, onAction }: OkrEmptyStateProps) {
  return (
    <EmptyState
      icon={Target}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      iconClassName="text-primary"
    />
  );
}
