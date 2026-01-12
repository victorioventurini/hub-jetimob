/**
 * Pool de frases de cultura Jet (máximo 60 caracteres cada).
 * Fallback robusto para quando a IA não está disponível.
 * 
 * Categorias:
 * - Por tema (valores, propósito, excelência, colaboração, etc.)
 * - Por perfil (executive, leader, collaborator)
 * - Por momento (segunda, sexta, fim de ciclo, etc.)
 * 
 * Assinatura: Vic
 */

// ============================================================
// MENSAGENS POR TEMA (máx 60 caracteres)
// ============================================================

export const MESSAGES_BY_THEME = {
  simplicidade: [
    "Simplicidade é a sofisticação máxima.",
    "Foco é dizer não a mil coisas boas.",
    "O simples escala. O complicado colapsa.",
    "Isso simplifica ou complica? Pergunte sempre.",
    "Clareza é gentileza. Seja claro.",
    "Menos ferramentas, mais maestria.",
    "A complexidade é inimiga da execução.",
    "Quando tudo é prioridade, nada é.",
    "Simplifique até não poder mais.",
    "O óbvio bem feito supera o genial mal feito.",
    "Complexidade é dívida da comunicação.",
    "Processo simples seguido > perfeito ignorado.",
    "Elimine uma etapa antes de adicionar.",
    "Cada campo no form é atrito pro usuário.",
    "Simplicidade exige coragem pra cortar.",
    "Se não explica em uma frase, não entendeu.",
    "Reduza. Reduza mais. Dá pra reduzir?",
    "O melhor código é o que não precisa existir.",
    "Simplicidade é respeito pelo tempo do outro.",
    "Menos é mais, mas zero é nada. Equilibre.",
    "Elegância está na economia de recursos.",
    "Processos complexos criam gargalos.",
    "Uma decisão clara > dez reuniões.",
    "O simples parece fácil depois de feito.",
    "Corte a gordura antes de adicionar músculo.",
    "Simplicidade é dominar a complexidade.",
    "Quanto mais simples, mais difícil de copiar.",
    "Comunicação clara evita retrabalho.",
    "Se precisa de manual, não é simples.",
    "Simples não é fácil. É essencial.",
  ],

  cultura: [
    "Cultura é o que fazemos, não o que dizemos.",
    "Cada decisão reflete nossos valores.",
    "Compromisso é entregar impacto, não tarefas.",
    "Trate cada projeto como se fosse seu.",
    "Confiança se constrói com consistência.",
    "Valores são filtros de decisão, não decoração.",
    "A cultura certa atrai as pessoas certas.",
    "Desconforto temporário > mediocridade eterna.",
    "O que toleramos define quem somos.",
    "Integridade: fazer certo sem ninguém olhar.",
    "Cultura se propaga pelo exemplo.",
    "Rituais criam cultura. Escolha com intenção.",
    "O que celebramos, multiplicamos.",
    "Cultura forte é imunidade contra crises.",
    "Novos aprendem mais observando que ouvindo.",
    "Cada pequena decisão constrói a cultura.",
    "Cultura não se impõe. Se cultiva.",
    "Silêncio diante do errado é aprovação.",
    "Tradição sem propósito é só hábito.",
    "A cultura come a estratégia no café da manhã.",
    "Valores vividos > valores escritos.",
    "Seja guardião da cultura que você quer.",
    "Cultura é o que fazemos sem o chefe olhar.",
    "Pequenas vitórias constroem grandes culturas.",
    "O onboarding começa na entrevista.",
    "Cultura de feedback é de crescimento.",
    "Celebre o processo, não só o resultado.",
    "Cultura de dono: trate como se fosse seu.",
    "A verdadeira cultura aparece nas crises.",
    "Valores não se negociam. Estratégia sim.",
  ],

  execucao: [
    "Feito é melhor que perfeito.",
    "Velocidade com qualidade. Os dois.",
    "Resultados falam mais alto que intenções.",
    "Planejar é importante. Executar é essencial.",
    "Não espere condições perfeitas. Comece.",
    "Quem entrega, decide. Quem opina, assiste.",
    "Sonho vs realidade? A diferença é execução.",
    "Medir é saber. Saber é poder melhorar.",
    "Errar rápido, aprender mais rápido.",
    "O melhor momento pra começar é agora.",
    "Execução mediana > planejamento perfeito.",
    "Pare de planejar. Comece a fazer.",
    "Cada dia sem execução é atraso no resultado.",
    "Falar é fácil. Entregar é raro. Seja raro.",
    "Velocidade de aprendizado é vantagem.",
    "Itere rapidamente. O mercado não espera.",
    "Foco na próxima entrega, não na perfeita.",
    "Quem executa primeiro define o padrão.",
    "Resultados abrem portas que planos não.",
    "A ação cura a ansiedade. Execute.",
    "Progresso imperfeito > paralisia perfeita.",
    "Entregue hoje o que pode melhorar amanhã.",
    "Execução consistente > genialidade esporádica.",
    "O plano muda no contato com a realidade.",
    "Micro-progressos diários = macro-resultados.",
    "Não é trabalhar mais. É entregar mais valor.",
    "Execute como se dependesse só de você.",
    "Cada sprint prova valor. Aproveite.",
    "Menos debate, mais experimento.",
    "A execução revela o que o plano esconde.",
  ],

  colaboracao: [
    "Sozinhos: rápido. Juntos: longe.",
    "Feedback é presente, não ofensa.",
    "Questione com respeito, execute com atitude.",
    "Pense diferente. Construa junto.",
    "Transparência radical constrói times fortes.",
    "Ajudar o colega é ajudar a empresa.",
    "Conflito saudável gera melhores decisões.",
    "Celebre vitórias dos outros como suas.",
    "Um time alinhado move montanhas.",
    "Comunique mais do que acha necessário.",
    "Ego é o maior obstáculo pra colaboração.",
    "Discorde e comprometa-se. Depois, execute.",
    "Contexto compartilhado evita microgestão.",
    "Times diversos pensam melhor.",
    "Ajude antes de pedir ajuda.",
    "Colaboração não é consenso. É compromisso.",
    "Seu sucesso depende do sucesso do time.",
    "Informação guardada é poder desperdiçado.",
    "Cross-funcionalidade acelera. Silos atrasam.",
    "O mérito é do time. O erro é meu.",
    "Reuniões são pra decidir, não informar.",
    "Documente para escalar. Tácito não escala.",
    "Peça feedback cedo e frequentemente.",
    "Colaboração remota = 2x mais comunicação.",
    "Assuma boa intenção. Sempre. Primeiro.",
    "Time forte discorda e decide rápido.",
    "Colaborar é multiplicar, não dividir.",
    "Código revisado é código melhor.",
    "Vulnerabilidade cria conexão.",
    "Celebre publicamente. Corrija privadamente.",
  ],

  cliente: [
    "O cliente é a razão do trabalho.",
    "Entenda o problema antes de propor solução.",
    "Cada interação é chance de encantar.",
    "Não entregue features. Entregue transformação.",
    "O sucesso do cliente é o nosso.",
    "Ouça mais do que fala.",
    "Construa algo que você usaria com orgulho.",
    "Empatia não é soft skill. É business skill.",
    "Resolva a causa raiz, não o sintoma.",
    "O melhor marketing é cliente satisfeito.",
    "Cliente frustrado é feedback gratuito.",
    "NPS alto é consequência, não objetivo.",
    "Conheça o cliente melhor que ele mesmo.",
    "Dor do cliente é oportunidade de inovar.",
    "Prometa menos, entregue mais.",
    "Cliente não compra produto. Compra resultado.",
    "Rapidez na resposta = respeito pelo tempo.",
    "Cada reclamação é chance de fidelizar.",
    "Pense como cliente. Aja como dono.",
    "O cliente ideal cresce junto conosco.",
    "Churn é sintoma. Descubra a doença.",
    "Sucesso do cliente começa no onboarding.",
    "Antecipe necessidades. Não espere pedir.",
    "Satisfeito indica. Encantado advoga.",
    "Métricas de vaidade não pagam contas.",
    "Cliente quer problema resolvido, não software.",
    "Cada touchpoint é momento da verdade.",
    "Ouça o que o cliente não diz. Observe.",
    "Retenção é mais barata que aquisição.",
    "O melhor vendedor é o cliente feliz.",
  ],

  crescimento: [
    "Desconforto é pré-requisito pra crescer.",
    "Curiosidade é combustível da inovação.",
    "Quem para de aprender, para de liderar.",
    "Erros são tuition. Aprenda com eles.",
    "Humildade intelectual abre portas.",
    "O que te trouxe aqui não te leva lá.",
    "Invista em você. A empresa cresce junto.",
    "Leia, questione, experimente. Repita.",
    "Feedback é café da manhã dos campeões.",
    "Seja aluno dedicado da própria carreira.",
    "Zona de conforto é zona de estagnação.",
    "Aprenda com quem já errou. É mais barato.",
    "Mentoria acelera décadas em meses.",
    "Melhor investimento: conhecimento.",
    "Fracasso é aula. Desistência é reprovação.",
    "Cresça 1% ao dia. 37x melhor em um ano.",
    "Especialização + generalismo = T-shaped.",
    "Não compare seu começo com o meio de outro.",
    "Vulnerabilidade é coragem pra aprender.",
    "O expert de hoje foi novato ontem.",
    "Ensinar é aprender duas vezes.",
    "Hard skills abrem. Soft skills mantêm.",
    "Networking é investimento, não transação.",
    "Seu maior concorrente é você ontem.",
    "Abrace o não saber. É o primeiro passo.",
    "Profundidade em uma área alavanca outras.",
    "Consistência bate talento no longo prazo.",
    "O melhor momento pra plantar é hoje.",
    "Leitores são líderes. Líderes são leitores.",
    "Aprenda a aprender. A meta-habilidade.",
  ],

  lideranca: [
    "Liderança é servir, não ser servido.",
    "Dê contexto, não ordens.",
    "O líder define o teto do time. Eleve.",
    "Responsabilidade não se delega. Tarefas sim.",
    "Seja o exemplo que quer ver nos outros.",
    "Decisões difíceis = conversas fáceis.",
    "Silêncio do líder é aprovação.",
    "Proteja o time. Exponha-se primeiro.",
    "Reconheça público. Corrija privado.",
    "Vulnerabilidade é força, não fraqueza.",
    "Líder desenvolve pessoas, não só gerencia.",
    "Contrate devagar. Demita rápido se preciso.",
    "Bom líder cria líderes, não seguidores.",
    "Delegar não é abandonar. É confiar.",
    "Líder presente é líder acessível.",
    "Decisão tardia é pior que decisão errada.",
    "O líder dá o tom. Que tom você dá?",
    "Lidere pelo exemplo. Ações transformam.",
    "Time forte reflete liderança forte.",
    "Adapte o estilo ao contexto.",
    "Empodere. Controle é ilusão.",
    "Líder carrega o guarda-chuva nas críticas.",
    "Feedback constante evita surpresas.",
    "Líder coach pergunta antes de responder.",
    "Autonomia com alinhamento. Liberdade com responsabilidade.",
    "O líder chega primeiro e come por último.",
    "Construa a escada enquanto sobe.",
    "Liderança sem título é a mais poderosa.",
    "O melhor líder é dispensável.",
    "Lidere com dados, inspire com propósito.",
  ],

  inovacao: [
    "O bom é inimigo do ótimo e do feito.",
    "Questione o status quo. Há jeito melhor.",
    "Inovação é fazer melhor, não só novo.",
    "Mude antes de precisar mudar.",
    "Experimentação é atalho pra verdade.",
    "Medo de errar mata mais ideias que crítica.",
    "Adapte-se ou torne-se irrelevante.",
    "A única constante é a mudança. Abrace.",
    "Destrua seus produtos antes que outros.",
    "Pense grande, comece pequeno, aprenda rápido.",
    "Inovação incremental é mais sustentável.",
    "O melhor laboratório é o mercado real.",
    "Ideias são baratas. Execução é cara.",
    "Copie o modelo, adapte, supere o original.",
    "Inovação é combinação criativa.",
    "Reserve tempo pra pensar. Inovação precisa.",
    "O impossível de ontem é o óbvio de amanhã.",
    "Falhe barato. Falhe rápido. Aprenda.",
    "Pergunte 'e se?' mais vezes ao dia.",
    "Constraints são mães da invenção.",
    "Não pergunte o que querem. Observe.",
    "Tecnologia é meio. Problema resolvido é fim.",
    "10% de melhoria não vale. Busque 10x.",
    "Inovação aberta: interno + externo.",
    "Prototipe em dias, não em meses.",
    "O primeiro a errar tem vantagem.",
    "Startups morrem de indigestão. Foque.",
    "Inovar é desaprender o que funcionou.",
    "Experimentos revelam futuro. Dados, passado.",
    "Cada não é passo pro sim transformador.",
  ],

  mindset: [
    "Otimismo com realismo. Sonhe alto, pise firme.",
    "Problemas são oportunidades disfarçadas.",
    "Atitude é escolha. Escolha bem.",
    "Reclamar é fácil. Resolver é raro.",
    "Energia positiva é contagiosa. Seja o vetor.",
    "Gratidão transforma o que temos em bastante.",
    "Não espere motivação. Crie disciplina.",
    "O impossível ainda não foi tentado.",
    "Sua zona de conforto é prisão dourada.",
    "Resiliência se forja na adversidade.",
    "Mentalidade de crescimento liberta.",
    "O 'como' importa tanto quanto o 'quê'.",
    "Escolha suas batalhas.",
    "Otimize pra aprendizado, não perfeição.",
    "O cansaço é temporário. Orgulho, permanente.",
    "Foco no que você controla. Aceite o resto.",
    "Mindset de abundância: há espaço pra todos.",
    "A narrativa que você conta define seu limite.",
    "Emoções são dados, não ordens.",
    "Celebre o progresso, não só a chegada.",
    "Dia ruim com atitude certa > dia bom sem.",
    "Seja antifrágil: cresça com o caos.",
    "Busque evidências contrárias às suas.",
    "Difícil e valioso > fácil e medíocre.",
    "A pergunta certa > mil respostas certas.",
    "Velocidade de recuperação define campeões.",
    "O medo é bússola. Vá na direção dele.",
    "Intenção sem ação é ilusão.",
    "Seja dono da sua energia.",
    "Sucesso é alugado. Aluguel vence todo dia.",
  ],

  tempo: [
    "Tempo é o recurso mais escasso. Use bem.",
    "Diga não mais. Seu sim terá mais valor.",
    "Reunião sem pauta é desperdício coletivo.",
    "O urgente rouba espaço do importante.",
    "Multitarefa é ilusão de produtividade.",
    "Blocos de foco > horas de interrupção.",
    "Automatize o repetitivo. Humanize o resto.",
    "Deadline é compromisso, não sugestão.",
    "Planeje a semana, não só o dia.",
    "O tempo que você não controla, controla você.",
    "1 min de planejamento = 10 de execução.",
    "Time-boxing: limite tempo, aumente foco.",
    "Notificações são ladrões de atenção.",
    "Energia segue atenção. Proteja.",
    "Faça o difícil pela manhã.",
    "Batch similar tasks. Context-switch é caro.",
    "'Não tenho tempo' = 'não é prioridade'.",
    "Reuniões de 25 ou 50 min. Nunca 30 ou 60.",
    "Review semanal: o que funcionou? Ajustar?",
    "Tempo é equalizador. Todos têm 24 horas.",
    "Inbox zero é sobre decisão, não resposta.",
    "Delegar libera pra o que só você pode.",
    "Qual atividade gera mais valor por hora?",
    "Diga não pro bom pra dizer sim pro ótimo.",
    "Calendário vazio é calendário produtivo.",
    "Proteja suas manhãs. Horário nobre.",
    "Procrastinação produtiva: faça o 2º mais importante.",
    "Tempo perdido não volta. Dinheiro sim.",
    "Rotinas eliminam decisões. Decisões gastam energia.",
    "Saber o que não fazer é o melhor time-management.",
  ],

  excelencia: [
    "A excelência não é ato, é hábito.",
    "Detalhes fazem a diferença.",
    "Qualidade é lembrada depois do preço.",
    "Faça certo da primeira vez.",
    "Padrões altos atraem pessoas de alto padrão.",
    "Mediocridade é confortável. Excelência, rentável.",
    "O orgulho do trabalho bem feito não tem preço.",
    "Consistência supera intensidade.",
    "Entregue mais do que prometeu.",
    "Reputação: anos pra construir, segundos pra destruir.",
    "Excelência: ordinário de forma extraordinária.",
    "'Bom o suficiente' nunca será excelente.",
    "O diabo mora nos detalhes. Deus também.",
    "Excelência atrai excelência.",
    "Revisão é parte do processo.",
    "O cliente percebe qualidade. Sempre.",
    "Excelência operacional é vantagem sustentável.",
    "Processo excelente = resultado excelente.",
    "Não corte caminho em qualidade.",
    "Seja conhecido pela qualidade, não pelo preço.",
    "Padrão baixo hoje é crise de amanhã.",
    "Excelência: fazer bem sem ninguém medir.",
    "O benchmark é você mesmo ontem.",
    "Busque 1% de melhoria. Todo dia.",
    "Profissionais falam de processo. Amadores, resultado.",
    "Cada entrega é seu cartão de visitas.",
    "Custo da qualidade < custo da falta dela.",
    "Quem domina o básico domina o jogo.",
    "Excelência é hábito. Comece pequeno.",
    "O mercado recompensa quem não aceita mediocre.",
  ],

  proposito: [
    "Propósito dá significado ao esforço.",
    "Trabalhe por algo maior que o salário.",
    "Impacto positivo é o melhor legado.",
    "Propósito alinha. Lucro segue.",
    "Por que existimos? Responda isso todo dia.",
    "Missão clara guia decisões difíceis.",
    "Propósito atrai quem vibra igual.",
    "Não é o que fazemos. É por que fazemos.",
    "Propósito é norte. Estratégia é rota.",
    "Quando o porquê é forte, o como se resolve.",
    "Impacto duradouro > lucro imediato.",
    "Construa algo que importe. O resto é ruído.",
    "Legado é sobre quem você impacta.",
    "Trabalho com propósito é missão.",
    "Propósito energiza nos dias difíceis.",
    "Empresa com propósito retém talentos.",
    "Clientes compram propósito, não só produto.",
    "Propósito é filtro pra dizer não.",
    "Alinhamento de propósito multiplica.",
    "O mercado valoriza quem resolve de verdade.",
    "Propósito sem ação é só filosofia.",
    "Conecte cada tarefa ao propósito maior.",
    "Propósito compartilhado: times invencíveis.",
    "O impacto que geramos nos define.",
    "Deixe o mundo melhor do que encontrou.",
    "Propósito é o que fica quando tudo muda.",
    "Lucro sustenta. Propósito inspira.",
    "Cada ação conta quando conectada ao todo.",
    "O sentido do trabalho está no impacto.",
    "Propósito é inegociável. Estratégia, adaptável.",
  ],

  autonomia: [
    "Autonomia com responsabilidade. Liberdade com resultado.",
    "Seja dono. Aja como se a empresa fosse sua.",
    "Não peça permissão pra fazer o certo.",
    "Contexto empodera mais que controle.",
    "Decida como se fosse explicar publicamente.",
    "Autogestão é a skill do futuro.",
    "Quando é dono, não espera alguém mandar.",
    "Liberdade é conquistada com confiança.",
    "Ownership: o problema é meu até resolver.",
    "Protagonismo não pede autorização.",
    "Esperar instruções é terceirizar responsabilidade.",
    "Autonomia requer maturidade. Demonstre.",
    "Decida e comunique. Não peça e espere.",
    "Owner mindset: gaste como se fosse seu.",
    "Assuma a bronca antes de ser cobrado.",
    "Proatividade é o diferencial invisível.",
    "Quem resolve sem pedir tem espaço garantido.",
    "Autonomia é confiança traduzida em ação.",
    "Dono não terceiriza culpa. Assume e resolve.",
    "O melhor gestor é o que você não precisa.",
    "Autonomia gera velocidade. Burocracia, atrito.",
    "Seja o líder que gostaria de ter.",
    "Iniciativa é rara. Por isso é valiosa.",
    "Responsabilidade pessoal: alicerce da autonomia.",
    "Quem espera microgestão não está pronto.",
    "Dê contexto, defina resultado, confie.",
    "Autonomia exige transparência.",
    "Dono de verdade dorme pensando no problema.",
    "Liberdade mal usada vira desculpa.",
    "Alinhados no porquê, livres no como.",
  ],

  resiliencia: [
    "Cair faz parte. Levantar é escolha.",
    "Crises revelam caráter. Mostre o seu.",
    "A dor de hoje é a força de amanhã.",
    "Resiliência não é não sentir. É seguir.",
    "O caminho é difícil. Continue.",
    "Persistência bate talento que não persiste.",
    "Todo mestre já foi desastre.",
    "Fracasso é evento, não identidade.",
    "A pressão faz diamantes ou pó. Escolha.",
    "Recuar pra saltar mais alto não é fraqueza.",
    "Dias ruins são professores disfarçados.",
    "O obstáculo é o caminho.",
    "Quem desiste no primeiro não perde no segundo sim.",
    "Resiliência é músculo. Exercite.",
    "Não evite problemas. Atravesse.",
    "A curva de aprendizado tem vales.",
    "Cada não te aproxima do sim certo.",
    "Stress gerenciado vira performance.",
    "A tempestade não dura pra sempre. Aguente.",
    "O que não derruba torna antifrágil.",
    "Cicatrizes são medalhas de batalhas.",
    "Adaptabilidade é resiliência em movimento.",
    "Não existe linha reta pro sucesso.",
    "O fundo do poço tem piso. Empurre.",
    "Resilientes focam no que podem controlar.",
    "Cada restart é chance de fazer diferente.",
    "O sucesso visita quem não desistiu.",
    "Burnout não é troféu. Descanse pra durar.",
    "Consistência do resiliente > intensidade do impulsivo.",
    "Quem já caiu muito sabe levantar rápido.",
  ],
};

