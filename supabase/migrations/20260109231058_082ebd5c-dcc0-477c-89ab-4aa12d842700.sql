
-- Desabilitar temporariamente o trigger de enforce_bu_scope
ALTER TABLE teams DISABLE TRIGGER trg_enforce_bu_scope_teams;

-- Atualizar as descrições dos times
UPDATE teams SET description = 'Responsável por garantir a execução eficiente do negócio no dia a dia da Jetimob, assegurando que clientes, processos internos e áreas de suporte operem com qualidade, previsibilidade e alinhamento aos objetivos estratégicos da empresa.' WHERE id = '9d0edb78-a8bd-4550-b7ec-b1e01811f932';

UPDATE teams SET description = 'Atua como elo entre estratégia e execução, estruturando processos, métricas, automações e análises para aumentar eficiência operacional, escalar resultados e apoiar decisões baseadas em dados em toda a operação.' WHERE id = '0060f4ab-ba26-4fe5-8fa6-afca04d35ca9';

UPDATE teams SET description = 'Responsável por garantir que os clientes da Jetimob obtenham valor contínuo da plataforma, promovendo adoção, engajamento, retenção e expansão, com foco em relacionamento de longo prazo e sucesso do cliente.' WHERE id = 'b5f9336b-dbda-47c5-b033-2500f4661a71';

UPDATE teams SET description = 'Focado em estratégias de crescimento dentro da base ativa, atuando na redução de churn, aumento de LTV, expansão de contratos e identificação de oportunidades de upsell e cross-sell.' WHERE id = '93706d30-5b8b-49b5-b98d-a6d67999d08f';

UPDATE teams SET description = 'Gerencia a saúde financeira da empresa, incluindo controle de receitas, despesas, faturamento, cobrança, planejamento financeiro, compliance e suporte à tomada de decisão estratégica.' WHERE id = '957c52ff-91ca-44df-bb16-014861023db3';

UPDATE teams SET description = 'Responsável pela gestão de pessoas, cultura organizacional, desenvolvimento de talentos, clima interno, performance, estrutura organizacional e fortalecimento dos valores da Jetimob.' WHERE id = 'd69c7489-c499-469c-b7c3-baf6d737fc06';

UPDATE teams SET description = 'Conduz a jornada inicial dos novos clientes, garantindo uma implementação eficiente da plataforma, redução do time-to-value e uma experiência positiva desde o primeiro contato operacional com a Jetimob.' WHERE id = '589d38b4-6e6a-4cd4-b994-d9e1965642a7';

UPDATE teams SET description = 'Atua no acompanhamento contínuo dos clientes após o onboarding, garantindo estabilidade operacional, suporte proativo, evolução de uso e alinhamento com os objetivos de negócio do cliente.' WHERE id = 'b59b5f26-55b1-402c-8e54-736c6a8082ce';

UPDATE teams SET description = 'Responsável pelo atendimento técnico e funcional aos clientes, solucionando dúvidas, incidentes e problemas com agilidade, qualidade e foco na experiência do usuário.' WHERE id = '2a15dbe0-e6bd-4c34-8d1c-734f065f7fcd';

UPDATE teams SET description = 'Área responsável por definir, construir e evoluir a plataforma Jetimob, alinhando tecnologia, experiência do usuário e necessidades do mercado imobiliário para entregar soluções escaláveis e de alto impacto.' WHERE id = 'd7d7a88f-fa09-46b3-8d9a-be6925c52769';

UPDATE teams SET description = 'Define visão, estratégia e roadmap dos produtos da Jetimob, priorizando demandas, validando hipóteses, alinhando stakeholders e garantindo que as soluções entreguem valor real ao mercado.' WHERE id = '1fa654dd-c0bb-468c-aaf4-955eda4a1f1f';

UPDATE teams SET description = 'Garante a qualidade, estabilidade e confiabilidade dos produtos, atuando em testes, validações, prevenção de regressões e melhoria contínua dos processos de desenvolvimento.' WHERE id = 'ea0c1ebe-9bcc-4d03-8461-98095db53685';

UPDATE teams SET description = 'Responsável pela engenharia de software, arquitetura, infraestrutura, segurança e performance da plataforma, garantindo escalabilidade, confiabilidade e evolução técnica sustentável.' WHERE id = '65e6e345-5ab6-487f-9241-7070e3e1813f';

UPDATE teams SET description = 'Cuida da experiência e da interface dos produtos, focando em usabilidade, consistência visual, acessibilidade e design centrado no usuário para maximizar adoção e satisfação.' WHERE id = '64a1e54f-ce25-4d1f-bdff-483ca3a818a3';

UPDATE teams SET description = 'Responsável por gerar e escalar receita, integrando estratégias de marketing, vendas, parcerias e crescimento, com foco em previsibilidade, eficiência comercial e expansão sustentável.' WHERE id = 'ea5f7a3b-7569-4877-80a2-cccd457020fc';

UPDATE teams SET description = 'Constrói e fortalece a marca Jetimob, garantindo posicionamento claro, identidade consistente e comunicação alinhada aos valores e à proposta de valor da empresa.' WHERE id = '2d6aa88b-90c4-4e66-9961-3828ee47341c';

UPDATE teams SET description = 'Atua diretamente na aquisição de novos clientes, conduzindo processos de venda, negociação, fechamento e relacionamento comercial, com foco em crescimento de receita e fit com o produto.' WHERE id = 'd3247da9-3e07-4fa8-9d0a-2527fdf6548f';

UPDATE teams SET description = 'Responsável por experimentação, aquisição, ativação e otimização de canais de crescimento, usando dados, testes e automações para escalar resultados de forma eficiente.' WHERE id = 'f21be53e-deb3-45dc-867a-a7305a3799e6';

UPDATE teams SET description = 'Planeja e executa estratégias de geração de demanda, conteúdo, campanhas, eventos e comunicação, apoiando vendas, branding e crescimento do negócio.' WHERE id = 'c8e5d7a7-0b36-4910-bdf1-6cc912f849fe';

UPDATE teams SET description = 'Explora novas oportunidades de mercado, produtos, modelos de receita e iniciativas estratégicas, validando hipóteses e abrindo frentes de crescimento para a Jetimob.' WHERE id = '6d545e1f-91a1-443d-a3d9-d5e8836b35aa';

UPDATE teams SET description = 'Desenvolve e gerencia parcerias estratégicas, integrando a Jetimob a ecossistemas, canais e soluções complementares para ampliar alcance e geração de valor.' WHERE id = '6e84fccf-176a-4621-9558-a75d64560bba';

-- Reabilitar o trigger
ALTER TABLE teams ENABLE TRIGGER trg_enforce_bu_scope_teams;
