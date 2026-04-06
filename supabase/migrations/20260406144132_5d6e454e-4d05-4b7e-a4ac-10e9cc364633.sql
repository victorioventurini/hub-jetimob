
ALTER TABLE okr_team_objectives DISABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE okr_team_key_results DISABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;

DO $$
DECLARE
  v_obj1_id uuid;
  v_obj2_id uuid;
  v_obj3_id uuid;
BEGIN
  INSERT INTO okr_team_objectives (bu_id, team_id, title, description, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', 'Consolidar posição como referência comercial no mercado imobiliário', '', NULL, '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id INTO v_obj1_id;

  INSERT INTO okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', v_obj1_id, 'Atingir o MRR de R$ 126k até o final do Q2', 0, 0, 126, 'R$ mil', 'up', 'not_started', 'foundational', '814b62e2-62a7-44fc-9515-e3edbb45c744');

  INSERT INTO okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', v_obj1_id, 'Atingir o ticket médio de R$ 450,00 até o final do Q2', 420, 420, 450, 'R$', 'up', 'not_started', 'foundational', '814b62e2-62a7-44fc-9515-e3edbb45c744');

  INSERT INTO okr_team_objectives (bu_id, team_id, title, description, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', 'Engajar o time comercial de forma padronizada e escalável', '', NULL, '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id INTO v_obj2_id;

  INSERT INTO okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', v_obj2_id, 'Atingir 60% de engajamento do time comercial medido via e-NPS interno até o final do Q2, a partir da implementação de rituais padronizados', 44, 44, 60, '%', 'up', 'not_started', 'foundational', '814b62e2-62a7-44fc-9515-e3edbb45c744');

  INSERT INTO okr_team_objectives (bu_id, team_id, title, description, org_objective_id, cycle_id, year, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', 'Lapidar o conhecimento e a aplicação de novas metodologias', '', NULL, '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 2026, 'draft')
  RETURNING id INTO v_obj3_id;

  INSERT INTO okr_team_key_results (bu_id, team_id, team_objective_id, title, baseline, current_value, target, unit, direction, status, type, owner_user_id)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f', v_obj3_id, 'Alcançar 30% das oportunidades com o campo Situação (SPICED) preenchido', 0, 0, 30, '%', 'up', 'not_started', 'foundational', '814b62e2-62a7-44fc-9515-e3edbb45c744');
END $$;

ALTER TABLE okr_team_objectives ENABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE okr_team_key_results ENABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;
