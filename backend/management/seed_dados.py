"""Dados fictícios de demonstração usados por `python manage.py seed`.

Tudo aqui é inventado (empresas, pessoas, vagas). Edite à vontade: o seed é
idempotente e atualiza os registros pelo nome/e-mail na próxima execução.
"""

FACULDADE = {"nome": "Centro Universitário UNDB", "sigla": "UNDB", "cidade": "São Luís", "uf": "MA"}

NUCLEO = {"nome": "TEIA", "email_contato": "teia@undb.edu.br"}

# (nome, total de períodos)
CURSOS = [
    ("Engenharia de Software", 9),
    ("Sistemas de Informação", 10),
    ("Administração", 8),
    ("Ciências Contábeis", 8),
    ("Direito", 10),
    ("Psicologia", 10),
    ("Engenharia Civil", 10),
]

# (nome, categoria, sinônimos)
COMPETENCIAS = [
    ("JavaScript", "tecnica", ["JS"]),
    ("TypeScript", "tecnica", ["TS"]),
    ("React", "ferramenta", ["ReactJS", "React.js"]),
    ("React Native", "ferramenta", ["RN"]),
    ("Python", "tecnica", []),
    ("Django", "ferramenta", []),
    ("SQL", "tecnica", ["PostgreSQL", "MySQL"]),
    ("Git", "ferramenta", ["GitHub"]),
    ("Testes automatizados", "tecnica", ["testes unitários"]),
    ("Figma", "ferramenta", []),
    ("Excel", "ferramenta", ["planilhas"]),
    ("Power BI", "ferramenta", []),
    ("AutoCAD", "ferramenta", []),
    ("Pesquisa jurídica", "tecnica", []),
    ("Atendimento ao público", "comportamental", ["atendimento ao cliente"]),
    ("Comunicação", "comportamental", ["oratória"]),
    ("Trabalho em equipe", "comportamental", []),
]

# nome (razão social), nome fantasia, contato, e-mail, status do convênio
EMPRESAS = [
    ("Lumen Tecnologia LTDA", "Lumen Tecnologia", "Paula Ribeiro", "rh@lumen.example", "ativo"),
    ("Atlas Dados SA", "Atlas Dados", "Rafael Nunes", "talentos@atlas.example", "ativo"),
    ("Maré Labs Software LTDA", "Maré Labs", "Cláudia Sousa", "pessoas@marelabs.example", "a_vencer"),
    ("Bacuri Comunicação LTDA", "Bacuri Comunicação", "Igor Lima", "vagas@bacuri.example", "sem_convenio"),
    ("Pórtico Engenharia LTDA", "Pórtico Engenharia", "Helena Matos", "rh@portico.example", "ativo"),
    ("Silva & Rocha Advogados", "Silva & Rocha", "Marcos Rocha", "estagio@silvarocha.example", "ativo"),
]

GESTOR = {"email": "gestor.teia@undb.edu.br", "nome": "Ana Beatriz Gestora", "cargo": "Coordenadora do TEIA"}
ADMIN = {"email": "admin@undb.edu.br", "nome": "Administrador TEIA"}

