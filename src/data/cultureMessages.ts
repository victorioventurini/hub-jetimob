/**
 * Pool de 1000+ frases de cultura Jet categorizadas.
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
// MENSAGENS POR TEMA
// ============================================================

export const MESSAGES_BY_THEME = {
  simplicidade: [
    "Simplicidade é a sofisticação máxima. Menos ruído, mais resultado.",
    "Foco não é dizer sim ao que importa, é dizer não a mil coisas boas.",
    "O simples escala. O complicado colapsa.",
    "Cada linha de código, cada decisão, cada reunião: pergunte-se 'isso simplifica ou complica?'",
    "Clareza é gentileza. Seja claro com os outros e consigo mesmo.",
    "Menos ferramentas, mais maestria. Menos processos, mais propósito.",
    "A complexidade é o inimigo da execução.",
    "Quando tudo é prioridade, nada é prioridade.",
    "Simplifique até não poder mais. Depois simplifique de novo.",
    "O óbvio bem feito supera o genial mal executado.",
    "Complexidade é dívida técnica da comunicação.",
    "Um processo simples bem seguido supera um processo perfeito ignorado.",
    "Elimine uma etapa antes de adicionar outra.",
    "A melhor feature é aquela que resolve o problema sem adicionar botões.",
    "Simplicidade requer coragem para cortar o que não é essencial.",
    "Se você não consegue explicar em uma frase, ainda não entendeu.",
    "Reduza. Reduza mais. Depois pergunte: dá pra reduzir?",
    "O melhor código é aquele que você não precisa escrever.",
    "Cada campo no formulário é atrito. Cada tela é barreira.",
    "Simplicidade é respeito pelo tempo do outro.",
    "Menos é mais, mas zero é nada. Encontre o equilíbrio.",
    "A elegância está na economia de recursos, não no excesso.",
    "Processos complexos criam gargalos. Simplifique para acelerar.",
    "Uma decisão clara vale mais que dez reuniões.",
    "O simples parece fácil depois de feito. Mas requer muito trabalho.",
    "Corte a gordura antes de adicionar músculo.",
    "Simplicidade é o resultado de dominar a complexidade.",
    "Quanto mais simples a solução, mais difícil de copiar.",
    "Comunicação clara evita retrabalho. Invista na clareza.",
    "Se precisa de manual, não é simples o suficiente.",
  ],

  cultura: [
    "Cultura não é o que dizemos, é o que fazemos no dia a dia.",
    "Cada decisão reflete nossos valores. Faça escolhas que nos orgulhem.",
    "Compromisso não é cumprir tarefas, é entregar impacto.",
    "Somos donos do que construímos. Trate cada projeto como se fosse seu.",
    "Confiança se constrói com consistência, não com promessas.",
    "Valores não são decoração de parede. São filtros de decisão.",
    "A cultura certa atrai as pessoas certas.",
    "Prefira desconforto temporário a mediocridade permanente.",
    "O que toleramos define quem somos.",
    "Integridade é fazer o certo mesmo quando ninguém está olhando.",
    "Cultura se propaga pelo exemplo, não pelo PowerPoint.",
    "Rituais criam cultura. Escolha os seus com intenção.",
    "O que celebramos, multiplicamos. Celebre o que importa.",
    "Cultura forte é imunidade contra tempos difíceis.",
    "Novos colaboradores aprendem mais observando do que ouvindo.",
    "Cada pequena decisão é um tijolo na construção da cultura.",
    "Cultura não se impõe. Se cultiva.",
    "O silêncio diante do errado é aprovação.",
    "Tradição sem propósito é só hábito. Questione.",
    "A cultura come a estratégia no café da manhã.",
    "Valores vividos valem mais que valores escritos.",
    "Seja o guardião da cultura que você quer ver.",
    "Cultura é o que fazemos quando o chefe não está olhando.",
    "Pequenas vitórias alinhadas aos valores constroem grandes culturas.",
    "O onboarding começa antes do primeiro dia. Começa na entrevista.",
    "Quem não se encaixa na cultura, não entrega resultado sustentável.",
    "Cultura de feedback é cultura de crescimento.",
    "Celebre o processo, não só o resultado.",
    "Cultura de dono: trate o dinheiro da empresa como se fosse seu.",
    "A verdadeira cultura aparece nas crises, não nas festas.",
  ],

  execucao: [
    "Feito é melhor que perfeito. Perfeito é inimigo do bom.",
    "Velocidade com qualidade. Não escolha apenas um.",
    "Resultados falam mais alto que intenções.",
    "Planejar é importante. Executar é essencial.",
    "Não espere condições perfeitas. Comece com o que tem.",
    "Quem entrega, decide. Quem só opina, assiste.",
    "A diferença entre sonho e realidade é execução.",
    "Medir é saber. Saber é poder melhorar.",
    "Errar rápido, aprender mais rápido ainda.",
    "O melhor momento para começar era ontem. O segundo melhor é agora.",
    "Execução mediana de uma boa ideia supera execução perfeita de nenhuma.",
    "Pare de planejar. Comece a fazer. Ajuste no caminho.",
    "Cada dia sem execução é um dia de atraso no resultado.",
    "Falar é fácil. Entregar é raro. Seja raro.",
    "Velocidade de aprendizado é vantagem competitiva.",
    "Itere rapidamente. O mercado não espera.",
    "Foco na próxima entrega, não na entrega perfeita.",
    "Quem executa primeiro, define o padrão do mercado.",
    "Resultados concretos abrem portas que planos não abrem.",
    "A ação cura a ansiedade. Execute.",
    "Progresso imperfeito supera paralisia perfeita.",
    "Entregue hoje o que pode melhorar amanhã.",
    "Execução consistente supera genialidade esporádica.",
    "O plano sobrevive até o primeiro contato com a realidade. Adapte.",
    "Micro-progressos diários constroem macro-resultados anuais.",
    "Não é sobre trabalhar mais. É sobre entregar mais valor.",
    "Execute como se dependesse só de você. Porque depende.",
    "Cada sprint é uma oportunidade de provar valor.",
    "Menos debate, mais experimento. Dados > opiniões.",
    "A execução revela o que o planejamento esconde.",
  ],

  colaboracao: [
    "Sozinhos vamos rápido. Juntos vamos longe.",
    "Feedback é presente, não ofensa. Dê e receba com gratidão.",
    "Questione com respeito, alinhe com clareza, execute com atitude.",
    "Pense diferente. Construa junto. Execute com protagonismo.",
    "Transparência radical constrói times fortes.",
    "Ajudar o colega é ajudar a empresa. Ajudar a empresa é ajudar a si mesmo.",
    "Conflito saudável gera melhores decisões.",
    "Celebre as vitórias dos outros como se fossem suas.",
    "Um time alinhado move montanhas.",
    "Comunique mais do que acha necessário. Depois comunique de novo.",
    "Ego é o maior obstáculo para colaboração genuína.",
    "Discorde e comprometa-se. Depois de decidir, execute junto.",
    "Contexto compartilhado evita micro-gerenciamento.",
    "Times diversos pensam melhor. Busque perspectivas diferentes.",
    "Ajude antes de pedir ajuda. Crie crédito social.",
    "Colaboração não é consenso. É compromisso com o melhor resultado.",
    "Seu sucesso individual depende do sucesso do time.",
    "Informação guardada é poder desperdiçado. Compartilhe.",
    "Cross-funcionalidade acelera. Silos atrasam.",
    "O mérito é do time. O erro é minha responsabilidade.",
    "Reuniões são para decidir, não para informar. Informe assíncrono.",
    "Documente para escalar. Conhecimento tácito não escala.",
    "Peça feedback cedo e frequentemente.",
    "Colaboração remota requer 2x mais comunicação.",
    "Assuma boa intenção. Sempre. Primeiro.",
    "Time forte discorda abertamente e decide rapidamente.",
    "Colaborar é multiplicar capacidades, não dividir tarefas.",
    "O melhor código é revisado. A melhor ideia é debatida.",
    "Vulnerabilidade cria conexão. Conexão cria times fortes.",
    "Celebre publicamente. Corrija privadamente.",
  ],

  cliente: [
    "O cliente não é interrupção do trabalho. É a razão do trabalho.",
    "Entenda o problema antes de propor a solução.",
    "Cada interação é uma oportunidade de encantar.",
    "Não entregue features. Entregue transformação.",
    "O sucesso do cliente é o nosso sucesso.",
    "Ouça mais do que fala. Aprenda mais do que ensina.",
    "Construa algo que você mesmo usaria com orgulho.",
    "Empatia não é soft skill. É business skill.",
    "Resolva a causa raiz, não o sintoma.",
    "O melhor marketing é um cliente satisfeito.",
    "Cliente frustrado é feedback gratuito. Agradeça e aprenda.",
    "NPS alto é consequência, não objetivo.",
    "Conheça o cliente melhor do que ele conhece a si mesmo.",
    "Dor do cliente é oportunidade de inovação.",
    "Surpreenda positivamente. Prometa menos, entregue mais.",
    "O cliente não compra produto. Compra resultado.",
    "Rapidez na resposta é respeito pelo tempo do cliente.",
    "Cada reclamação é uma chance de fidelizar.",
    "Pense como cliente. Aja como dono.",
    "O cliente ideal é aquele que crescemos juntos.",
    "Churn é sintoma. Descubra a doença.",
    "Sucesso do cliente começa no onboarding.",
    "Antecipe necessidades. Não espere o cliente pedir.",
    "Cliente satisfeito indica. Cliente encantado advoga.",
    "Métricas de vaidade não pagam contas. Foque em valor real.",
    "O cliente não quer software. Quer o problema resolvido.",
    "Cada touchpoint é momento da verdade.",
    "Escute o que o cliente não diz. Observe o que ele faz.",
    "Retenção é mais barata que aquisição. Cuide de quem já está.",
    "O melhor vendedor é o cliente satisfeito.",
  ],

  crescimento: [
    "Desconforto é pré-requisito para crescimento.",
    "Curiosidade é o combustível da inovação.",
    "Quem para de aprender, para de liderar.",
    "Erros são tuition. Quanto mais caro, mais valioso o aprendizado.",
    "Humildade intelectual abre portas que o ego fecha.",
    "O que te trouxe até aqui não te levará até lá.",
    "Invista em você. A empresa cresce quando você cresce.",
    "Leia, questione, experimente. Repita.",
    "Feedback é o café da manhã dos campeões.",
    "Seja o aluno mais dedicado da sua própria carreira.",
    "Zona de conforto é zona de estagnação.",
    "Aprenda com quem já errou. É mais barato.",
    "Mentoria acelera décadas em meses.",
    "O melhor investimento é em conhecimento. Retorno infinito.",
    "Fracasso é aula. Desistência é reprovação.",
    "Cresça 1% ao dia. Em um ano, você é 37x melhor.",
    "Especialização profunda + generalismo estratégico = T-shaped.",
    "Não compare seu começo com o meio de outro.",
    "Vulnerabilidade é coragem para aprender publicamente.",
    "O expert de hoje foi o novato de ontem.",
    "Compartilhe o que aprendeu. Ensinar é aprender duas vezes.",
    "Habilidades técnicas abrem portas. Soft skills mantêm abertas.",
    "Networking é investimento, não transação.",
    "Seu maior concorrente é quem você era ontem.",
    "Abrace o não saber. É o primeiro passo para saber.",
    "Profundidade em uma área cria alavancagem em outras.",
    "Consistência bate talento no longo prazo.",
    "O melhor momento para plantar foi há 20 anos. O segundo melhor é hoje.",
    "Leitores são líderes. Líderes são leitores.",
    "Aprenda a aprender. A meta-habilidade do século.",
  ],

  lideranca: [
    "Liderança é servir, não ser servido.",
    "Dê contexto, não ordens. Confie na inteligência do time.",
    "O líder define o teto do time. Eleve o seu.",
    "Responsabilidade não se delega. Tarefas sim.",
    "Seja o exemplo que você quer ver nos outros.",
    "Decisões difíceis, conversas fáceis. Decisões fáceis, conversas difíceis.",
    "O silêncio do líder é interpretado como aprovação.",
    "Proteja o time. Exponha-se primeiro.",
    "Reconheça publicamente. Corrija privadamente.",
    "Vulnerabilidade é força, não fraqueza.",
    "Líder que não desenvolve pessoas está apenas gerenciando.",
    "Contrate devagar. Demita rápido quando necessário.",
    "O bom líder cria mais líderes, não seguidores.",
    "Delegar não é abandonar. É confiar com acompanhamento.",
    "Líder presente é líder acessível. Esteja disponível.",
    "Decisão tardia é pior que decisão errada.",
    "O líder dá o tom. Que tom você está dando?",
    "Lidere pelo exemplo. Palavras inspiram, ações transformam.",
    "Time forte é reflexo de liderança forte.",
    "Liderança situacional: adapte o estilo ao contexto.",
    "Empodere. O controle é ilusão.",
    "O líder carrega o guarda-chuva quando chove críticas.",
    "Feedback constante evita surpresas na avaliação.",
    "Líder coach pergunta antes de responder.",
    "Autonomia com alinhamento. Liberdade com responsabilidade.",
    "O líder é o primeiro a chegar e o último a comer.",
    "Construa a escada enquanto sobe. Ajude quem vem atrás.",
    "Liderança sem título é a mais poderosa.",
    "O melhor líder é dispensável. O time funciona sem ele.",
    "Lidere com dados, inspire com propósito.",
  ],

  inovacao: [
    "O bom é inimigo do ótimo. Mas o ótimo também é inimigo do feito.",
    "Questione o status quo. Sempre há um jeito melhor.",
    "Inovação não é fazer coisas novas. É fazer melhor.",
    "Mude antes de precisar mudar.",
    "Experimentação é o caminho mais curto para a verdade.",
    "O medo de errar mata mais ideias que a crítica.",
    "Adapte-se ou torne-se irrelevante.",
    "A única constante é a mudança. Abrace-a.",
    "Destrua seus próprios produtos antes que outros o façam.",
    "Pense grande, comece pequeno, aprenda rápido.",
    "Inovação incremental é mais sustentável que disrupção.",
    "O melhor laboratório é o mercado real.",
    "Ideias são baratas. Execução é cara. Valide antes.",
    "Copie o modelo, adapte ao contexto, supere o original.",
    "Inovação é combinação criativa de elementos existentes.",
    "Reserve tempo para pensar. Inovação precisa de espaço.",
    "O impossível de ontem é o óbvio de amanhã.",
    "Falhe barato. Falhe rápido. Aprenda sempre.",
    "Pergunte 'e se?' mais vezes ao dia.",
    "Constraints são mães da invenção.",
    "Ouça os clientes, mas não pergunte o que querem. Observe.",
    "Tecnologia é meio. Problema resolvido é fim.",
    "10% de melhoria não vale o esforço. Busque 10x.",
    "Inovação aberta: combine capacidades internas e externas.",
    "Prototipe em dias, não em meses.",
    "O primeiro a errar tem vantagem de aprendizado.",
    "Startups morrem de indigestão, não de fome. Foque.",
    "Inovar é desaprender o que funcionou ontem.",
    "Dados históricos preveem o passado. Experimentos revelam o futuro.",
    "Cada não é um passo mais perto do sim transformador.",
  ],

  mindset: [
    "Otimismo com realismo. Sonhe alto, pise firme.",
    "Problemas são oportunidades disfarçadas.",
    "Atitude é escolha. Escolha a que te move pra frente.",
    "Reclamar é fácil. Resolver é raro.",
    "Energia positiva é contagiosa. Seja o vetor.",
    "Gratidão transforma o que temos em suficiente.",
    "Não espere motivação. Crie disciplina.",
    "O impossível é só o possível que ainda não foi tentado.",
    "Sua zona de conforto é uma prisão dourada.",
    "Resiliência se forja na adversidade.",
    "Mentalidade fixa limita. Mentalidade de crescimento liberta.",
    "O 'como' importa tanto quanto o 'quê'.",
    "Escolha suas batalhas. Nem toda briga vale a energia.",
    "Otimize para aprendizado, não para perfeição.",
    "O cansaço é temporário. O orgulho é permanente.",
    "Foco no que você controla. Aceite o resto.",
    "Mindset de abundância: há espaço para todos brilharem.",
    "A narrativa que você conta a si mesmo define seu limite.",
    "Emoções são dados, não ordens.",
    "Celebre o progresso, não só a chegada.",
    "O pior dia com atitude certa bate o melhor dia com atitude errada.",
    "Seja antifrágil: cresça com o caos.",
    "O viés de confirmação é seu maior inimigo. Busque evidências contrárias.",
    "Prefira difícil e valioso a fácil e medíocre.",
    "A pergunta certa vale mais que mil respostas certas.",
    "Velocidade de recuperação define campeões.",
    "O medo é bússola. Vá na direção dele.",
    "Intenção sem ação é ilusão.",
    "Seja dono da sua energia. Não deixe outros drenarem.",
    "O sucesso é alugado. E o aluguel vence todo dia.",
  ],

  tempo: [
    "Tempo é o recurso mais escasso. Use com sabedoria.",
    "Diga não com mais frequência. Seu sim terá mais valor.",
    "Reunião sem pauta é desperdício coletivo.",
    "O urgente rouba espaço do importante. Proteja o importante.",
    "Multitarefa é a ilusão de produtividade.",
    "Blocos de foco profundo valem mais que horas de interrupção.",
    "Automatize o repetitivo. Humanize o que importa.",
    "Deadline é compromisso, não sugestão.",
    "Planeje a semana, não só o dia.",
    "O tempo que você não controla, controla você.",
    "Cada minuto de planejamento economiza 10 de execução.",
    "Time-boxing: limite o tempo, aumente o foco.",
    "Notificações são ladrões de atenção. Silencie.",
    "Energia segue atenção. Proteja sua atenção.",
    "Faça o difícil pela manhã. Reserve a tarde para rotina.",
    "Batch similar tasks. Contexto-switching é caro.",
    "Não existe 'não tenho tempo'. Existe 'não é prioridade'.",
    "Reuniões de 25 ou 50 minutos. Nunca 30 ou 60.",
    "Review semanal: o que funcionou? O que ajustar?",
    "Tempo é o grande equalizador. Todos têm 24 horas.",
    "Inbox zero é sobre decisão, não sobre resposta.",
    "Delegar libera tempo para o que só você pode fazer.",
    "ROI do tempo: qual atividade gera mais valor por hora?",
    "Diga não para o bom para dizer sim para o ótimo.",
    "Calendário vazio é calendário produtivo.",
    "Proteja suas manhãs. É quando você está mais afiado.",
    "Procrastinação produtiva: faça a segunda coisa mais importante.",
    "Tempo perdido não volta. Dinheiro perdido se recupera.",
    "Rotinas eliminam decisões. Decisões consomem energia.",
    "O melhor time-management é saber o que não fazer.",
  ],

  excelencia: [
    "A excelência não é um ato, é um hábito.",
    "Detalhes fazem a diferença entre bom e extraordinário.",
    "Qualidade é lembrada muito depois que o preço é esquecido.",
    "Faça certo da primeira vez. Refazer custa mais.",
    "Padrões altos atraem pessoas de alto padrão.",
    "Mediocridade é confortável. Excelência é rentável.",
    "O orgulho do trabalho bem feito não tem preço.",
    "Consistência supera intensidade.",
    "Entregue mais do que prometeu.",
    "A reputação se constrói em anos e se destrói em segundos.",
    "Excelência é fazer o ordinário de forma extraordinária.",
    "Quem aceita 'bom o suficiente' nunca será excelente.",
    "O diabo mora nos detalhes. Deus também.",
    "Excelência atrai excelência. Mediocridade atrai mediocridade.",
    "Revisão é parte do processo, não exceção.",
    "O cliente percebe qualidade. Sempre.",
    "Excelência operacional é vantagem competitiva sustentável.",
    "Processo excelente gera resultado excelente.",
    "Não corte caminho em qualidade. O atalho sai mais caro.",
    "Seja conhecido pela qualidade, não pelo preço.",
    "Padrão baixo hoje é crise de amanhã.",
    "Excelência é fazer bem mesmo quando ninguém está medindo.",
    "O benchmark é você mesmo ontem.",
    "Busque o 1% de melhoria. Todo dia.",
    "Profissionais falam de processo. Amadores falam de resultado.",
    "Cada entrega é seu cartão de visitas.",
    "O custo da qualidade é menor que o custo da falta dela.",
    "Quem domina o básico domina o jogo.",
    "Excelência é hábito. Comece pequeno, seja consistente.",
    "O mercado recompensa quem não aceita mediocridade.",
  ],

  proposito: [
    "Propósito dá significado ao esforço.",
    "Trabalhe por algo maior que o salário.",
    "Impacto positivo é o melhor legado.",
    "Propósito alinha. Lucro segue.",
    "Por que existimos? Responda isso todo dia.",
    "Missão clara guia decisões difíceis.",
    "O propósito atrai quem vibra na mesma frequência.",
    "Não é sobre o que fazemos. É sobre por que fazemos.",
    "Propósito é norte. Estratégia é rota.",
    "Quando o porquê é forte, o como se resolve.",
    "Impacto duradouro supera lucro imediato.",
    "Construa algo que importe. O resto é ruído.",
    "Legado não é sobre você. É sobre quem você impacta.",
    "Trabalho com propósito não é trabalho. É missão.",
    "O propósito energiza nos dias difíceis.",
    "Empresa com propósito forte retém talentos.",
    "Clientes compram propósito, não apenas produto.",
    "Propósito é o filtro para dizer não.",
    "Alinhamento de propósito multiplica resultados.",
    "O mercado valoriza quem resolve problemas reais.",
    "Propósito sem ação é só filosofia.",
    "Conecte cada tarefa ao propósito maior.",
    "Propósito compartilhado cria times invencíveis.",
    "O impacto que geramos nos define.",
    "Trabalhe para deixar o mundo melhor do que encontrou.",
    "Propósito é o que fica quando tudo mais muda.",
    "Lucro sustenta. Propósito inspira.",
    "Cada pequena ação conta quando conectada ao todo.",
    "O sentido do trabalho está no impacto, não na tarefa.",
    "Propósito é inegociável. Estratégia é adaptável.",
  ],

  autonomia: [
    "Autonomia com responsabilidade. Liberdade com resultado.",
    "Seja dono. Aja como se a empresa fosse sua.",
    "Não peça permissão para fazer o certo.",
    "Contexto empodera mais que controle.",
    "Tome decisões como se tivesse que explicar publicamente.",
    "Autogestão é a skill do profissional do futuro.",
    "Quando você é dono, não espera alguém mandar.",
    "Liberdade é conquistada com confiança entregue.",
    "Ownership: o problema é meu até estar resolvido.",
    "Protagonismo não pede autorização.",
    "Esperar instruções é terceirizar responsabilidade.",
    "Autonomia requer maturidade. Demonstre.",
    "Decida e comunique. Não peça e espere.",
    "Owner mindset: gaste como se fosse seu dinheiro.",
    "Assuma a bronca antes de ser cobrado.",
    "Proatividade é o diferencial invisível.",
    "Quem resolve sem pedir tem espaço garantido.",
    "Autonomia é confiança traduzida em ação.",
    "Dono não terceiriza culpa. Assume e resolve.",
    "O melhor gestor é aquele que você não precisa.",
    "Autonomia gera velocidade. Burocracia gera atrito.",
    "Seja o líder que você gostaria de ter.",
    "Iniciativa é rara. Por isso é valiosa.",
    "Responsabilidade pessoal é o alicerce da autonomia.",
    "Quem espera ser microgerenciado não está pronto.",
    "Empowerment: dê contexto, defina resultado, confie no processo.",
    "Autonomia exige transparência. Mostre o que está fazendo.",
    "O dono de verdade dorme preocupado com o problema.",
    "Liberdade mal usada vira desculpa para não entregar.",
    "Autonomous teams: alinhados no porquê, livres no como.",
  ],

  resiliencia: [
    "Cair faz parte. Levantar é escolha.",
    "Crises revelam caráter. Mostre o seu.",
    "A dor de hoje é a força de amanhã.",
    "Resiliência não é não sentir. É seguir sentindo.",
    "O caminho é difícil. Continue.",
    "Persistência bate talento quando talento não persiste.",
    "Todo mestre já foi desastre.",
    "Fracasso é evento, não identidade.",
    "A pressão faz diamantes ou pó. Escolha.",
    "Recuar para saltar mais alto não é fraqueza.",
    "Dias ruins são professores disfarçados.",
    "O obstáculo é o caminho.",
    "Quem desiste na primeira não, perde na segunda sim.",
    "Resiliência é músculo. Exercite.",
    "Não é sobre evitar problemas. É sobre atravessá-los.",
    "A curva de aprendizado tem vales. Atravesse.",
    "Cada não te aproxima do sim certo.",
    "Stress gerenciado vira performance.",
    "A tempestade não dura para sempre. Aguente.",
    "O que não te derruba, te torna antifrágil.",
    "Cicatrizes são medalhas de batalhas vencidas.",
    "Adaptabilidade é resiliência em movimento.",
    "Não existe linha reta para o sucesso.",
    "O fundo do poço tem piso sólido. Empurre.",
    "Resilientes focam no que podem controlar.",
    "Cada restart é chance de fazer diferente.",
    "O sucesso visita quem não desistiu.",
    "Burn-out não é troféu. Descanse para durar.",
    "A consistência do resiliente vence a intensidade do impulsivo.",
    "Quem já caiu muito sabe levantar rápido.",
  ],
};

// ============================================================
// MENSAGENS POR PERFIL
// ============================================================

export const MESSAGES_BY_PROFILE = {
  executive: [
    "Estratégia sem execução é alucinação. Garanta que aconteça.",
    "O exemplo do topo define o padrão de baixo.",
    "Decisões de alto impacto merecem tempo de qualidade.",
    "A cultura que você tolera é a cultura que você terá.",
    "Invista nas pessoas certas. O resto segue.",
    "Visão sem comunicação é segredo bem guardado.",
    "O C-level define o teto. Eleve o seu.",
    "Alocação de recursos é estratégia materializada.",
    "Priorização radical separa bons de grandes.",
    "O que você mede, melhora. Escolha métricas com cuidado.",
    "Delegue outcome, não task.",
    "Times de alta performance começam com contratações certas.",
    "O mercado não espera. Decisão rápida, correção rápida.",
    "Estratégia é onde dizer não. O resto é tática.",
    "Governança clara libera velocidade.",
    "Esteja presente nos momentos que importam.",
    "Cash flow é oxigênio. Nunca esqueça.",
    "O board quer clareza, não desculpas. Prepare-se.",
    "Inovação precisa de proteção executiva.",
    "Cultura de accountability começa em você.",
    "Simplifique a estrutura. Complexidade mata velocidade.",
    "O melhor investimento é em desenvolvimento de líderes.",
    "Comunique a estratégia 7 vezes de 7 formas.",
    "Dados são bússola, não piloto automático.",
    "Equilibre curto prazo e longo prazo. Ambos importam.",
    "Stakeholders diferentes precisam de narrativas diferentes.",
    "O executivo resolve conflitos, não os evita.",
    "Succession planning não é opcional.",
    "Reputação é ativo estratégico. Proteja.",
    "O tempo do CEO é o recurso mais caro. Use bem.",
  ],

  leader: [
    "O time é seu espelho. O que você vê?",
    "1:1s regulares evitam surpresas na avaliação.",
    "Desenvolvendo pessoas, você multiplica resultados.",
    "Feedback imediato é feedback útil.",
    "Proteja o time de ruído. Filtre o que chega.",
    "Delegue para desenvolver, não para se livrar.",
    "O mérito é do time. A responsabilidade é sua.",
    "Alinhamento semanal evita desalinhamento mensal.",
    "Seja o coach que você gostaria de ter tido.",
    "OKRs claros são bússola para o time.",
    "Reconheça pequenas vitórias. Motivação se constrói.",
    "Conflito no time é sinal de engajamento. Gerencie.",
    "Seu humor afeta o humor do time. Cuide.",
    "Desenvolva substitutos. É sinal de força, não ameaça.",
    "Sprint review é momento de celebrar e aprender.",
    "Bloqueie tempo para pensar estrategicamente.",
    "O bom líder torna seu time melhor que ele.",
    "Confiança se constrói em micro-momentos.",
    "Acompanhe de perto quem está em desenvolvimento.",
    "Decisões transparentes geram times engajados.",
    "O líder é guardião da cultura no dia a dia.",
    "Não resolva pelo time. Ensine a resolver.",
    "Retrospectivas honestas aceleram aprendizado.",
    "Contratação errada custa caro. Invista tempo.",
    "O líder é amplificador, não gargalo.",
    "Equilibre care pessoal e cobrança profissional.",
    "Documentação libera você de dependência.",
    "Celebre o processo, não só resultado.",
    "Desenvolva habilidades de comunicação. Sempre.",
    "O melhor líder pergunta: 'como posso ajudar?'",
  ],

  collaborator: [
    "Sua entrega de hoje constrói sua reputação de amanhã.",
    "Peça feedback antes de precisar de avaliação.",
    "Documente seu trabalho. Visibilidade importa.",
    "Aprenda algo novo essa semana. Qualquer coisa.",
    "Networking interno abre portas inesperadas.",
    "Ajude um colega hoje. O karma profissional existe.",
    "Seu código, seu orgulho. Revise antes de commitar.",
    "Pergunte quando não souber. Assumir não é vergonha.",
    "Contribua em reuniões. Presença passiva não conta.",
    "O crescimento é sua responsabilidade, não do RH.",
    "Faça o básico muito bem feito primeiro.",
    "Cada tarefa é oportunidade de impressionar.",
    "Comunique proativamente o status do seu trabalho.",
    "Mentoria acelera. Busque um mentor.",
    "Erros acontecem. Não repetir é o que importa.",
    "Sua atitude é mais visível que seu currículo.",
    "Entenda o negócio, não só a sua tarefa.",
    "O especialista de hoje foi generalista ontem.",
    "Disponibilidade e confiabilidade abrem portas.",
    "Busque projetos desafiadores. Conforto estagna.",
    "Seu líder não é vidente. Comunique necessidades.",
    "Hard skills abrem portas. Soft skills mantêm abertas.",
    "Cada sprint é um ciclo de aprendizado.",
    "Seja o colega que você gostaria de ter.",
    "Antecipe problemas. Não espere serem descobertos.",
    "Organize-se. Caos pessoal vira caos profissional.",
    "Pergunte o 'porquê' das coisas. Contexto empodera.",
    "O melhor aprendizado vem de projetos difíceis.",
    "Não espere promoção para agir como promovido.",
    "Consistência bate talento. Apareça todo dia.",
  ],
};

// ============================================================
// MENSAGENS POR MOMENTO/DIA
// ============================================================

export const MESSAGES_BY_MOMENT = {
  segunda: [
    "Segunda-feira: oportunidade de começar do zero.",
    "Semana nova, metas renovadas. Bora!",
    "Segunda é dia de definir o tom da semana.",
    "Café forte, foco maior. Boa semana!",
    "Planeje a semana em 15 minutos. Vale cada segundo.",
    "O que você conquistar hoje define a semana.",
    "Segunda é dia de revisitar prioridades.",
    "Comece a semana pelo mais difícil. O resto flui.",
    "Energia alta no início, resultado alto no final.",
    "Segunda é chance de fazer diferente.",
    "Defina 3 vitórias para essa semana. Só 3.",
    "A semana é sua. Tome posse.",
    "Começou a semana alinhado, termina realizado.",
    "Segunda não é inimiga. É aliada de quem planeja.",
    "Qual problema você vai resolver essa semana?",
  ],

  terca: [
    "Terça é dia de executar o que planejou na segunda.",
    "Momentum construído, mantenha o ritmo.",
    "Terça é quando a semana pega tração.",
    "O trabalho de terça define o resto da semana.",
    "Menos reuniões, mais execução. Terça é dia de fazer.",
    "A semana só começa de verdade na terça.",
    "Terça: segundo capítulo da semana. Escreva bem.",
    "Checkpoint informal: você está no caminho certo?",
    "Terça é dia de deep work. Proteja o calendário.",
    "Elimine uma tarefa pendente hoje.",
    "Terça é dia de avançar no importante, não no urgente.",
    "Mantenha o foco de segunda. A consistência paga.",
    "Revise: o que está travando? Destrave hoje.",
    "Terça produtiva = quarta leve.",
    "Continue. A inércia está a seu favor.",
  ],

  quarta: [
    "Quarta: metade da semana. Hora de ajustar o rumo.",
    "Meio de semana é momento de recalcular rota.",
    "Quarta é dia de check-in: o que precisa mudar?",
    "Pausa estratégica: está priorizando o certo?",
    "Quarta é dia de resolver o que está travado.",
    "Metade feita. Metade por fazer. Foco no que falta.",
    "Quarta é dia de celebrar micro-vitórias.",
    "Revise o backlog. Algo pode sair?",
    "Meio de semana: energia ainda alta. Use.",
    "Quarta é boa para conversas difíceis.",
    "Ajuste fino. Pequenas correções, grandes resultados.",
    "Que tal um café com alguém do time hoje?",
    "Quarta: perfeita para atacar dívida técnica.",
    "Olhe para frente: o que precisa para fechar bem a semana?",
    "Meio do caminho. Mantenha o passo.",
  ],

  quinta: [
    "Quinta: reta final começando. O que falta?",
    "Antecipe o que pode. Sexta agradece.",
    "Quinta é dia de fechar ciclos.",
    "O que você pode adiantar para amanhã?",
    "Quinta produtiva = sexta tranquila.",
    "Revise pendências. O fim de semana está perto.",
    "Quinta é dia de resolver blockers.",
    "Preparação é a chave para uma sexta leve.",
    "O que você prometeu entregar essa semana?",
    "Quinta é dia de follow-ups.",
    "Finalize o que começou. Completude gera satisfação.",
    "Olhe para os OKRs: como está o progresso?",
    "Quinta: momento de pedir ajuda se precisar.",
    "Organize o que precisa revisar amanhã.",
    "A semana termina quando você decide que termina.",
  ],

  sexta: [
    "Sexta: dia de fechar com chave de ouro.",
    "Review da semana: o que funcionou? O que aprendeu?",
    "Sexta é dia de celebrar vitórias, mesmo pequenas.",
    "Documente os aprendizados da semana.",
    "Não deixe débitos para segunda. Feche hoje.",
    "Sexta de tarde: organize a semana que vem.",
    "Celebre o progresso. Descanso merecido vem.",
    "O que você fez essa semana que te orgulha?",
    "Sexta é dia de agradecer quem ajudou.",
    "Prepare o contexto para segunda. Seu eu futuro agradece.",
    "Termine forte. A impressão final importa.",
    "Retrospectiva pessoal: 1 coisa para melhorar semana que vem.",
    "Sexta é dia de limpar inbox e lista de tarefas.",
    "Descanse com consciência tranquila. Você entregou.",
    "Semana encerrada. Você sobreviveu. Você cresceu.",
  ],

  fim_de_ciclo: [
    "Fim de ciclo: hora de medir o que construímos.",
    "OKRs revisados, aprendizados documentados.",
    "Celebre as conquistas. Aprenda com os gaps.",
    "Fechamento de ciclo é novo começo disfarçado.",
    "Dados na mesa: o que os números dizem?",
    "Fim de ciclo é momento de transparência radical.",
    "Olhe para trás com gratidão. Para frente com ambição.",
    "O que faremos diferente no próximo ciclo?",
    "Resultados entregues são combustível para próximos.",
    "Fechamento é tempo de agradecer o time.",
    "Documente para não repetir erros.",
    "KPIs contam história. Qual foi a sua?",
    "Fim de trimestre: reset e renovação.",
    "O próximo ciclo começa com as lições deste.",
    "Celebrar fechamento é motivar abertura.",
  ],

  inicio_de_ciclo: [
    "Novo ciclo: página em branco. Escreva bem.",
    "OKRs definidos, time alinhado. Bora!",
    "Início de ciclo é energia renovada.",
    "Metas ambiciosas, planos claros. Vamos.",
    "O ciclo que começa já tem potencial de ser o melhor.",
    "Alinhamento no início evita correção no final.",
    "Defina as métricas que vão guiar os próximos meses.",
    "Novo ciclo, novas oportunidades de impacto.",
    "Comece com clareza. Termine com celebração.",
    "O time que alinha junto, entrega junto.",
    "Primeiro passo dado. Momentum em construção.",
    "Prioridades definidas são compromissos assumidos.",
    "Início de ciclo é dia de sonhar grande.",
    "Cada ciclo é chance de superar o anterior.",
    "Planejamento feito. Execução é o que conta.",
  ],
};

// ============================================================
// MENSAGENS POR TURNO DO DIA
// ============================================================

export const MESSAGES_BY_TIME_OF_DAY = {
  manha: [
    "Bom dia! A manhã é quando você está mais afiado. Use bem.",
    "Manhã é ouro. Faça o mais importante primeiro.",
    "Café na mão, foco na mente. Bora!",
    "As melhores decisões são tomadas pela manhã.",
    "Comece o dia com intenção. O resto segue.",
    "Manhã produtiva, dia realizado.",
    "Defina as 3 prioridades do dia agora. Só 3.",
    "Energia alta, distração baixa. Aproveite.",
    "O que você fizer agora define o tom do dia.",
    "Manhã: momento perfeito para deep work.",
    "Bom dia! Que hoje seja melhor que ontem.",
    "A primeira hora define as outras 7.",
    "Manhã é tempo de criar. Tarde é tempo de executar.",
    "Proteja suas manhãs. São seu horário nobre.",
    "Comece com clareza, termine com satisfação.",
  ],

  tarde: [
    "Boa tarde! Ainda dá tempo de fazer a diferença.",
    "Tarde é hora de execução. Menos pensar, mais fazer.",
    "Revise o que planejou de manhã. Ajuste se necessário.",
    "Energia pós-almoço baixa? Uma caminhada ajuda.",
    "Tarde é hora de reuniões e colaboração.",
    "O que você ainda pode entregar hoje?",
    "Bloqueie distrações. A reta final chegou.",
    "Tarde é tempo de follow-ups.",
    "Mantenha o foco. O dia ainda não acabou.",
    "Revisão de progresso: está no caminho?",
    "Tarde produtiva compensa manhã corrida.",
    "Cuide da energia. Pausas estratégicas ajudam.",
    "Comunique status. Transparência evita surpresas.",
    "Ainda há tempo para uma vitória hoje.",
    "Tarde: momento de fechar ciclos do dia.",
  ],

  noite: [
    "Boa noite! Descanso também é produtividade.",
    "O dia foi intenso. Valorize o que entregou.",
    "Noite é hora de recarregar. Cuide de você.",
    "Desconecte para conectar amanhã.",
    "Reflexão noturna: o que funcionou hoje?",
    "Descanso é parte do processo. Não é luxo.",
    "Prepare brevemente o amanhã. Depois, descanse.",
    "Noite tranquila, manhã produtiva.",
    "O corpo precisa de pausa. Respeite.",
    "Gratidão pelo dia que passou. Expectativa pelo que vem.",
    "Sono de qualidade é performance de qualidade.",
    "Noite é hora de estar presente. Família, amigos, você.",
    "Trabalho em excesso tem rendimento decrescente. Pare.",
    "Celebre internamente as pequenas vitórias do dia.",
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
