export type Perfil = "aluno" | "gestor" | "admin";

export type Usuario = {
  id: number;
  email: string;
  nome: string;
  perfil: Perfil;
  aluno: null | {
    id: number;
    matricula: string;
    curso: { id: number; nome: string };
    periodo: number;
    consentimento_vigente: boolean;
    consentimento_lgpd_em?: string | null;
  };
  gestor: null | { id: number; nucleo: { id: number; nome: string }; cargo: string };
};

export type Tokens = { access: string; refresh: string };
export type RespostaLogin = Tokens & { usuario: Usuario };

export type Curso = { id: number; nome: string; total_periodos: number };

export type Paginado<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type TipoVaga = "estagio_obrigatorio" | "estagio_nao_obrigatorio" | "clt";
export type Modalidade = "presencial" | "remoto" | "hibrido";

export type RequisitoCompetencia = {
  id: number;
  competencia: number;
  competencia_nome: string;
  obrigatorio: boolean;
};

export type RequisitoIdioma = {
  id: number;
  idioma: string;
  nivel_minimo: number;
  obrigatorio: boolean;
};

/** Vaga como o aluno recebe da API (VagaAlunoSerializer). */
export type Vaga = {
  id: number;
  titulo: string;
  empresa: string;
  tipo: TipoVaga;
  modalidade: Modalidade;
  descricao: string;
  prazo: string | null;
  cursos: Curso[];
  periodo_minimo: number | null;
  disponibilidade_horario: string;
  requisitos_competencia: RequisitoCompetencia[];
  requisitos_idioma: RequisitoIdioma[];
};

/** Resultado por requisito, como o motor de compatibilidade do backend devolve. */
export type StatusRequisito = "encontrado" | "nao_identificado" | "diferente";
export type Faixa = "alta" | "media" | "baixa";

export type ItemAnalise = {
  requisito: string;
  categoria: string;
  tipo?: string;
  status: StatusRequisito;
  detalhe: string;
  obrigatorio?: boolean;
};

export type AnaliseResumo = { id: number; score: number; faixa: Faixa; criada_em: string };

export type Analise = AnaliseResumo & {
  itens: ItemAnalise[];
  feedback_texto: string;
  versao_motor: string;
};

export type StatusCandidatura = "analisada" | "encaminhada" | "em_processo" | "nao_selecionada";

export type VagaResumo = Pick<Vaga, "id" | "titulo" | "empresa" | "tipo" | "modalidade" | "prazo">;

export type CandidaturaResumo = {
  id: number;
  vaga: VagaResumo;
  status: StatusCandidatura;
  analise: AnaliseResumo | null;
  criada_em: string;
  atualizada_em: string;
};

export type Candidatura = Omit<CandidaturaResumo, "analise"> & {
  analise: Analise | null;
  historico: AnaliseResumo[];
  encaminhada_em: string | null;
};

// ---- Currículo (perfil de competências) -----------------------------------

export type NivelFormacao =
  | "medio"
  | "tecnico"
  | "graduacao"
  | "especializacao"
  | "mestrado"
  | "doutorado";

export type TipoExperiencia = "estagio" | "emprego" | "projeto" | "voluntariado" | "academica";

export type Formacao = {
  id: number;
  nivel: NivelFormacao;
  instituicao: string;
  curso: string;
  inicio: string | null;
  fim: string | null;
};

export type Experiencia = {
  id: number;
  tipo: TipoExperiencia;
  organizacao: string;
  funcao: string;
  descricao: string;
  inicio: string | null;
  fim: string | null;
};

export type CompetenciaPerfil = {
  id: number;
  competencia: number;
  competencia_nome: string;
  nivel: 1 | 2 | 3 | null;
};

export type IdiomaPerfil = { id: number; idioma: string; nivel: 1 | 2 | 3 | 4 };

export type CursoComplementar = {
  id: number;
  nome: string;
  instituicao: string;
  carga_horaria: number | null;
  concluido_em: string | null;
};

export type SecaoCurriculo = "formacoes" | "experiencias" | "competencias" | "idiomas" | "cursos";

export type Curriculo = {
  id: number;
  completude: number;
  secoes: Record<"formacao" | "experiencias" | "competencias" | "idiomas" | "cursos", boolean>;
  formacoes: Formacao[];
  experiencias: Experiencia[];
  competencias: CompetenciaPerfil[];
  idiomas: IdiomaPerfil[];
  cursos: CursoComplementar[];
  arquivo: ArquivoCurriculo | null;
  atualizado_em: string;
};

// ---- Importação do currículo em arquivo ------------------------------------

export type ArquivoCurriculo = {
  nome_original: string;
  tipo: "pdf" | "docx";
  tamanho: number;
  paginas: number | null;
  enviado_em: string;
};

/** Campos comuns a toda sugestão: de onde veio, o que falta e se já está no perfil. */
type Sugerida = { trecho: string; ja_existe: boolean };
type Completavel = Sugerida & { faltando: string[] };

