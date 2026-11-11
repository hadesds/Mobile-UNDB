"""Formulário de candidatura montado a partir do modelo de currículo da vaga.

Fluxo:
1. App abre a vaga -> GET vagas/{id}/formulario/ -> `montar_formulario`:
   campos de perfil vêm preenchidos com os dados do aluno, campos da vaga em branco.
2. Aluno revisa/edita e envia -> POST candidaturas/ {vaga, respostas: {chave: valor}}
   -> `validar_respostas` + `salvar_respostas`.

Valores trafegam SEMPRE como texto (listas viram uma linha por item). Assim o app
desenha tudo com campo de texto e o formato (`formato`) só muda o teclado/estilo.
Formato combinado com o frontend (Ana Vitória): ver docs/api.md, seção
"Formulário de candidatura".
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from django.db import transaction

from backend.models import (
    CampoModelo,
    ModeloCurriculo,
    NivelIdioma,
    NivelProficiencia,
    PerfilCompetencias,
    RespostaCandidatura,
)

Fonte = CampoModelo.FontePerfil
Origem = CampoModelo.Origem
Formato = CampoModelo.Formato

LIMITE_VALOR = 5000  # caracteres por resposta

# Campos que toda vaga ganha quando ainda não tem modelo próprio (vaga criada pelo
# gestor no app, por exemplo). O gestor pode acrescentar perguntas no admin.
# (chave, rótulo, fonte, formato, obrigatório)
CAMPOS_PERFIL_PADRAO = [
    ("nome", "Nome completo", Fonte.NOME, Formato.TEXTO, True),
    ("email", "E-mail institucional", Fonte.EMAIL, Formato.TEXTO, True),
    ("curso", "Curso", Fonte.CURSO, Formato.TEXTO, True),
    ("periodo", "Semestre atual", Fonte.PERIODO, Formato.NUMERO, True),
    ("formacao", "Formação", Fonte.FORMACAO, Formato.TEXTO_LONGO, False),
    ("experiencias", "Experiências", Fonte.EXPERIENCIAS, Formato.TEXTO_LONGO, False),
    ("competencias", "Competências", Fonte.COMPETENCIAS, Formato.TEXTO_LONGO, False),
    ("idiomas", "Idiomas", Fonte.IDIOMAS, Formato.TEXTO_LONGO, False),
    (
        "cursos_complementares",
        "Cursos complementares",
        Fonte.CURSOS_COMPLEMENTARES,
        Formato.TEXTO_LONGO,
        False,
    ),
]


# ---------------------------------------------------------------------------
# Valores do perfil
# ---------------------------------------------------------------------------


def _mes_ano(data) -> str:
    return data.strftime("%m/%Y") if data else ""


def _periodo(inicio, fim, aberto="atual") -> str:
    if not inicio and not fim:
        return ""
    return f"{_mes_ano(inicio) or '?'} – {_mes_ano(fim) or aberto}"


def _formacao(perfil) -> str:
    linhas = []
    for f in perfil.formacoes.all():
        periodo = _periodo(f.inicio, f.fim, "em andamento")
        linhas.append(
            f"{f.get_nivel_display()} em {f.curso} · {f.instituicao}"
            + (f" ({periodo})" if periodo else "")
        )
    return "\n".join(linhas)


def _experiencias(perfil) -> str:
    linhas = []
    for e in perfil.experiencias.all():
        detalhes = ", ".join(p for p in [e.get_tipo_display(), _periodo(e.inicio, e.fim)] if p)
        linha = f"{e.funcao} · {e.organizacao} ({detalhes})"
        if e.descricao:
            linha += f": {e.descricao}"
        linhas.append(linha)
    return "\n".join(linhas)


def _competencias(perfil) -> str:
    itens = []
    for c in perfil.competencias.select_related("competencia").order_by("competencia__nome"):
        nivel = f" ({NivelProficiencia(c.nivel).label.lower()})" if c.nivel else ""
        itens.append(f"{c.competencia.nome}{nivel}")
    return "\n".join(itens)


def _idiomas(perfil) -> str:
    return "\n".join(
        f"{i.get_idioma_display()} ({NivelIdioma(i.nivel).label.lower()})"
        for i in perfil.idiomas.all()
    )


def _cursos(perfil) -> str:
    linhas = []
    for c in perfil.cursos.all():
        partes = [c.nome]
        if c.instituicao:
            partes.append(c.instituicao)
        linha = " · ".join(partes)
        if c.carga_horaria:
            linha += f" ({c.carga_horaria}h)"
        linhas.append(linha)
    return "\n".join(linhas)


# fonte -> função(aluno, perfil) -> texto
FONTES = {
    Fonte.NOME: lambda aluno, perfil: aluno.usuario.nome,
    Fonte.EMAIL: lambda aluno, perfil: aluno.usuario.email,
    Fonte.MATRICULA: lambda aluno, perfil: aluno.matricula,
    Fonte.CURSO: lambda aluno, perfil: aluno.curso.nome,
    Fonte.PERIODO: lambda aluno, perfil: str(aluno.periodo),
    Fonte.FORMACAO: lambda aluno, perfil: _formacao(perfil),
    Fonte.EXPERIENCIAS: lambda aluno, perfil: _experiencias(perfil),
    Fonte.COMPETENCIAS: lambda aluno, perfil: _competencias(perfil),
    Fonte.IDIOMAS: lambda aluno, perfil: _idiomas(perfil),
    Fonte.CURSOS_COMPLEMENTARES: lambda aluno, perfil: _cursos(perfil),
}


def valores_do_perfil(aluno, campos) -> dict[str, str]:
    """{chave: valor sugerido} para os campos de origem perfil."""
    perfil, _ = PerfilCompetencias.objects.get_or_create(aluno=aluno)
    return {
        c.chave: FONTES[c.fonte_perfil](aluno, perfil)
        for c in campos
        if c.origem == Origem.PERFIL and c.fonte_perfil in FONTES
    }


# ---------------------------------------------------------------------------
# Modelo da vaga
# ---------------------------------------------------------------------------


@transaction.atomic
def modelo_da_vaga(vaga) -> ModeloCurriculo:
    """O modelo da vaga; se ela ainda não tem, cria um só com os campos de perfil."""
    modelo, criado = ModeloCurriculo.objects.get_or_create(vaga=vaga)
    if criado:
        CampoModelo.objects.bulk_create(
            [
                CampoModelo(
                    modelo=modelo,
                    chave=chave,
                    rotulo=rotulo,
                    origem=Origem.PERFIL,
                    fonte_perfil=fonte,
                    formato=formato,
                    obrigatorio=obrigatorio,
                    ordem=i,
                )
                for i, (chave, rotulo, fonte, formato, obrigatorio) in enumerate(
                    CAMPOS_PERFIL_PADRAO
                )
            ]
        )
    return modelo


def montar_formulario(aluno, vaga, candidatura=None) -> dict:
    """Formulário pronto para o app.

    Se o aluno já se candidatou, os valores vêm do que ele enviou (somente leitura
    no app); senão, perfil preenchido e campos da vaga em branco.
    """
    modelo = modelo_da_vaga(vaga)
    campos = list(modelo.campos.all())
    sugeridos = valores_do_perfil(aluno, campos)
    enviados = (
        {r.chave: r.valor for r in candidatura.respostas.all()} if candidatura else {}
    )
    return {
        "vaga": vaga.id,
        "instrucoes": modelo.instrucoes,
        "candidatura": candidatura.id if candidatura else None,
        "campos": [
            {
                "chave": c.chave,
                "rotulo": c.rotulo,
                "ajuda": c.ajuda,
                "origem": c.origem,
                "formato": c.formato,
                "obrigatorio": c.obrigatorio,
                "valor": enviados.get(c.chave, "")
                if candidatura
                else sugeridos.get(c.chave, ""),
                # True = veio do perfil (o app mostra como preenchido e editável).
                "autopreenchido": c.origem == Origem.PERFIL,
            }
            for c in campos
        ],
    }


# ---------------------------------------------------------------------------
# Respostas enviadas
# ---------------------------------------------------------------------------


class RespostasInvalidas(Exception):
    def __init__(self, erros: dict[str, str]):
        super().__init__(erros)
        self.erros = erros


def _erro_formato(campo, valor: str) -> str | None:
    if not valor:
        return None
    if campo.formato == Formato.NUMERO:
        try:
            float(valor.replace(",", "."))
        except ValueError:
            return "Informe um número."
    elif campo.formato == Formato.SIM_NAO and valor not in ("sim", "nao"):
        return 'Use "sim" ou "nao".'
    elif campo.formato == Formato.URL:
        try:
            URLValidator()(valor)
        except DjangoValidationError:
            return "Informe um link válido (com https://)."
    return None


def validar_respostas(aluno, modelo, respostas: dict | None) -> list[dict]:
    """Confere as respostas e devolve as linhas a gravar (uma por campo do modelo).

    `respostas=None` = app antigo, que ainda não manda o formulário: campos de
    perfil são gravados com o valor do perfil e os da vaga ficam vazios, sem
    exigir obrigatórios.
    TODO(Ana Vitória/Hades): quando a tela de candidatura estiver no ar, tornar
    `respostas` obrigatório em NovaCandidaturaSerializer e apagar esse caminho.

    Campos de perfil que não vierem em `respostas` usam o valor do perfil.
    Levanta RespostasInvalidas({chave: mensagem}).
    """
    campos = list(modelo.campos.all())
    sugeridos = valores_do_perfil(aluno, campos)
    modo_antigo = respostas is None
    respostas = respostas or {}

    erros: dict[str, str] = {}
    conhecidas = {c.chave for c in campos}
    for chave in respostas:
        if chave not in conhecidas:
            erros[chave] = "Campo não existe no formulário desta vaga."

    linhas = []
    for c in campos:
        sugerido = sugeridos.get(c.chave, "")
        if c.chave in respostas:
            valor = str(respostas[c.chave] if respostas[c.chave] is not None else "").strip()
        else:
            valor = sugerido if c.origem == Origem.PERFIL else ""

        if len(valor) > LIMITE_VALOR:
            erros[c.chave] = f"Use no máximo {LIMITE_VALOR} caracteres."
        elif c.obrigatorio and not valor and not modo_antigo:
            erros[c.chave] = "Campo obrigatório."
        elif (msg := _erro_formato(c, valor)) is not None:
            erros[c.chave] = msg

        linhas.append(
            {
                "campo": c,
                "chave": c.chave,
                "rotulo": c.rotulo,
                "origem": c.origem,
                "valor": valor,
                "editado": c.origem == Origem.PERFIL and valor != sugerido.strip(),
                "ordem": c.ordem,
            }
        )

    if erros:
        raise RespostasInvalidas(erros)
    return linhas


def salvar_respostas(candidatura, linhas: list[dict]) -> None:
    RespostaCandidatura.objects.bulk_create(
        [RespostaCandidatura(candidatura=candidatura, **linha) for linha in linhas]
    )
