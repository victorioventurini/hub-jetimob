import {
  Bot,
  Mail,
  MapPin,
  MessageSquare,
  Zap,
  Phone,
  Plug,
  Database,
  Cloud,
  Clock,
  LucideIcon,
} from 'lucide-react';

const iconComponents: Record<string, LucideIcon> = {
  bot: Bot,
  mail: Mail,
  'map-pin': MapPin,
  'message-square': MessageSquare,
  zap: Zap,
  phone: Phone,
  plug: Plug,
  database: Database,
  cloud: Cloud,
  clock: Clock,
};

interface IntegrationIconProps {
  icon: string;
  color?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IntegrationIcon({ 
  icon, 
  color = '#6B7280', 
  className = '',
  size = 'md',
}: IntegrationIconProps) {
  const Icon = iconComponents[icon] || Plug;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };
  
  return (
    <div 
      className={`rounded-lg ${containerSizes[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      <Icon className={`${sizeClasses[size]} text-white`} />
    </div>
  );
}