export type SugestaoFormacao = Completavel & Omit<Formacao, "id">;
export type SugestaoExperiencia = Completavel & Omit<Experiencia, "id">;
export type SugestaoCurso = Completavel & Omit<CursoComplementar, "id">;
export type SugestaoCompetencia = Sugerida & {
  competencia: number;
  competencia_nome: string;
  categoria: string;
  nivel: number | null;
  /** "secao": listada em Competências/Habilidades; "texto": citada em outra parte. */
  origem: "secao" | "texto";
};
export type SugestaoIdioma = Sugerida & { idioma: string; nivel: number; nivel_informado: boolean };

export type SugestoesCurriculo = {
  formacoes: SugestaoFormacao[];
  experiencias: SugestaoExperiencia[];
  competencias: SugestaoCompetencia[];
  idiomas: SugestaoIdioma[];
  cursos: SugestaoCurso[];
  contato: { email: string | null; telefone: string | null; linkedin: string | null; github: string | null };
  termos_nao_reconhecidos: string[];
  secoes_encontradas: string[];
};

export type LeituraCurriculo = { arquivo: ArquivoCurriculo; texto: string; sugestoes: SugestoesCurriculo };

export type ResultadoImportacao = {
  criados: Record<SecaoCurriculo, number>;
  ignorados: number;
  erros: { secao: SecaoCurriculo; indice: number | null; erros: Record<string, unknown> }[];
  perfil: Curriculo;
};

export type Competencia = { id: number; nome: string; categoria: string };

// ---- Gestor do TEIA ---------------------------------------------------------

export type StatusVaga = "rascunho" | "aberta" | "encerrada";

/** Vaga como o gestor recebe (VagaSerializer): ids para editar e contagem de candidaturas. */
export type VagaGestor = {
  id: number;
  empresa: number;
  empresa_nome: string;
  gestor: number;
  candidaturas: { total: number; aguardando: number };
  titulo: string;
  tipo: TipoVaga;
  modalidade: Modalidade;
  descricao: string;
  prazo: string | null;
  status: StatusVaga;
  cursos: number[];
  periodo_minimo: number | null;
  disponibilidade_horario: string;
  requisitos_competencia: RequisitoCompetencia[];
  requisitos_idioma: RequisitoIdioma[];
  criada_em: string;
  atualizada_em: string;
};

export type AlunoResumo = {
  id: number;
  nome: string;
  email: string;
  matricula: string;
  curso: string;
  periodo: number;
  consentimento_vigente: boolean;
};

export type Encaminhamento = { observacao: string; criado_em: string; gestor: string };

export type Candidato = {
  id: number;
  aluno: AlunoResumo;
  status: StatusCandidatura;
  analise: Analise | null;
  encaminhamento: Encaminhamento | null;
  criada_em: string;
  atualizada_em: string;
};

export type CandidatoDetalhe = Candidato & {
  vaga: VagaResumo;
  historico: AnaliseResumo[];
  curriculo: Curriculo | null;
};

export type RequisitoOrdem = { requisito: string; tipo: string; obrigatorio: boolean };

export type Triagem = {
  requisitos: RequisitoOrdem[];
  contagem: Record<StatusCandidatura, number>;
  candidatos: Candidato[];
};

export type VagaFila = {
  id: number;
  titulo: string;
  empresa: string;
  prazo: string | null;
  aguardando: number;
  total: number | null;
};

export type PainelGestor = {
  vagas_abertas: number;
  rascunhos: number;
  aguardando: number;
  aguardando_desde: string | null;
  encaminhadas_30d: number;
  vencendo: VagaFila[];
  fila: VagaFila[];
  recentes: {
    id: number;
    aluno: string;
    vaga: { id: number; titulo: string };
    score: number | null;
    status: StatusCandidatura;
    criada_em: string;
    requisitos: RequisitoOrdem[];
    itens: ItemAnalise[];
  }[];
};

// ---- Administração ----------------------------------------------------------

export type ConvenioStatus = "sem_convenio" | "ativo" | "a_vencer" | "vencido";

export type Empresa = {
  id: number;
  nome: string;
  nome_fantasia: string;
  contato_nome: string;
  contato_email: string;
  contato_telefone: string;
  convenio_status: ConvenioStatus;
  ativa: boolean;
  criada_em: string;
};

export type UsuarioAdmin = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  detalhe:
    | null
    | { matricula: string; curso: string; periodo: number; consentimento_vigente: boolean }
    | { cargo: string; nucleo: string };
  date_joined: string;
  last_login: string | null;
};

export type Nucleo = { id: number; nome: string };

export type CategoriaCompetencia = "tecnica" | "ferramenta" | "comportamental";

export type CompetenciaAdmin = {
  id: number;
  nome: string;
  categoria: CategoriaCompetencia;
  ativa: boolean;
  sinonimos: string[];
  em_uso: { alunos: number; vagas: number };
};

export type CursoAdmin = {
  id: number;
  nome: string;
  faculdade: number;
  total_periodos: number;
  ativo: boolean;
  alunos: number;
};

export type ResumoAdmin = {
  usuarios: { alunos: number; gestores: number; admins: number; inativos: number };
  lgpd: { com_termo: number; sem_termo: number };
  vagas: { abertas: number; rascunhos: number; encerradas: number };
  candidaturas: Record<StatusCandidatura, number>;
  empresas: { ativas: number; convenio_a_vencer: number; convenio_vencido: number };
  catalogo: { competencias: number; cursos: number };
};