// ============================================================
// MENSAGENS POR PERFIL (máx 60 caracteres)
// ============================================================

export const MESSAGES_BY_PROFILE = {
  executive: [
    "Estratégia sem execução é alucinação.",
    "O exemplo do topo define o padrão.",
    "Decisões de impacto merecem tempo.",
    "A cultura que tolera é a que terá.",
    "Invista nas pessoas certas. O resto segue.",
    "Visão sem comunicação é segredo guardado.",
    "O C-level define o teto. Eleve o seu.",
    "Alocação de recursos é estratégia real.",
    "Priorização radical separa bons de grandes.",
    "O que você mede, melhora. Escolha bem.",
    "Delegue outcome, não task.",
    "Alta performance começa em contratações.",
    "Mercado não espera. Decisão rápida.",
    "Estratégia é onde dizer não. Resto é tática.",
    "Governança clara libera velocidade.",
    "Esteja presente nos momentos que importam.",
    "Cash flow é oxigênio. Nunca esqueça.",
    "O board quer clareza, não desculpas.",
    "Inovação precisa de proteção executiva.",
    "Accountability começa em você.",
    "Simplifique estrutura. Complexidade mata.",
    "Melhor investimento: desenvolver líderes.",
    "Comunique estratégia 7x de 7 formas.",
    "Dados são bússola, não piloto automático.",
    "Equilibre curto e longo prazo.",
    "Stakeholders diferentes, narrativas diferentes.",
    "Executivo resolve conflitos, não evita.",
    "Succession planning não é opcional.",
    "Reputação é ativo estratégico. Proteja.",
    "Tempo do CEO é recurso mais caro. Use bem.",
  ],

  leader: [
    "O time é seu espelho. O que você vê?",
    "1:1s regulares evitam surpresas.",
    "Desenvolvendo pessoas, multiplica resultados.",
    "Feedback imediato é feedback útil.",
    "Proteja o time de ruído. Filtre.",
    "Delegue pra desenvolver, não pra se livrar.",
    "Mérito do time. Responsabilidade sua.",
    "Alinhamento semanal evita desalinhamento mensal.",
    "Seja o coach que gostaria de ter tido.",
    "OKRs claros são bússola pro time.",
    "Reconheça pequenas vitórias.",
    "Conflito no time é sinal de engajamento.",
    "Seu humor afeta o time. Cuide.",
    "Desenvolva substitutos. É força, não ameaça.",
    "Sprint review: celebrar e aprender.",
    "Bloqueie tempo pra pensar estratégia.",
    "Bom líder torna o time melhor que ele.",
    "Confiança se constrói em micro-momentos.",
    "Acompanhe quem está em desenvolvimento.",
    "Decisões transparentes geram engajamento.",
    "Líder é guardião da cultura no dia a dia.",
    "Não resolva pelo time. Ensine a resolver.",
    "Retrospectivas honestas aceleram.",
    "Contratação errada custa caro.",
    "Líder é amplificador, não gargalo.",
    "Equilibre cuidado pessoal e cobrança.",
    "Documentação libera de dependência.",
    "Celebre o processo, não só resultado.",
    "Desenvolva comunicação. Sempre.",
    "O melhor líder pergunta: como ajudar?",
  ],

  collaborator: [
    "Sua entrega de hoje constrói sua reputação.",
    "Peça feedback antes da avaliação.",
    "Documente seu trabalho. Visibilidade importa.",
    "Aprenda algo novo essa semana.",
    "Networking interno abre portas.",
    "Ajude um colega hoje. Karma profissional.",
    "Seu código, seu orgulho. Revise antes.",
    "Pergunte quando não souber.",
    "Contribua em reuniões. Passivo não conta.",
    "Crescimento é sua responsabilidade.",
    "Faça o básico muito bem feito primeiro.",
    "Cada tarefa é chance de impressionar.",
    "Comunique proativamente seu status.",
    "Mentoria acelera. Busque um mentor.",
    "Erros acontecem. Não repetir é o que importa.",
    "Sua atitude é mais visível que currículo.",
    "Entenda o negócio, não só sua tarefa.",
    "Especialista de hoje foi generalista ontem.",
    "Disponibilidade e confiabilidade abrem portas.",
    "Busque projetos desafiadores.",
    "Seu líder não é vidente. Comunique.",
    "Hard skills abrem. Soft skills mantêm.",
    "Cada sprint é ciclo de aprendizado.",
    "Seja o colega que gostaria de ter.",
    "Antecipe problemas. Não espere descobrirem.",
    "Organize-se. Caos pessoal vira profissional.",
    "Pergunte o 'porquê'. Contexto empodera.",
    "Melhor aprendizado vem de projetos difíceis.",
    "Não espere promoção pra agir como promovido.",
    "Consistência bate talento. Apareça todo dia.",
  ],
};

