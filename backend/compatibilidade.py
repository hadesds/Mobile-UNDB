"""Motor de compatibilidade por regras (perfil do aluno x requisitos da vaga).

PROVISÓRIO: o cálculo, os pesos e as faixas ainda serão validados com o TEIA.
Cada requisito cadastrado vale o mesmo peso; o score é a fração com evidência.
O resultado orienta o aluno e o gestor: nunca aprova nem elimina ninguém.
"""

from django.db import transaction

from backend.models import (
    Analise,
    Candidatura,
    NivelIdioma,
    NivelProficiencia,
    PerfilCompetencias,
    Vaga,
    normalizar_termo,
)

VERSAO_MOTOR = "regras-0.2"

ENCONTRADO = "encontrado"
DIFERENTE = "diferente"
NAO_IDENTIFICADO = "nao_identificado"


def _item(requisito, categoria, tipo, status, detalhe, obrigatorio=True):
    return {
        "requisito": requisito,
        "categoria": categoria,
        "tipo": tipo,
        "status": status,
        "detalhe": detalhe,
        "obrigatorio": obrigatorio,
    }


def _evidencia_competencia(perfil, nome: str) -> str | None:
    """Procura a competência citada em experiências ou cursos complementares."""
    chave = normalizar_termo(nome)
    for exp in perfil.experiencias.all():
        texto = normalizar_termo(f"{exp.funcao} {exp.descricao}")
        if chave in texto:
            return f"{exp.funcao} · {exp.organizacao}"
    for curso in perfil.cursos.all():
        if chave in normalizar_termo(curso.nome):
            return f"Curso: {curso.nome}"
    return None


def avaliar(aluno, vaga: Vaga) -> list[dict]:
    perfil, _ = PerfilCompetencias.objects.get_or_create(aluno=aluno)
    itens: list[dict] = []

    cursos = list(vaga.cursos.all())
    if cursos:
        aceito = any(c.id == aluno.curso_id for c in cursos)
        itens.append(
            _item(
                "Curso",
                "Formação",
                "curso",
                ENCONTRADO if aceito else DIFERENTE,
                f"Seu curso: {aluno.curso.nome}"
                if aceito
                else f"A vaga aceita {', '.join(c.nome for c in cursos)}. Seu curso: {aluno.curso.nome}.",
            )
        )

    if vaga.periodo_minimo:
        ok = aluno.periodo >= vaga.periodo_minimo
        itens.append(
            _item(
                "Semestre mínimo",
                "Formação",
                "periodo",
                ENCONTRADO if ok else DIFERENTE,
                f"Pedido: a partir do {vaga.periodo_minimo}º · informado: {aluno.periodo}º semestre",
            )
        )

    do_perfil = {
        c.competencia_id: c for c in perfil.competencias.select_related("competencia")
    }
    for req in vaga.requisitos_competencia.select_related("competencia"):
        nome = req.competencia.nome
        registrada = do_perfil.get(req.competencia_id)
        evidencia = _evidencia_competencia(perfil, nome)
        if registrada or evidencia:
            partes = []
            if registrada:
                nivel = (
                    f" ({NivelProficiencia(registrada.nivel).label.lower()})"
                    if registrada.nivel
                    else ""
                )
                partes.append(f"Nas suas competências{nivel}")
            if evidencia:
                partes.append(f"Evidência: {evidencia}")
            itens.append(
                _item(nome, "Competência", "competencia", ENCONTRADO, ". ".join(partes) + ".", req.obrigatorio)
            )
        else:
            itens.append(
                _item(
                    nome,
                    "Competência",
                    "competencia",
                    NAO_IDENTIFICADO,
                    "Não encontramos registro no seu currículo. Se você tem essa competência, "
                    "adicione-a e associe a um projeto ou experiência.",
                    req.obrigatorio,
                )
            )

    idiomas = {i.idioma: i.nivel for i in perfil.idiomas.all()}
    for req in vaga.requisitos_idioma.all():
        rotulo = req.get_idioma_display()
        pedido = NivelIdioma(req.nivel_minimo).label
        informado = idiomas.get(req.idioma)
        if informado is None:
            status, detalhe = NAO_IDENTIFICADO, f"Pedido: {pedido} · não informado no currículo"
        else:
            status = ENCONTRADO if informado >= req.nivel_minimo else DIFERENTE
            detalhe = f"Pedido: {pedido} · informado: {NivelIdioma(informado).label}"
        itens.append(_item(rotulo, "Idioma", "idioma", status, detalhe, req.obrigatorio))

    return itens


def _snapshot(aluno) -> dict:
    perfil = aluno.perfil_competencias
    return {
        "curso": aluno.curso.nome,
        "periodo": aluno.periodo,
        "competencias": [c.competencia.nome for c in perfil.competencias.select_related("competencia")],
        "idiomas": {i.idioma: i.nivel for i in perfil.idiomas.all()},
        "experiencias": perfil.experiencias.count(),
        "cursos": perfil.cursos.count(),
    }


def _feedback(itens: list[dict]) -> str:
    pendentes = [i["requisito"] for i in itens if i["status"] != ENCONTRADO]
    if not pendentes:
        return "Todos os requisitos cadastrados têm evidência no seu currículo."
    return "Para fortalecer a candidatura, revise: " + ", ".join(pendentes) + "."


@transaction.atomic
def analisar(candidatura: Candidatura) -> Analise:
    """Gera uma nova análise (as anteriores ficam como histórico)."""
    itens = avaliar(candidatura.aluno, candidatura.vaga)
    total = len(itens)
    atendidos = [i for i in itens if i["status"] == ENCONTRADO]
    score = round(100 * len(atendidos) / total) if total else 0
    return Analise.objects.create(
        candidatura=candidatura,
        score=score,
        requisitos_atendidos=atendidos,
        requisitos_faltantes=[i for i in itens if i["status"] != ENCONTRADO],
        feedback_texto=_feedback(itens),
        perfil_snapshot=_snapshot(candidatura.aluno),
        versao_motor=VERSAO_MOTOR,
    )