# Vagas: prazo em dias a partir de hoje (None = sem prazo).
VAGAS = [
    {
        "empresa": "Lumen Tecnologia LTDA",
        "titulo": "Estágio em Desenvolvimento Front-end",
        "tipo": "estagio_nao_obrigatorio",
        "modalidade": "hibrido",
        "prazo_dias": 9,
        "periodo_minimo": 5,
        "disponibilidade_horario": "30h semanais, turno da tarde",
        "cursos": ["Engenharia de Software", "Sistemas de Informação"],
        "descricao": (
            "Apoiar o time de produto na construção de interfaces web da plataforma de "
            "agendamentos da Lumen. Você vai desenvolver componentes, participar de revisões "
            "de código e escrever testes, com acompanhamento de uma pessoa mentora."
        ),
        "competencias": [("React", True), ("TypeScript", True), ("Git", True), ("Testes automatizados", False)],
        "idiomas": [("ingles", 2, False)],
    },
    {
        "empresa": "Atlas Dados SA",
        "titulo": "Estágio em Análise de Dados",
        "tipo": "estagio_nao_obrigatorio",
        "modalidade": "remoto",
        "prazo_dias": 15,
        "periodo_minimo": 4,
        "disponibilidade_horario": "20h semanais",
        "cursos": ["Engenharia de Software", "Sistemas de Informação", "Administração"],
        "descricao": "Construir consultas e painéis para acompanhar indicadores de clientes do varejo.",
        "competencias": [("SQL", True), ("Python", False), ("Power BI", True), ("Comunicação", False)],
        "idiomas": [],
    },
    {
        "empresa": "Maré Labs Software LTDA",
        "titulo": "Desenvolvedor(a) Mobile Júnior",
        "tipo": "clt",
        "modalidade": "presencial",
        "prazo_dias": 20,
        "periodo_minimo": 7,
        "disponibilidade_horario": "40h semanais",
        "cursos": ["Engenharia de Software"],
        "descricao": "Desenvolver e manter aplicativos em React Native integrados a APIs REST.",
        "competencias": [("React Native", True), ("TypeScript", True), ("Git", True), ("Django", False)],
        "idiomas": [("ingles", 3, True)],
    },
    {
        "empresa": "Bacuri Comunicação LTDA",
        "titulo": "Estágio em Design de Interfaces",
        "tipo": "estagio_obrigatorio",
        "modalidade": "hibrido",
        "prazo_dias": 12,
        "periodo_minimo": None,
        "disponibilidade_horario": "Manhã",
        "cursos": [],  # aberta a qualquer curso
        "descricao": "Criar telas e protótipos para campanhas digitais de clientes locais.",
        "competencias": [("Figma", True), ("Comunicação", True), ("Trabalho em equipe", False)],
        "idiomas": [],
    },
    {
        "empresa": "Pórtico Engenharia LTDA",
        "titulo": "Estágio em Projetos de Edificações",
        "tipo": "estagio_obrigatorio",
        "modalidade": "presencial",
        "prazo_dias": 25,
        "periodo_minimo": 6,
        "disponibilidade_horario": "30h semanais",
        "cursos": ["Engenharia Civil"],
        "descricao": "Apoiar a elaboração e revisão de projetos e o acompanhamento de obras.",
        "competencias": [("AutoCAD", True), ("Excel", True), ("Trabalho em equipe", False)],
        "idiomas": [],
    },
    {
        "empresa": "Silva & Rocha Advogados",
        "titulo": "Estágio em Direito Empresarial",
        "tipo": "estagio_nao_obrigatorio",
        "modalidade": "presencial",
        "prazo_dias": None,
        "periodo_minimo": 5,
        "disponibilidade_horario": "Tarde",
        "cursos": ["Direito"],
        "descricao": "Pesquisa de jurisprudência, redação de peças e acompanhamento processual.",
        "competencias": [("Pesquisa jurídica", True), ("Atendimento ao público", False)],
        "idiomas": [],
    },
]

