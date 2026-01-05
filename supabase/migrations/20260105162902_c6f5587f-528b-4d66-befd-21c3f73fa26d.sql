-- Registrar módulo Tickets no catálogo de módulos
INSERT INTO public.modules (name, slug, description, icon, route, type, status, health_status, display_order)
VALUES (
  'Tickets',
  'tickets',
  'Gerenciamento de demandas internas e externas em formato de threads',
  'FileText',
  '/tickets',
  'operational',
  'active',
  'healthy',
  50
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  status = 'active',
  updated_at = now();