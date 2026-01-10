-- =============================================
-- Template de convite para Partner Contact
-- =============================================

-- Inserir template global para partner.invite (email)
INSERT INTO public.notification_templates (event_slug, channel, subject_template, body_template)
VALUES (
  'partner.invite',
  'email',
  'Você foi convidado para acessar o Hub {{bu_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Hub {{bu_name}}</h1>
    </div>
    
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Olá, <strong>{{contact_name}}</strong>!
    </p>
    
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Você foi convidado(a) por <strong>{{invited_by}}</strong> para acessar o Hub como parceiro externo da empresa <strong>{{company_name}}</strong>.
    </p>
    
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
      Através do Hub você poderá acompanhar e interagir com tickets de suporte, facilitando a comunicação entre nossas equipes.
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="{{access_url}}" style="display: inline-block; background-color: #379eff; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Acessar o Hub
      </a>
    </div>
    
    <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
      Use o e-mail <strong>{{contact_email}}</strong> para fazer login. Na tela de autenticação, solicite um link de acesso que será enviado para seu e-mail.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
    
    <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
      Este convite foi enviado automaticamente pelo Hub.
    </p>
  </div>
</body>
</html>'
)
ON CONFLICT DO NOTHING;

-- Inserir variáveis disponíveis para o template partner.invite
INSERT INTO public.notification_template_variables (event_slug, variable_key, variable_label, variable_type, is_required, description, example_value)
VALUES 
  ('partner.invite', 'contact_name', 'Nome do Contato', 'string', true, 'Nome do parceiro convidado', 'João Silva'),
  ('partner.invite', 'contact_email', 'Email do Contato', 'string', true, 'Email de login do parceiro', 'joao@empresa.com'),
  ('partner.invite', 'company_name', 'Nome da Empresa', 'string', true, 'Nome da empresa parceira', 'Construtora XYZ'),
  ('partner.invite', 'bu_name', 'Nome da Unidade', 'string', true, 'Nome da Business Unit', 'Jetimob'),
  ('partner.invite', 'invited_by', 'Convidado Por', 'string', true, 'Nome de quem enviou o convite', 'Maria Costa'),
  ('partner.invite', 'access_url', 'URL de Acesso', 'string', true, 'Link para acessar o Hub', 'https://hub.jetimob.com/auth')
ON CONFLICT DO NOTHING;