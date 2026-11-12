import type { Candidatura, FormularioCandidatura, RespostasFormulario } from "../types";
import { errosDasRespostas, validarObrigatorios } from "../utils/formularioCandidatura";
import { criarRascunhosCandidatura, modeloDoFormulario, restaurarRespostas } from "./rascunhoCandidatura";

type Destino = { id: number; recemCriada?: boolean; resultado?: Candidatura };
type Dependencias = {
  buscarFormulario: (id: number) => Promise<FormularioCandidatura>;
  candidatar: (vaga: number, respostas: RespostasFormulario) => Promise<Candidatura>;
  rascunhos: ReturnType<typeof criarRascunhosCandidatura>;
  abrirResultado: (destino: Destino) => void;
};
type Estado = {
  formulario: FormularioCandidatura | null;
  respostas: RespostasFormulario;
  erros: Record<string, string>;
  erro: string | null;
  aviso: string | null;
  carregando: boolean;
  enviando: boolean;
  confirmando: boolean;
};

/** Fluxo específico da tela; separa a coordenação de API/rascunho dos controles visuais. */
export class FluxoCandidatura {
  private estado: Estado = {
    formulario: null, respostas: {}, erros: {}, erro: null, aviso: null,
    carregando: true, enviando: false, confirmando: false,
  };
  private ouvintes = new Set<() => void>();
  private concluido = false;
  private ocupado = false;

  constructor(private usuario: number, private vaga: number, private deps: Dependencias) {}

  snapshot = () => this.estado;
  assinar = (ouvinte: () => void) => {
    this.ouvintes.add(ouvinte);
    return () => { this.ouvintes.delete(ouvinte); };
  };
  private atualizar(dados: Partial<Estado>) {
    this.estado = { ...this.estado, ...dados };
    this.ouvintes.forEach((ouvinte) => ouvinte());
  }
  private salvar() {
    const { formulario, respostas } = this.estado;
    if (!formulario) return Promise.resolve();
    return this.deps.rascunhos.salvar(this.usuario, this.vaga, { ...modeloDoFormulario(formulario), respostas });
  }
  private async concluir(destino: Destino) {
    this.concluido = true;
    try {
      await this.deps.rascunhos.limpar(this.usuario, this.vaga);
    } catch {
      // A limpeza local não desfaz a confirmação do backend nem libera outro envio.
      this.atualizar({ aviso: "Candidatura confirmada. A limpeza do rascunho será tentada ao reabrir esta vaga." });
    }
    this.deps.abrirResultado(destino);
  }

  async carregar() {
    if (this.ocupado || this.concluido) return;
    this.ocupado = true;
    this.atualizar({ carregando: true, erro: null });
    try {
      const rascunho = await this.deps.rascunhos.carregar(this.usuario, this.vaga);
      const formulario = await this.deps.buscarFormulario(this.vaga);
      if (formulario.candidatura !== null) {
        await this.concluir({ id: formulario.candidatura });
        return;
      }
      const mudou = rascunho && JSON.stringify(modeloDoFormulario(formulario)) !== JSON.stringify({ instrucoes: rascunho.instrucoes, campos: rascunho.campos });
      this.atualizar({ formulario, respostas: restaurarRespostas(formulario, rascunho), aviso: mudou
        ? "O formulário da vaga mudou. Revise as perguntas antes de enviar; respostas compatíveis foram mantidas."
        : rascunho ? "Seu rascunho foi restaurado. Revise as respostas antes de enviar." : null });
    } catch (e) {
      this.atualizar({ erro: e instanceof Error ? e.message : "Não foi possível carregar o formulário." });
    } finally {
      this.ocupado = false;
      this.atualizar({ carregando: false });
    }
  }

  alterar(chave: string, valor: string) {
    if (this.ocupado || this.concluido || !this.estado.formulario?.campos.some((c) => c.chave === chave)) return;
    this.atualizar({ respostas: { ...this.estado.respostas, [chave]: valor }, erros: { ...this.estado.erros, [chave]: "" } });
    void this.salvar().catch(() => this.atualizar({ erro: "Não foi possível salvar o rascunho. Mantenha esta tela aberta e tente novamente antes de sair." }));
  }
  revisar() {
    if (this.ocupado || this.concluido || !this.estado.formulario) return;
    const erros = validarObrigatorios(this.estado.formulario.campos, this.estado.respostas);
    this.atualizar({ erros, erro: Object.keys(erros).length ? "Preencha os campos obrigatórios indicados abaixo." : null, confirmando: !Object.keys(erros).length });
  }
  cancelar() {
    if (!this.ocupado) this.atualizar({ confirmando: false });
  }
  async descartar() {
    if (this.ocupado || this.concluido) return;
    this.ocupado = true;
    this.atualizar({ enviando: true, erro: null });
    try {
      await this.deps.rascunhos.limpar(this.usuario, this.vaga);
      this.atualizar({ respostas: restaurarRespostas(this.estado.formulario!, null), erros: {}, aviso: "Rascunho descartado.", confirmando: false });
    } catch (e) {
      this.atualizar({ erro: e instanceof Error ? e.message : "Não foi possível descartar o rascunho." });
    } finally {
      this.ocupado = false;
      this.atualizar({ enviando: false });
    }
  }
  async enviar() {
    if (this.ocupado || this.concluido || !this.estado.confirmando || !this.estado.formulario) return;
    this.ocupado = true;
    this.atualizar({ enviando: true, erro: null });
    try {
      // Persiste antes de qualquer chamada que possa encerrar a sessão por 401.
      await this.salvar();
      const atual = await this.deps.buscarFormulario(this.vaga);
      if (atual.candidatura !== null) {
        await this.concluir({ id: atual.candidatura });
        return;
      }
      if (JSON.stringify(modeloDoFormulario(atual)) !== JSON.stringify(modeloDoFormulario(this.estado.formulario))) {
        const respostas = restaurarRespostas(atual, { ...modeloDoFormulario(this.estado.formulario), respostas: this.estado.respostas });
        this.atualizar({ formulario: atual, respostas, erros: {}, aviso: "O formulário da vaga mudou. Revise as perguntas antes de enviar; respostas compatíveis foram mantidas." });
        await this.salvar();
        return;
      }
      const resultado = await this.deps.candidatar(this.vaga, this.estado.respostas);
      await this.concluir({ id: resultado.id, recemCriada: true, resultado });
    } catch (e) {
      const erros = errosDasRespostas(e && typeof e === "object" && "data" in e ? e.data : null);
      this.atualizar({ erros, erro: Object.keys(erros).length
        ? "Revise as respostas indicadas abaixo. Seus dados foram mantidos."
        : `${e instanceof Error ? e.message : "Não foi possível enviar a candidatura."} Seus dados foram mantidos. Tente novamente.` });
    } finally {
      this.ocupado = false;
      this.atualizar({ confirmando: false, enviando: false });
    }
  }
}
