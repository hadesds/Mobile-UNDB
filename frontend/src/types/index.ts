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

/** Resultado por requisito (ainda simulado: o motor de compatibilidade não existe no backend). */
export type StatusRequisito = "encontrado" | "nao_identificado" | "diferente";

export type ItemAnalise = {
  requisito: string;
  categoria: string;
  status: StatusRequisito;
  detalhe: string;
};

export type Analise = {
  vagaId: number;
  criadaEm: string;
  itens: ItemAnalise[];
};