// ============================================================
// MENSAGENS POR MOMENTO/DIA (máx 60 caracteres)
// ============================================================

export const MESSAGES_BY_MOMENT = {
  segunda: [
    "Segunda: oportunidade de começar do zero.",
    "Semana nova, metas renovadas. Bora!",
    "Segunda define o tom da semana.",
    "Café forte, foco maior. Boa semana!",
    "Planeje a semana em 15 min. Vale.",
    "O que conquistar hoje define a semana.",
    "Segunda é dia de revisitar prioridades.",
    "Comece pelo mais difícil. O resto flui.",
    "Energia alta no início = resultado alto.",
    "Segunda é chance de fazer diferente.",
    "Defina 3 vitórias pra essa semana. Só 3.",
    "A semana é sua. Tome posse.",
    "Começou alinhado, termina realizado.",
    "Segunda não é inimiga. É aliada.",
    "Qual problema vai resolver essa semana?",
  ],

  terca: [
    "Terça: executar o que planejou na segunda.",
    "Momentum construído. Mantenha o ritmo.",
    "Terça é quando a semana pega tração.",
    "Trabalho de terça define o resto.",
    "Menos reuniões, mais execução. Terça é fazer.",
    "A semana começa de verdade na terça.",
    "Terça: segundo capítulo. Escreva bem.",
    "Checkpoint: está no caminho certo?",
    "Terça é dia de deep work.",
    "Elimine uma tarefa pendente hoje.",
    "Avance no importante, não no urgente.",
    "Mantenha o foco de segunda. Consistência.",
    "O que está travando? Destrave hoje.",
    "Terça produtiva = quarta leve.",
    "Continue. A inércia está a seu favor.",
  ],

  quarta: [
    "Quarta: metade da semana. Ajuste o rumo.",
    "Meio de semana: recalcule a rota.",
    "Quarta: check-in. O que precisa mudar?",
    "Pausa estratégica: priorizando o certo?",
    "Quarta é dia de resolver o travado.",
    "Metade feita. Metade por fazer. Foco.",
    "Quarta: celebre micro-vitórias.",
    "Revise o backlog. Algo pode sair?",
    "Meio de semana: energia alta. Use.",
    "Quarta é boa pra conversas difíceis.",
    "Ajuste fino. Pequenas correções, grandes resultados.",
    "Que tal um café com alguém do time?",
    "Quarta: perfeita pra dívida técnica.",
    "O que precisa pra fechar bem a semana?",
    "Meio do caminho. Mantenha o passo.",
  ],

  quinta: [
    "Quinta: reta final começando. O que falta?",
    "Antecipe o que pode. Sexta agradece.",
    "Quinta é dia de fechar ciclos.",
    "O que você pode adiantar pra amanhã?",
    "Quinta produtiva = sexta tranquila.",
    "Revise pendências. Fim de semana perto.",
    "Quinta é dia de resolver blockers.",
    "Preparação é chave pra sexta leve.",
    "O que prometeu entregar essa semana?",
    "Quinta é dia de follow-ups.",
    "Finalize o que começou. Completude satisfaz.",
    "Olhe pros OKRs: como está o progresso?",
    "Quinta: momento de pedir ajuda.",
    "Organize o que precisa revisar amanhã.",
    "A semana termina quando você decide.",
  ],

  sexta: [
    "Sexta: feche com chave de ouro.",
    "Review da semana: o que funcionou?",
    "Sexta: celebre vitórias, mesmo pequenas.",
    "Documente os aprendizados da semana.",
    "Não deixe débitos pra segunda.",
    "Sexta à tarde: organize a semana que vem.",
    "Celebre o progresso. Descanso merecido.",
    "O que você fez essa semana te orgulha?",
    "Sexta é dia de agradecer quem ajudou.",
    "Prepare contexto pra segunda.",
    "Termine forte. Impressão final importa.",
    "Retrospectiva: 1 coisa pra melhorar.",
    "Sexta: limpe inbox e lista de tarefas.",
    "Descanse com consciência tranquila.",
    "Semana encerrada. Você cresceu.",
  ],

  fim_de_ciclo: [
    "Fim de ciclo: hora de medir.",
    "OKRs revisados, aprendizados documentados.",
    "Celebre conquistas. Aprenda com gaps.",
    "Fechamento é novo começo disfarçado.",
    "Dados na mesa: o que os números dizem?",
    "Fim de ciclo: transparência radical.",
    "Olhe pra trás com gratidão. Frente, ambição.",
    "O que faremos diferente no próximo ciclo?",
    "Resultados são combustível pro próximo.",
    "Fechamento: tempo de agradecer o time.",
    "Documente pra não repetir erros.",
    "KPIs contam história. Qual foi a sua?",
    "Fim de trimestre: reset e renovação.",
    "Próximo ciclo começa com lições deste.",
    "Celebrar fechamento motiva abertura.",
  ],

  inicio_de_ciclo: [
    "Novo ciclo: página em branco. Escreva bem.",
    "OKRs definidos, time alinhado. Bora!",
    "Início de ciclo é energia renovada.",
    "Metas ambiciosas, planos claros. Vamos.",
    "O ciclo que começa tem potencial de ser o melhor.",
    "Alinhamento no início evita correção no fim.",
    "Defina as métricas que vão guiar.",
    "Novo ciclo, novas oportunidades.",
    "Comece com clareza. Termine com celebração.",
    "O time que alinha junto, entrega junto.",
    "Primeiro passo dado. Momentum em construção.",
    "Prioridades definidas são compromissos.",
    "Início de ciclo é dia de sonhar grande.",
    "Cada ciclo é chance de superar o anterior.",
    "Planejamento feito. Execução conta.",
  ],
};

