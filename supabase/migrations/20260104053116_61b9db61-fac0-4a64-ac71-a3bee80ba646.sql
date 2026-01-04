-- Create enum for squad products
CREATE TYPE public.squad_product AS ENUM ('crm', 'cms', 'erp');

-- Create enum for squad roles
CREATE TYPE public.squad_role AS ENUM ('product_owner', 'tech_lead', 'ux_ui_lead', 'member');

-- Create squads table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  products squad_product[] NOT NULL DEFAULT '{}',
  status team_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create squad_teams junction table (squads linked to teams)
CREATE TABLE public.squad_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, team_id)
);

-- Create squad_memberships table (users in squads with roles)
CREATE TABLE public.squad_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role squad_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for squads
CREATE POLICY "Users can view active squads" ON public.squads
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage squads" ON public.squads
  FOR ALL USING (is_admin_or_ceo(auth.uid()));

-- RLS Policies for squad_teams
CREATE POLICY "Users can view squad teams" ON public.squad_teams
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage squad teams" ON public.squad_teams
  FOR ALL USING (is_admin_or_ceo(auth.uid()));

-- RLS Policies for squad_memberships
CREATE POLICY "Users can view squad memberships" ON public.squad_memberships
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage squad memberships" ON public.squad_memberships
  FOR ALL USING (is_admin_or_ceo(auth.uid()));

-- Add updated_at trigger for squads
CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for squad_memberships
CREATE TRIGGER update_squad_memberships_updated_at
  BEFORE UPDATE ON public.squad_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_squads_bu_id ON public.squads(bu_id);
CREATE INDEX idx_squads_status ON public.squads(status);
CREATE INDEX idx_squad_teams_squad_id ON public.squad_teams(squad_id);
CREATE INDEX idx_squad_teams_team_id ON public.squad_teams(team_id);
CREATE INDEX idx_squad_memberships_squad_id ON public.squad_memberships(squad_id);
CREATE INDEX idx_squad_memberships_user_id ON public.squad_memberships(user_id);