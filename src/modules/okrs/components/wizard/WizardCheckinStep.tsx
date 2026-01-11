/**
 * WizardCheckinStep - Passo 2: Check-in sequencial de cada KR
 * 
 * Card de check-in com contexto, inputs e ações
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowRight, 
  ArrowLeft,
  SkipForward,
  Save,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionInput } from '@/components/notifications/MentionInput';
import { WizardKr } from '../../hooks/useTeamPendingKrs';
import { useCreateCheckin, CheckinConfidence } from '../../hooks/useCreateCheckin';
import { formatDaysSince } from '../../hooks/useCycleCheckins';
import { formatValueWithUnit } from '../../constants/krUnits';
import { KrHistoryDialog } from '../KrHistoryDialog';
import { useIdentity } from '@/hooks/useIdentity';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

interface WizardCheckinStepProps {
  kr: WizardKr;
  currentIndex: number;
  totalCount: number;
  onComplete: (result: {
    krId: string;
    krTitle: string;
    previousValue: number;
    newValue: number;
    confidence: CheckinConfidence;
    skipped: boolean;
    blocker?: string;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
}

type ConfidenceOption = {
  value: CheckinConfidence;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  colorClass: string;
  bgClass: string;
};

const confidenceOptions: ConfidenceOption[] = [
  {
    value: 'high',
    label: 'Alta',
    description: 'No caminho',
    icon: CheckCircle2,
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  },
  {
    value: 'medium',
    label: 'Média',
    description: 'Em risco',
    icon: AlertTriangle,
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  },
  {
    value: 'low',
    label: 'Baixa',
    description: 'Atrasado',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  },
];

export function WizardCheckinStep({
  kr,
  currentIndex,
  totalCount,
  onComplete,
  onSkip,
  onBack,
}: WizardCheckinStepProps) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { userId } = useIdentity();
  
  // State
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString());
  const [confidence, setConfidence] = useState<CheckinConfidence>('high');
  const [comment, setComment] = useState('');
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [blockers, setBlockers] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Get user's team for check-in context
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.okrs.userProfileForWizard(userId ?? null, currentBuId),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, team_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!userId,
  });
  
  // Create check-in mutation
  const createCheckin = useCreateCheckin({
    skipToast: true, // We'll show success in the wizard
  });
  
  // Reset form when KR changes
  useEffect(() => {
    setCurrentValue(kr.current_value.toString());
    setConfidence('high');
    setComment('');
    setCommentMentions([]);
    setBlockers('');
  }, [kr.id]);
  
  // Calculate preview
  const previewValue = parseFloat(currentValue) || kr.current_value;
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;
  const range = kr.target - kr.baseline;
  const newProgress = range !== 0
    ? Math.min(100, Math.max(0, ((previewValue - kr.baseline) / range) * 100))
    : 0;
  
  // Handle save
  const handleSave = async () => {
    const value = parseFloat(currentValue);
    if (isNaN(value)) return;
    
    // Build comment with blockers
    const fullComment = blockers.trim()
      ? `${comment.trim()}\n\n🚧 Bloqueador: ${blockers.trim()}`
      : comment.trim();
    
    try {
      await createCheckin.mutateAsync({
        krId: kr.id,
        currentValue: value,
        previousValue: kr.current_value,
        confidence,
        comments: fullComment || undefined,
        teamId: userProfile?.team_id,
      });
      
      onComplete({
        krId: kr.id,
        krTitle: kr.title,
        previousValue: kr.current_value,
        newValue: value,
        confidence,
        skipped: false,
        blocker: blockers.trim() || undefined,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentValue, confidence, comment, blockers]);
  
  const ownerInitials = kr.owner_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Progress indicator */}
        <div className="px-6 py-3 bg-muted/30 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              KR {currentIndex + 1} de {totalCount}
            </span>
            <Badge variant="outline">
              {Math.round((currentIndex / totalCount) * 100)}%
            </Badge>
          </div>
          <Progress 
            value={((currentIndex + 1) / totalCount) * 100} 
            className="h-1 mt-2" 
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Context Block (read-only) */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            {/* Objective */}
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="text-sm font-medium line-clamp-1">{kr.objective_title}</p>
              </div>
            </div>
            
            {/* KR Title */}
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Key Result</p>
                <p className="text-sm font-medium">{kr.title}</p>
              </div>
            </div>
            
            {/* Progress */}
            <div className="p-3 bg-background rounded-md">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">
                  Base: {formatValueWithUnit(kr.baseline, kr.unit)}
                </span>
                <span className="font-medium">
                  Meta: {formatValueWithUnit(kr.target, kr.unit)}
                </span>
              </div>
              <Progress value={kr.progress} className="h-2" />
              <div className="flex items-center justify-between mt-2 text-xs">
                <span>Atual: {formatValueWithUnit(kr.current_value, kr.unit)}</span>
                <span className="text-muted-foreground">{Math.round(kr.progress)}%</span>
              </div>
            </div>
            
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              {kr.owner_name && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={kr.owner_photo || undefined} />
                    <AvatarFallback className="text-[8px]">{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <span>{kr.owner_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Último check-in: {kr.last_checkin_at ? formatDaysSince(kr.days_since_checkin) : 'Nunca'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-3 w-3 mr-1" />
                Ver histórico
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Input Block */}
          <div className="space-y-4">
            {/* Value Input */}
            <div className="space-y-2">
              <Label htmlFor="currentValue" className="flex items-center gap-2">
                {kr.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                Valor atual *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="currentValue"
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground font-medium w-16">
                  {kr.unit}
                </span>
              </div>
              {valueDiff !== 0 && (
                <p className={cn(
                  "text-xs font-medium",
                  isPositiveChange ? "text-green-600" : "text-red-600"
                )}>
                  {isPositiveChange ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit}
                  {' '}→ {Math.round(newProgress)}% do objetivo
                </p>
              )}
            </div>
            
            {/* Confidence */}
            <div className="space-y-2">
              <Label>Confiança *</Label>
              <div className="grid grid-cols-3 gap-2">
                {confidenceOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = confidence === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConfidence(option.value)}
                      className={cn(
                        "p-3 rounded-lg border transition-all text-left",
                        isSelected ? option.bgClass : "hover:bg-accent",
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mb-1", option.colorClass)} />
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comentário</Label>
              <MentionInput
                id="comment"
                value={comment}
                onChange={(value, mentions) => {
                  setComment(value);
                  setCommentMentions(mentions);
                }}
                placeholder="O que avançou? Alguma observação? Use @ para mencionar..."
                rows={3}
              />
            </div>
            
            {/* Blockers */}
            <div className="space-y-2">
              <Label htmlFor="blockers">Bloqueadores</Label>
              <MentionInput
                id="blockers"
                value={blockers}
                onChange={(value) => setBlockers(value)}
                placeholder="Há algo impedindo o progresso?"
                rows={2}
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onSkip}
                size="sm"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={createCheckin.isPending || !currentValue}
                size="sm"
              >
                {createCheckin.isPending ? (
                  'Salvando...'
                ) : currentIndex < totalCount - 1 ? (
                  <>
                    Salvar e próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar e concluir
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Dica: <kbd className="px-1 rounded bg-muted">Ctrl</kbd> + <kbd className="px-1 rounded bg-muted">Enter</kbd> para salvar
          </p>
        </div>
      </div>
      
      {/* History Dialog */}
      <KrHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        kr={{
          id: kr.id,
          title: kr.title,
          baseline: kr.baseline,
          current_value: kr.current_value,
          target: kr.target,
          unit: kr.unit,
          direction: kr.direction,
          status: kr.status,
          type: 'contribution',
          owner_name: kr.owner_name,
          owner_photo: kr.owner_photo,
          team_name: kr.team_name,
          objective_title: kr.objective_title,
        }}
      />
    </>
  );
}
