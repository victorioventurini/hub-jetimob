
-- Re-enable triggers from failed previous migration
ALTER TABLE public.okr_team_objectives ENABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE public.okr_team_key_results ENABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;

-- Now disable again for this backfill
ALTER TABLE public.okr_team_objectives DISABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE public.okr_team_key_results DISABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;

-- Gente & Cultura - Objective 1
WITH obj1 AS (
  INSERT INTO public.okr_team_objectives (bu_id, team_id, title, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', 'Elevar a Jetimob a um novo patamar de maturidade organizacional, tendo Gente & Cultura como pilar do desenvolvimento e experiência das pessoas.', 'e12d9f00-4e58-433c-8a3e-aac07ba69179', '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id
)
INSERT INTO public.okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', (SELECT id FROM obj1), 'Atingir 60 pontos na eNPS do Q2 como nota mínima em 90% das áreas.', 0, 0, 60, 'Pontos', 'maintain'::okr_direction, 'not_started', 'foundational', 'ac76a083-bcea-4f30-9f79-80c6105353fd'),
  ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', (SELECT id FROM obj1), 'Executar 1+ iniciativa de desenvolvimento de competências-base avaliadas com crítica, em cada área', 0, 0, 1, 'Projetos', 'maintain'::okr_direction, 'not_started', 'foundational', 'ac76a083-bcea-4f30-9f79-80c6105353fd'),
  ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', (SELECT id FROM obj1), 'Atuar no Q2 com 2+ iniciativas de Employer Branding', 0, 0, 2, 'Projetos', 'maintain'::okr_direction, 'not_started', 'foundational', '7eed3b6a-b104-4d0b-b0b6-a4b135e115ce');

-- Gente & Cultura - Objective 2
WITH obj2 AS (
  INSERT INTO public.okr_team_objectives (bu_id, team_id, title, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', 'Aproximar Gente & Cultura das áreas para fortalecer a gestão de pessoas e o clima no dia a dia.', 'e12d9f00-4e58-433c-8a3e-aac07ba69179', '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id
)
INSERT INTO public.okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', (SELECT id FROM obj2), '≥ 75% das lideranças avaliando positivamente (≥ 4,0) a atuação de Gente e Cultura como parceiro estratégico.', 0, 0, 75, '%', 'maintain'::okr_direction, 'not_started', 'foundational', 'ac76a083-bcea-4f30-9f79-80c6105353fd'),
  ('a0000000-0000-0000-0000-000000000001', 'd69c7489-c499-469c-b7c3-baf6d737fc06', (SELECT id FROM obj2), '≥ 75% das areas validas com alertas de clima no Q1 possuem ao menos uma iniciativa em execucao voltada a melhoria dos temas priorizados ao final do quarter.', 0, 0, 75, '%', 'maintain'::okr_direction, 'not_started', 'foundational', 'ac76a083-bcea-4f30-9f79-80c6105353fd');

-- Marketing - Objective 1
WITH obj3 AS (
  INSERT INTO public.okr_team_objectives (bu_id, team_id, title, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', 'Aumentar a geracao de oportunidades a fim de aumentar a receita da Jetimob', 'c90fa019-9a03-4e50-a343-e8da667992fc', '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id
)
INSERT INTO public.okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj3), 'Captar 1.821 leads qualificados para Jetimob respeitando o teto orcamentario', 0, 0, 1821, 'Leads', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e'),
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj3), 'Gerar 50 SQLs de material rico', 0, 0, 50, 'Leads', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e'),
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj3), 'Captar 67 leads qualificados oriundos de canais sociais', 0, 0, 67, 'Leads', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e');

-- Marketing - Objective 2
WITH obj4 AS (
  INSERT INTO public.okr_team_objectives (bu_id, team_id, title, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', 'Aumentar a autoridade da Jetimob', 'c90fa019-9a03-4e50-a343-e8da667992fc', '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id
)
INSERT INTO public.okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj4), 'Atingir 60.000 de engajamento nas redes sociais da Jetimob', 0, 0, 60000, 'Numero', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e'),
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj4), 'Captar 1.800 inscritos com eventos', 0, 0, 1800, 'Inscritos', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e'),
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj4), 'Manter as sessoes do blog em 60.000', 0, 0, 60000, 'Sessoes', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e');

-- Marketing - Objective 3
WITH obj5 AS (
  INSERT INTO public.okr_team_objectives (bu_id, team_id, title, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', 'Fortalecer o relacionamento com publico e clientes', 'c90fa019-9a03-4e50-a343-e8da667992fc', '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id
)
INSERT INTO public.okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj5), 'Atingir 6.000 membros na comunidade do WhatsApp', 0, 0, 6000, 'Numero', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e'),
  ('a0000000-0000-0000-0000-000000000001', 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe', (SELECT id FROM obj5), 'Aumentar taxa media de abertura JetNews de nao clientes e clientes para 23%', 0, 0, 23, '%', 'up'::okr_direction, 'not_started', 'foundational', '110f72b1-ea51-4d31-8235-43aff585022e');

-- Re-enable BU scope enforcement
ALTER TABLE public.okr_team_objectives ENABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE public.okr_team_key_results ENABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;
