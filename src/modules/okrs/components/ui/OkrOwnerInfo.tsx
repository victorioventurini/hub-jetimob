import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Owner {
  display_name: string;
  photo_url?: string | null;
  role?: string;
}

interface OkrOwnerInfoProps {
  owner: Owner | null | undefined;
  showRole?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export function OkrOwnerInfo({ 
  owner, 
  showRole = false, 
  size = 'sm',
  className,
  showTooltip = true,
}: OkrOwnerInfoProps) {
  if (!owner) return null;

  const sizeConfig = {
    sm: { avatar: 'w-5 h-5', text: 'text-xs', fallback: 'text-[9px]' },
    md: { avatar: 'w-6 h-6', text: 'text-sm', fallback: 'text-[10px]' },
    lg: { avatar: 'w-8 h-8', text: 'text-sm', fallback: 'text-xs' },
  };

  const config = sizeConfig[size];
  const initials = owner.display_name?.slice(0, 2).toUpperCase() || 'U';

  const content = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Avatar className={config.avatar}>
        <AvatarImage src={owner.photo_url || undefined} alt={owner.display_name} />
        <AvatarFallback className={config.fallback}>{initials}</AvatarFallback>
      </Avatar>
      {(size !== 'sm' || showRole) && (
        <div className="flex flex-col">
          <span className={cn('font-medium truncate max-w-[120px]', config.text)}>
            {owner.display_name}
          </span>
          {showRole && owner.role && (
            <span className="text-[10px] text-muted-foreground">{owner.role}</span>
          )}
        </div>
      )}
    </div>
  );

  if (!showTooltip || size !== 'sm') return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm font-medium">{owner.display_name}</p>
        {owner.role && <p className="text-xs text-muted-foreground">{owner.role}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

interface OkrOwnersRowProps {
  owners: Array<Owner | null | undefined>;
  max?: number;
  className?: string;
}

/**
 * Shows multiple owners in a row with avatars
 */
export function OkrOwnersRow({ owners, max = 3, className }: OkrOwnersRowProps) {
  const validOwners = owners.filter((o): o is Owner => !!o);
  if (validOwners.length === 0) return null;

  const displayOwners = validOwners.slice(0, max);
  const remaining = validOwners.length - max;

  return (
    <div className={cn('flex items-center -space-x-1', className)}>
      {displayOwners.map((owner, idx) => (
        <Tooltip key={idx}>
          <TooltipTrigger asChild>
            <Avatar className="w-6 h-6 border-2 border-background">
              <AvatarImage src={owner.photo_url || undefined} alt={owner.display_name} />
              <AvatarFallback className="text-[10px]">
                {owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-sm">{owner.display_name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border-2 border-background text-[10px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}
