import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Check } from 'lucide-react';
import { copyCurrentUrl } from '@/hooks/useUrlState';
import { toast } from 'sonner';

interface CopyLinkButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function CopyLinkButton({
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Copiar link',
  showLabel = true,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyCurrentUrl();
    if (success) {
      setCopied(true);
      toast.success('Link copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">{copied ? 'Copiado!' : label}</span>}
    </Button>
  );
}