# Alunos de demonstração. O primeiro é o caso principal do protótipo.
ALUNOS = [
    {
        "email": "marina.costa@aluno.undb.edu.br",
        "nome": "Marina Costa",
        "matricula": "DEMO-001",
        "curso": "Engenharia de Software",
        "periodo": 6,
        "formacoes": [
            {"nivel": "graduacao", "instituicao": "UNDB", "curso": "Engenharia de Software", "inicio": "2023-02-01"},
        ],
        "experiencias": [
            {
                "tipo": "projeto",
                "organizacao": "UNDB",
                "funcao": "Desenvolvedora front-end",
                "descricao": "Projeto “Agenda Clínica-Escola”: agendamento web em React e TypeScript.",
                "inicio": "2025-03-01",
                "fim": "2025-12-01",
            },
        ],
        "competencias": [("React", 2), ("TypeScript", 2), ("Git", 3), ("JavaScript", 3), ("Comunicação", None)],
        "idiomas": [("ingles", 2)],
        "cursos": [{"nome": "Fundamentos de Testes de Software", "instituicao": "Curso online", "carga_horaria": 20}],
    },
    {
        "email": "joao.pereira@aluno.undb.edu.br",
        "nome": "João Pereira",
        "matricula": "DEMO-002",
        "curso": "Sistemas de Informação",
        "periodo": 4,
        "competencias": [("SQL", 2), ("Python", 1), ("Excel", 3)],
        "idiomas": [],
    },
    {
        "email": "lara.mendes@aluno.undb.edu.br",
        "nome": "Lara Mendes",
        "matricula": "DEMO-003",
        "curso": "Direito",
        "periodo": 7,
        "competencias": [("Pesquisa jurídica", 3), ("Atendimento ao público", 2)],
        "idiomas": [("espanhol", 2)],
    },
    {
        "email": "pedro.alves@aluno.undb.edu.br",
        "nome": "Pedro Alves",
        "matricula": "DEMO-004",
        "curso": "Engenharia Civil",
        "periodo": 6,
        "competencias": [("AutoCAD", 2), ("Excel", 2), ("Trabalho em equipe", None)],
        "idiomas": [],
    },
]
# Modelos de currículo por vaga (T2: "cada vaga tem um currículo").
# Toda vaga recebe os campos de perfil padrão (formulario_candidatura.CAMPOS_PERFIL_PADRAO),
# que saem preenchidos. Aqui ficam só os campos específicos de cada vaga, que saem em branco.
# Chave = título da vaga. Campo: (chave, rótulo, formato, obrigatório, ajuda)
# Formatos: texto, texto_longo, numero, sim_nao, url.
MODELOS_CURRICULO = {
    "Estágio em Desenvolvimento Front-end": {
        "instrucoes": "Seus dados do perfil já vieram preenchidos. Complete as perguntas da Lumen.",
        "campos": [
            ("portfolio", "Link do GitHub ou portfólio", "url", True, "Ex.: https://github.com/seu-usuario"),
            ("projeto_destaque", "Conte sobre um projeto front-end seu", "texto_longo", True,
             "O que você construiu, com quais tecnologias e qual foi a sua parte."),
            ("disponibilidade_tarde", "Pode estagiar no turno da tarde?", "sim_nao", True, ""),
        ],
    },
    "Estágio em Análise de Dados": {
        "instrucoes": "Complete as perguntas da Atlas Dados. O estágio é remoto.",
        "campos": [
            ("experiencia_dados", "Já analisou dados em algum projeto? Conte como foi.", "texto_longo", True,
             "Pode ser trabalho da faculdade: qual era a pergunta, a ferramenta e o resultado."),
            ("horas_semanais", "Quantas horas por semana você tem disponíveis?", "numero", True, "A vaga pede 20h."),
            ("painel_link", "Link de um painel ou notebook seu (opcional)", "url", False, ""),
        ],
    },
    "Desenvolvedor(a) Mobile Júnior": {
        "instrucoes": "Vaga CLT presencial. Responda às perguntas da Maré Labs.",
        "campos": [
            ("portfolio", "Link do GitHub ou de um app publicado", "url", True, ""),
            ("app_destaque", "Descreva um app que você desenvolveu", "texto_longo", True,
             "Plataforma, bibliotecas usadas e o que você faria diferente hoje."),
            ("pretensao_salarial", "Pretensão salarial (R$)", "numero", False, ""),
            ("presencial", "Pode trabalhar presencialmente em São Luís?", "sim_nao", True, ""),
        ],
    },
    "Estágio em Design de Interfaces": {
        "instrucoes": "Estágio obrigatório, aberto a qualquer curso. Mostre seu trabalho.",
        "campos": [
            ("portfolio", "Link do portfólio (Behance, Figma, site)", "url", True, ""),
            ("motivacao", "Por que você quer estagiar com design de interfaces?", "texto_longo", True, ""),
            ("turno_manha", "Pode estagiar pela manhã?", "sim_nao", True, ""),
        ],
    },
    "Estágio em Projetos de Edificações": {
        "instrucoes": "Estágio obrigatório presencial na Pórtico Engenharia.",
        "campos": [
            ("disciplinas", "Disciplinas de projeto que você já cursou", "texto_longo", True,
             "Ex.: Desenho Técnico, Projeto Arquitetônico, Estruturas."),
            ("visita_obra", "Já acompanhou alguma obra? Conte como foi.", "texto_longo", False, ""),
            ("cnh", "Tem CNH categoria B?", "sim_nao", False, "Ajuda nas visitas a obras, mas não é obrigatório."),
        ],
    },
    "Estágio em Direito Empresarial": {
        "instrucoes": "Responda às perguntas do Silva & Rocha Advogados.",
        "campos": [
            ("area_interesse", "Qual área do direito empresarial mais te interessa e por quê?", "texto_longo", True, ""),
            ("oab", "Já fez ou pretende fazer o exame da OAB neste ano?", "sim_nao", False, ""),
            ("turno_tarde", "Pode estagiar no turno da tarde?", "sim_nao", True, ""),
        ],
    },
}
