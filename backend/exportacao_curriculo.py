"""Currículo padronizado, gerado em memória com o perfil atual do aluno."""

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from .formulario_candidatura import _competencias, _cursos, _experiencias, _formacao, _idiomas

SECOES = {
    "formacoes": ("Formação acadêmica", _formacao),
    "experiencias": ("Experiências e projetos", _experiencias),
    "competencias": ("Competências", _competencias),
    "idiomas": ("Idiomas", _idiomas),
    "cursos": ("Cursos complementares", _cursos),
}


def gerar_pdf(perfil, secoes) -> BytesIO:
    aluno = perfil.aluno
    saida = BytesIO()
    marca = colors.HexColor("#17685B")
    corpo = ParagraphStyle("Corpo", fontName="Helvetica", fontSize=10, leading=15,
                           textColor=colors.HexColor("#263A39"), spaceAfter=7,
                           alignment=TA_LEFT, splitLongWords=True)
    nome = ParagraphStyle("Nome", parent=corpo, fontName="Helvetica-Bold", fontSize=23,
                          leading=29, textColor=marca, spaceAfter=8)
    titulo = ParagraphStyle("Secao", parent=corpo, fontName="Helvetica-Bold", fontSize=12,
                            leading=17, textColor=marca, spaceBefore=16, spaceAfter=8,
                            keepWithNext=True)
    def p(texto, estilo=corpo):
        # Os dados do aluno são texto, nunca marcação interpretada pelo ReportLab.
        return Paragraph(escape(str(texto)).replace("\n", "<br/>"), estilo)

    conteudo = [p(aluno.usuario.nome, nome), p(aluno.usuario.email),
                p(f"{aluno.curso.nome} | {aluno.periodo}º período"), Spacer(1, 4 * mm),
                HRFlowable(width="100%", thickness=1, color=marca)]
    for chave, (rotulo, formatar) in SECOES.items():
        if chave not in secoes:
            continue
        texto = formatar(perfil)
        if texto.strip():
            conteudo.append(p(rotulo, titulo))
            conteudo.extend(p(linha) for linha in texto.splitlines() if linha.strip())

    def rodape(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#637571"))
        canvas.drawString(20 * mm, 13 * mm, "Currículo profissional")
        canvas.drawRightString(A4[0] - 20 * mm, 13 * mm, str(doc.page))
        canvas.restoreState()

    SimpleDocTemplate(saida, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
                      topMargin=19 * mm, bottomMargin=22 * mm,
                      title="Currículo profissional", author=aluno.usuario.nome).build(
                          conteudo, onFirstPage=rodape, onLaterPages=rodape)
    saida.seek(0)
    return saida
