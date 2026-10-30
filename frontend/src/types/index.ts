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
  atualizado_em: string;
};

export type Competencia = { id: number; nome: string; categoria: string };
