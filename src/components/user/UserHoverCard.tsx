import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';

interface UserHoverCardProps {
  /** Auth user_id - use this when you have the auth user id */
  userId?: string;
  /** Profile id - use this when you have the profile.id */
  profileId?: string;
  children: ReactNode;
  asChild?: boolean;
}

interface UserProfileData {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string | null;
  job_title: string | null;
  teams: string[];
}

export function UserHoverCard({ userId, profileId, children, asChild = true }: UserHoverCardProps) {
  const supabase = useBuScopedSupabase();
  
  // Determine which ID to use for the query
  const lookupId = userId || profileId;
  const lookupType = userId ? 'user_id' : 'profile_id';

  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.profiles.hoverCard(lookupId || ''),
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!lookupId) return null;

      // Fetch profile with job title - use appropriate filter
      const query = supabase
        .from('profiles')
        .select('id, user_id, display_name, photo_url, job_title_id');
      
      const { data: profileData, error: profileError } = await (
        lookupType === 'user_id' 
          ? query.eq('user_id', lookupId) 
          : query.eq('id', lookupId)
      ).maybeSingle();

      if (profileError || !profileData) return null;

      // Fetch job title separately
      let jobTitle: string | null = null;
      if (profileData.job_title_id) {
        const { data: jobTitleData } = await supabase
          .from('job_titles')
          .select('name')
          .eq('id', profileData.job_title_id)
          .maybeSingle();
        jobTitle = jobTitleData?.name || null;
      }

      // Fetch team memberships using user_id (always use user_id for memberships)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const membershipsResult = await (supabase as any)
        .from('user_team_memberships')
        .select('team_id')
        .eq('user_id', profileData.user_id)
        .eq('is_active', true);
      
      const teamMemberships = membershipsResult.data as Array<{ team_id: string }> | null;

      // Fetch team names
      const teamIds = (teamMemberships || []).map(tm => tm.team_id);
      let teams: string[] = [];
      if (teamIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teamsResult = await (supabase as any)
          .from('teams')
          .select('name')
          .in('id', teamIds);
        
        const teamsData = teamsResult.data as Array<{ name: string }> | null;
        teams = (teamsData || []).map(t => t.name);
      }

      return {
        id: profileData.id,
        user_id: profileData.user_id,
        display_name: profileData.display_name,
        photo_url: profileData.photo_url,
        job_title: jobTitle,
        teams,
      };
    },
    enabled: !!lookupId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <HoverCard openDelay={800} closeDelay={100}>
      <HoverCardTrigger asChild={asChild}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-0" side="top" align="start">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ) : profile ? (
          <Link 
            to={`/users/${profile.id}`} 
            className="block p-4 hover:bg-accent/50 transition-colors rounded-md"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(profile.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-sm truncate">
                  {profile.display_name}
                </p>
                {profile.job_title && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{profile.job_title}</span>
                  </p>
                )}
                {profile.teams.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {profile.teams.slice(0, 2).join(', ')}
                      {profile.teams.length > 2 && ` +${profile.teams.length - 2}`}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Usuário não encontrado
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