// ============================================================
// MENSAGENS POR TURNO DO DIA (máx 60 caracteres)
// ============================================================

export const MESSAGES_BY_TIME_OF_DAY = {
  manha: [
    "Bom dia! Manhã: quando você está mais afiado.",
    "Manhã é ouro. Faça o importante primeiro.",
    "Café na mão, foco na mente. Bora!",
    "Melhores decisões são tomadas de manhã.",
    "Comece o dia com intenção. O resto segue.",
    "Manhã produtiva, dia realizado.",
    "Defina as 3 prioridades do dia. Só 3.",
    "Energia alta, distração baixa. Aproveite.",
    "O que fizer agora define o tom do dia.",
    "Manhã: momento perfeito pra deep work.",
    "Bom dia! Que hoje seja melhor que ontem.",
    "A primeira hora define as outras 7.",
    "Manhã é tempo de criar. Tarde, executar.",
    "Proteja suas manhãs. Horário nobre.",
    "Comece com clareza, termine com satisfação.",
  ],

  tarde: [
    "Boa tarde! Ainda dá tempo de fazer a diferença.",
    "Tarde: menos pensar, mais fazer.",
    "Revise o que planejou de manhã. Ajuste.",
    "Energia baixa? Uma caminhada ajuda.",
    "Tarde é hora de reuniões e colaboração.",
    "O que você ainda pode entregar hoje?",
    "Bloqueie distrações. Reta final.",
    "Tarde é tempo de follow-ups.",
    "Mantenha o foco. O dia não acabou.",
    "Revisão de progresso: está no caminho?",
    "Tarde produtiva compensa manhã corrida.",
    "Cuide da energia. Pausas ajudam.",
    "Comunique status. Transparência.",
    "Ainda há tempo pra uma vitória hoje.",
    "Tarde: momento de fechar ciclos do dia.",
  ],

  noite: [
    "Boa noite! Descanso também é produtividade.",
    "O dia foi intenso. Valorize o que entregou.",
    "Noite é hora de recarregar. Cuide de você.",
    "Desconecte pra conectar amanhã.",
    "Reflexão noturna: o que funcionou hoje?",
    "Descanso é parte do processo. Não é luxo.",
    "Prepare brevemente o amanhã. Depois, descanse.",
    "Noite tranquila, manhã produtiva.",
    "O corpo precisa de pausa. Respeite.",
    "Gratidão pelo dia. Expectativa pelo que vem.",
    "Sono de qualidade = performance de qualidade.",
    "Noite: presente. Família, amigos, você.",
    "Excesso tem rendimento decrescente. Pare.",
    "Celebre internamente as vitórias do dia.",
    "Amanhã é nova chance. Hoje, descanse.",
  ],
};

// ============================================================
// TODOS AS MENSAGENS CONCATENADAS (para compatibilidade)
// ============================================================

export const CULTURE_MESSAGES: string[] = [
  ...MESSAGES_BY_THEME.simplicidade,
  ...MESSAGES_BY_THEME.cultura,
  ...MESSAGES_BY_THEME.execucao,
  ...MESSAGES_BY_THEME.colaboracao,
  ...MESSAGES_BY_THEME.cliente,
  ...MESSAGES_BY_THEME.crescimento,
  ...MESSAGES_BY_THEME.lideranca,
  ...MESSAGES_BY_THEME.inovacao,
  ...MESSAGES_BY_THEME.mindset,
  ...MESSAGES_BY_THEME.tempo,
  ...MESSAGES_BY_THEME.excelencia,
  ...MESSAGES_BY_THEME.proposito,
  ...MESSAGES_BY_THEME.autonomia,
  ...MESSAGES_BY_THEME.resiliencia,
  ...MESSAGES_BY_PROFILE.executive,
  ...MESSAGES_BY_PROFILE.leader,
  ...MESSAGES_BY_PROFILE.collaborator,
  ...MESSAGES_BY_MOMENT.segunda,
  ...MESSAGES_BY_MOMENT.terca,
  ...MESSAGES_BY_MOMENT.quarta,
  ...MESSAGES_BY_MOMENT.quinta,
  ...MESSAGES_BY_MOMENT.sexta,
  ...MESSAGES_BY_MOMENT.fim_de_ciclo,
  ...MESSAGES_BY_MOMENT.inicio_de_ciclo,
  ...MESSAGES_BY_TIME_OF_DAY.manha,
  ...MESSAGES_BY_TIME_OF_DAY.tarde,
  ...MESSAGES_BY_TIME_OF_DAY.noite,
];

// ============================================================
// FUNÇÃO DE SELEÇÃO INTELIGENTE
// ============================================================

type RoleCategory = 'executive' | 'leader' | 'collaborator';
type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
type TimeOfDay = 'manha' | 'tarde' | 'noite';

interface SelectionContext {
  role?: RoleCategory;
  dayOfWeek?: DayOfWeek;
  timeOfDay?: TimeOfDay;
  isEndOfCycle?: boolean;
  isStartOfCycle?: boolean;
}

/**
 * Retorna uma mensagem aleatória do array, evitando as últimas N usadas.
 * Mantido para compatibilidade.
 */
export function getRandomCultureMessage(recentlyUsed: string[] = [], avoidCount = 10): string {
  const available = CULTURE_MESSAGES.filter(
    (msg) => !recentlyUsed.slice(0, avoidCount).includes(msg)
  );
  const pool = available.length > 0 ? available : CULTURE_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Seleciona uma mensagem contextualizada baseada no perfil, dia e turno.
 * Usa peso para priorizar mensagens mais relevantes ao contexto.
 */
export function getContextualCultureMessage(
  context: SelectionContext,
  recentlyUsed: string[] = [],
  avoidCount = 20
): string {
  // Construir pool ponderado
  const weightedPool: string[] = [];
  
  // Adicionar mensagens por turno (peso alto - 3x)
  if (context.timeOfDay && MESSAGES_BY_TIME_OF_DAY[context.timeOfDay]) {
    for (let i = 0; i < 3; i++) {
      weightedPool.push(...MESSAGES_BY_TIME_OF_DAY[context.timeOfDay]);
    }
  }

  // Adicionar mensagens por dia (peso alto - 3x)
  if (context.dayOfWeek && MESSAGES_BY_MOMENT[context.dayOfWeek as keyof typeof MESSAGES_BY_MOMENT]) {
    for (let i = 0; i < 3; i++) {
      weightedPool.push(...MESSAGES_BY_MOMENT[context.dayOfWeek as keyof typeof MESSAGES_BY_MOMENT]);
    }
  }

  // Adicionar mensagens de ciclo (peso muito alto - 4x)
  if (context.isEndOfCycle) {
    for (let i = 0; i < 4; i++) {
      weightedPool.push(...MESSAGES_BY_MOMENT.fim_de_ciclo);
    }
  }
  if (context.isStartOfCycle) {
    for (let i = 0; i < 4; i++) {
      weightedPool.push(...MESSAGES_BY_MOMENT.inicio_de_ciclo);
    }
  }

  // Adicionar mensagens por perfil (peso médio - 2x)
  if (context.role && MESSAGES_BY_PROFILE[context.role]) {
    for (let i = 0; i < 2; i++) {
      weightedPool.push(...MESSAGES_BY_PROFILE[context.role]);
    }
  }

  // Adicionar temas gerais (peso normal - 1x)
  Object.values(MESSAGES_BY_THEME).forEach(messages => {
    weightedPool.push(...messages);
  });

  // Filtrar mensagens recentes
  const available = weightedPool.filter(
    (msg) => !recentlyUsed.slice(0, avoidCount).includes(msg)
  );

  const pool = available.length > 0 ? available : weightedPool;
  return pool[Math.floor(Math.random() * pool.length)];
}
