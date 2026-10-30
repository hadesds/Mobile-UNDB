"""Leitura de currículos em PDF/DOCX e extração de sugestões para o perfil do aluno.

Tudo por regras e localmente: o arquivo não sai do servidor (LGPD). O resultado são
*sugestões*: o aluno confere e decide o que entra no currículo do TEIA.

Etapas:
1. `ler_arquivo` valida o arquivo e devolve o texto de todas as páginas.
2. `extrair` divide o texto em seções pelos títulos usuais de currículo e interpreta
   cada seção (formação, experiências, cursos, idiomas). Competências são procuradas
   no texto inteiro pelo vocabulário compartilhado (nome e sinônimos).
"""

from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from django.utils import timezone

from .models import Competencia, SinonimoCompetencia, normalizar_termo

LIMITE_BYTES = 5 * 1024 * 1024
LIMITE_PAGINAS = 30
# DOCX é um zip: limita o tamanho descompactado para não abrir "zip bombs".
LIMITE_DOCX_DESCOMPACTADO = 60 * 1024 * 1024
LIMITE_TRECHO = 140


class ArquivoInvalido(Exception):
    """Mensagem pronta para o aluno."""


@dataclass
class Leitura:
    tipo: str  # "pdf" | "docx"
    texto: str
    paginas: int | None


# ---------------------------------------------------------------------------
# 1. Leitura do arquivo
# ---------------------------------------------------------------------------


def ler_arquivo(conteudo: bytes, nome: str) -> Leitura:
    if len(conteudo) > LIMITE_BYTES:
        raise ArquivoInvalido("O arquivo passa de 5 MB. Envie uma versão menor.")
    extensao = Path(nome or "").suffix.lower()

    if conteudo.startswith(b"%PDF"):
        texto, paginas = _ler_pdf(conteudo)
        tipo = "pdf"
    elif conteudo.startswith(b"PK"):
        texto, paginas = _ler_docx(conteudo), None
        tipo = "docx"
    elif extensao == ".doc" or conteudo.startswith(b"\xd0\xcf\x11\xe0"):
        raise ArquivoInvalido(
            "Arquivos .doc (Word antigo) não são lidos. Salve como .docx ou PDF e envie de novo."
        )
    else:
        raise ArquivoInvalido("Envie o currículo em PDF ou em Word (.docx).")

    texto = _limpar(texto)
    if len(texto) < 30:
        raise ArquivoInvalido(
            "Não encontramos texto no arquivo. Se ele for uma imagem ou um PDF escaneado, "
            "exporte o currículo como PDF direto do editor de texto."
        )
    return Leitura(tipo=tipo, texto=texto, paginas=paginas)


def _ler_pdf(conteudo: bytes) -> tuple[str, int]:
    from pypdf import PdfReader

    try:
        leitor = PdfReader(io.BytesIO(conteudo))
        if leitor.is_encrypted and not leitor.decrypt(""):
            raise ArquivoInvalido("O PDF está protegido por senha. Envie uma versão sem senha.")
        paginas = len(leitor.pages)
        if paginas > LIMITE_PAGINAS:
            raise ArquivoInvalido(f"O PDF tem mais de {LIMITE_PAGINAS} páginas.")
        partes = [pagina.extract_text() or "" for pagina in leitor.pages]
    except ArquivoInvalido:
        raise
    except Exception as exc:  # pypdf levanta vários tipos para arquivos corrompidos
        raise ArquivoInvalido("Não foi possível abrir o PDF. Ele pode estar corrompido.") from exc
    return "\n\n".join(partes), paginas


def _ler_docx(conteudo: bytes) -> str:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    try:
        with zipfile.ZipFile(io.BytesIO(conteudo)) as z:
            if "word/document.xml" not in z.namelist():
                raise ArquivoInvalido("Envie o currículo em PDF ou em Word (.docx).")
            if sum(i.file_size for i in z.infolist()) > LIMITE_DOCX_DESCOMPACTADO:
                raise ArquivoInvalido("O documento é grande demais para ser lido.")
        doc = Document(io.BytesIO(conteudo))
    except ArquivoInvalido:
        raise
    except Exception as exc:
        raise ArquivoInvalido("Não foi possível abrir o documento do Word.") from exc

    linhas: list[str] = []

    def paragrafo(p) -> None:
        texto = p.text.strip()
        if not texto:
            linhas.append("")
            return
        # Itens de lista do Word não trazem o marcador no texto: marca para a extração.
        estilo = (p.style.name or "").lower() if p.style is not None else ""
        em_lista = p._p.pPr is not None and p._p.pPr.numPr is not None
        linhas.append(f"• {texto}" if em_lista or estilo.startswith(("list", "lista")) else texto)

    # Cabeçalho da página costuma ter nome e contato.
    for secao in doc.sections:
        for p in secao.header.paragraphs:
            paragrafo(p)

    # Percorre o corpo na ordem do documento (parágrafos e tabelas intercalados).
    for filho in doc.element.body.iterchildren():
        tag = filho.tag.rsplit("}", 1)[-1]
        if tag == "p":
            paragrafo(Paragraph(filho, doc))
        elif tag == "tbl":
            for linha in Table(filho, doc).rows:
                celulas: list[str] = []
                for c in linha.cells:
                    t = c.text.strip()
                    if t and (not celulas or celulas[-1] != t):  # células mescladas repetem
                        celulas.append(t)
                for t in celulas:
                    linhas.extend(t.splitlines())
                linhas.append("")
    return "\n".join(linhas)


_LIGADURAS = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", " ": " ", " ": " ", "\t": " "}


def _limpar(texto: str) -> str:
    for de, para in _LIGADURAS.items():
        texto = texto.replace(de, para)
    linhas = [" ".join(l.split()) for l in texto.splitlines()]
    saida: list[str] = []
    for l in linhas:
        if not l and (not saida or not saida[-1]):
            continue  # no máximo uma linha em branco seguida
        saida.append(l)
    return "\n".join(saida).strip()


# ---------------------------------------------------------------------------
# 2. Vocabulário de títulos, datas e palavras-chave
# ---------------------------------------------------------------------------

_TITULOS: dict[str, str] = {}
for _secao, _termos in {
    "formacao": [
        "formacao", "formacao academica", "formacao educacional", "educacao", "escolaridade",
        "graduacao", "education", "academic background", "dados academicos",
    ],
    "experiencias": [
        "experiencia", "experiencias", "experiencia profissional", "experiencias profissionais",
        "historico profissional", "atuacao profissional", "trajetoria profissional", "estagios",
        "estagio", "experiencia de trabalho", "professional experience", "work experience",
        "experience", "employment history",
    ],
    "projetos": [
        "projetos", "projeto", "projetos academicos", "projetos pessoais", "principais projetos",
        "projects", "portfolio",
    ],
    "academica": [
        "atividades academicas", "atividades complementares", "atividades extracurriculares",
        "pesquisa", "iniciacao cientifica", "monitoria", "extensao", "producao academica",
        "publicacoes", "empresa junior",
    ],
    "voluntariado": [
        "voluntariado", "trabalho voluntario", "trabalhos voluntarios", "atividades voluntarias",
        "volunteer", "volunteering",
    ],
    "competencias": [
        "competencias", "competencia", "habilidades", "conhecimentos", "conhecimentos tecnicos",
        "habilidades tecnicas", "competencias tecnicas", "hard skills", "soft skills", "skills",
        "tecnologias", "ferramentas", "informatica", "conhecimentos em informatica",
        "competencias comportamentais", "habilidades e competencias", "competencias e habilidades",
        "conhecimentos e habilidades", "qualificacoes tecnicas", "stack", "technical skills",
    ],
    "idiomas": ["idiomas", "idioma", "linguas", "linguas estrangeiras", "languages", "language"],
    "cursos": [
        "cursos", "cursos complementares", "cursos extracurriculares", "cursos livres",
        "certificacoes", "certificados", "certificacao", "qualificacoes",
        "qualificacoes complementares", "formacao complementar", "cursos e certificacoes",
        "cursos e certificados", "capacitacoes", "treinamentos", "certifications", "courses",
    ],
    "resumo": [
        "resumo", "objetivo", "objetivos", "objetivo profissional", "perfil", "sobre mim",
        "perfil profissional", "resumo profissional", "apresentacao", "summary", "about", "about me",
    ],
    "contato": ["contato", "contatos", "dados pessoais", "informacoes pessoais", "contact"],
    "outros": [
        "informacoes adicionais", "outras informacoes", "premios", "premiacoes", "conquistas",
        "interesses", "referencias", "hobbies",
    ],
}.items():
    for _t in _termos:
        _TITULOS[_t] = _secao

_MESES = {
    "janeiro": 1, "jan": 1, "january": 1,
    "fevereiro": 2, "fev": 2, "february": 2, "feb": 2,
    "março": 3, "marco": 3, "mar": 3, "march": 3,
    "abril": 4, "abr": 4, "april": 4, "apr": 4,
    "maio": 5, "mai": 5, "may": 5,
    "junho": 6, "jun": 6, "june": 6,
    "julho": 7, "jul": 7, "july": 7,
    "agosto": 8, "ago": 8, "august": 8, "aug": 8,
    "setembro": 9, "set": 9, "september": 9, "sept": 9, "sep": 9,
    "outubro": 10, "out": 10, "october": 10, "oct": 10,
    "novembro": 11, "nov": 11, "november": 11,
    "dezembro": 12, "dez": 12, "december": 12, "dec": 12,
}
_MES_ALT = "|".join(sorted(_MESES, key=len, reverse=True))
_DATA_RE = re.compile(
    r"(?<![\d/])(?:\d{1,2}/)?(?P<m>\d{1,2})/(?P<a>(?:19|20)\d{2})(?![\d/])"
    rf"|\b(?P<mes>{_MES_ALT})\.?\s*(?:de\s+|/\s*|-\s*)?(?P<a2>(?:19|20)\d{{2}})(?!\d)"
    r"|(?<![\d/.,])(?P<a3>(?:19|20)\d{2})(?:\.(?P<sem>[12]))?(?![\d/])",
    re.IGNORECASE,
)
_ATUAL_RE = re.compile(
    r"\b(?:at[ée]\s+(?:o\s+)?(?:momento|presente|hoje)|atual(?:mente)?|presente|hoje|"
    r"em\s+andamento|cursando|em\s+curso|current(?:ly)?|present|now|ongoing)\b",
    re.IGNORECASE,
)
_PREVISAO_RE = re.compile(
    r"(?:previs[ãa]o|conclus[ãa]o|t[ée]rmino|formatura|conclu[íi]d[oa]|expected|graduation)"
    r"(?:\s+(?:de|da|do|prevista|para|em))*\s*:?",
    re.IGNORECASE,
)
_CARGA_RE = re.compile(r"(?:carga\s+hor[áa]ria\s*:?\s*)?\b(\d{1,4})\s*(?:h\b|hs\b|hrs?\b|horas?\b|hours?\b)", re.I)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_TELEFONE_RE = re.compile(r"(?:\+?55\s*)?\(?\b\d{2}\)?\s*9?\s?\d{4}[-\s.]?\d{4}\b")
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/[\w\-%]+/?", re.I)
_GITHUB_RE = re.compile(r"(?:https?://)?github\.com/[\w\-]+/?", re.I)

_MARCADORES = "•●○◦▪▫■□‣⁃∙·*➢►▶✓✔-–—>"
_SEPARADOR_RE = re.compile(r"\s+[-–—|@•·]\s+|\s*\|\s*|\s*;\s*|\s+at\s+|,\s+")
_LOCAIS = {
    "remoto", "remote", "hibrido", "presencial", "home office", "brasil", "brazil",
    "sao luis", "sao paulo", "rio de janeiro", "teresina", "fortaleza", "belem", "recife",
    "brasilia", "imperatriz", "salvador", "belo horizonte", "curitiba", "porto alegre",
}

_CARGO_RE = re.compile(
    r"\b(estagi|desenvolvedor|programador|analista|assistente|auxiliar|monitor|bolsista|"
    r"pesquisador|voluntari|tecnico|coordenador|gerente|engenheir|designer|professor|tutor|"
    r"intern|developer|engineer|analyst|consultor|atendente|vendedor|recepcionista|aprendiz|"
    r"socio|fundador|lider|membro|diretor|supervisor|operador|advogad|contador|editor|redator|"
    r"social media|scrum|freelanc|trainee|instrutor|secretari|administrador|arquitet|"
    r"psicolog|enfermeir|farmaceut|nutricion|fisioterap|jornalista|fotograf|tester|devops|"
    r"cientista|suporte|help desk|caixa|garcom|motorista|representante|executiv|especialista|"
    r"presidente|tesoureir|organizador|mentor|palestrante|extensionista|integrante|"
    r"colaborador|residente|conciliador|escrevente|paralegal|projetista|desenhista|orientador)",
)
_INSTITUICAO_RE = re.compile(
    r"\b(universidade|faculdade|centro universitario|instituto|escola|colegio|college|"
    r"university|school|academia|senai|senac|sesi|sebrae|undb|uema|ufma|ifma|ceuma|unifor|"
    r"usp|unicamp|unesp|fatec|etec|puc|fgv|unip|estacio|anhanguera|unopar|uninassau|"
    r"uninter|unifacema|facam|if[a-z]{2}|uf[a-z]{2,3}|ue[a-z]{2})\b"
)
_PLATAFORMA_RE = re.compile(
    r"\b(alura|udemy|coursera|edx|dio|digital innovation one|rocketseat|origamid|"
    r"fundacao bradesco|escola virtual|sebrae|senai|senac|google|microsoft|aws|amazon|cisco|"
    r"oracle|ibm|hubspot|linkedin learning|fgv|enap|cursa|prime cursos|sololearn|freecodecamp|"
    r"kaggle|datacamp|b7web|cubos|trybe|ada|santander|cambridge|ef set|wizard|ccaa|fisk|"
    r"cultura inglesa|danki code|cod3r|oab|esa|cna)\b"
)
_NIVEIS_FORMACAO = [
    ("doutorado", re.compile(r"\b(doutorado|phd|doctorate)\b")),
    ("mestrado", re.compile(r"\b(mestrado|master|msc)\b")),
    ("especializacao", re.compile(r"\b(especializacao|pos[- ]?graduacao|mba|lato sensu|residencia)\b")),
    ("medio", re.compile(r"\b(ensino medio|segundo grau|high school)\b")),
    ("tecnico", re.compile(r"\b(tecnico|curso tecnico)\b")),
    (
        "graduacao",
        re.compile(r"\b(graduacao|bacharelado|bacharel|licenciatura|tecnologo|tecnologia em|superior|bachelor)\b"),
    ),
]
_PREFIXO_NIVEL_RE = re.compile(
    r"^(?:bacharelado|bacharel|licenciatura|gradua[çc][ãa]o|tecn[óo]logo|curso\s+t[ée]cnico|"
    r"t[ée]cnico|especializa[çc][ãa]o|p[óo]s[- ]?gradua[çc][ãa]o|mba|mestrado|doutorado)"
    r"(?:\s+(?:em|de|no|na|of|in))?\s+",
    re.IGNORECASE,
)
_COMPLEMENTO_RE = re.compile(
    r"(?:cursando|conclu[íi]d|em\s+andamento|previs[ãa]o|per[íi]odo|semestre|\d+\s*[ºo°ª]|"
    r"cr\b|coeficiente|ira\b|m[ée]dia|carga\s+hor)",
    re.IGNORECASE,
)
_RUIDO_FORMACAO_RE = re.compile(r"\b(cursando|semestre|periodo|período|\d+\s*[ºo°]|cr\b|coeficiente|ira\b)", re.I)

_IDIOMAS = [
    ("ingles", re.compile(r"\b(ingl[êe]s|english)\b", re.I)),
    ("espanhol", re.compile(r"\b(espanhol|spanish|español|castelhano)\b", re.I)),
    ("frances", re.compile(r"\b(franc[êe]s|french|français)\b", re.I)),
    ("alemao", re.compile(r"\b(alem[ãa]o|german|deutsch)\b", re.I)),
    ("italiano", re.compile(r"\b(italiano|italian)\b", re.I)),
    ("libras", re.compile(r"\b(libras|l[íi]ngua brasileira de sinais)\b", re.I)),
]
_NIVEIS_IDIOMA = [
    (4, re.compile(r"\b(fluente|fluent|fluência|fluencia|nativo|native|proficiente|proficient|bil[íi]ngue|c1|c2)\b", re.I)),
    (3, re.compile(r"\b(avan[çc]ado|advanced|b2|upper[- ]intermediate)\b", re.I)),
    (2, re.compile(r"\b(intermedi[áa]rio|intermediate|b1|conversa[çc][ãa]o)\b", re.I)),
    (1, re.compile(r"\b(b[áa]sico|basic|iniciante|beginner|elementar|a1|a2|leitura|instrumental)\b", re.I)),
]
_NIVEIS_COMPETENCIA = [
    (3, re.compile(r"\b(avan[çc]ado|advanced|experiente|expert)\b", re.I)),
    (2, re.compile(r"\b(intermedi[áa]rio|intermediate)\b", re.I)),
    (1, re.compile(r"\b(b[áa]sico|basic|iniciante|beginner|no[çc][õo]es)\b", re.I)),
]


# ---------------------------------------------------------------------------
# 3. Funções de apoio
# ---------------------------------------------------------------------------


def _eh_marcador(linha: str) -> bool:
    return len(linha) > 1 and linha[0] in _MARCADORES and not linha[1].isdigit()


def _sem_marcador(linha: str) -> str:
    return linha.lstrip(_MARCADORES + " ").strip()


def _titulo(linha: str) -> str | None:
    """Seção correspondente se a linha for um título de seção."""
    if not linha or _eh_marcador(linha) or len(linha) > 50 or any(c.isdigit() for c in linha):
        return None
    t = normalizar_termo(re.sub(r"[^\w\s&]", " ", linha))
    t = " ".join(t.replace("&", " e ").split())
    if t in _TITULOS:
        return _TITULOS[t]
    palavras = t.split()
    destacado = linha.isupper() or linha.rstrip().endswith(":") or len(palavras) <= 3
    if destacado and len(palavras) <= 6:
        for n in range(len(palavras) - 1, 0, -1):
            prefixo = " ".join(palavras[:n])
            if prefixo in _TITULOS:
                return _TITULOS[prefixo]
    return None


def _datas(texto: str) -> list[date]:
    hoje = timezone.localdate()
    achadas: list[date] = []
    for m in _DATA_RE.finditer(texto):
        if m.group("a"):
            ano, mes = int(m.group("a")), int(m.group("m"))
        elif m.group("a2"):
            ano, mes = int(m.group("a2")), _MESES[m.group("mes").lower()]
        else:
            ano, mes = int(m.group("a3")), 7 if m.group("sem") == "2" else 1
        if not 1950 <= ano <= hoje.year + 8:
            continue
        achadas.append(date(ano, mes if 1 <= mes <= 12 else 1, 1))
    return achadas


def _periodo(texto: str, data_unica: str) -> tuple[date | None, date | None]:
    """(início, fim). `data_unica` diz o que uma data solitária significa."""
    ds = _datas(texto)
    atual = bool(_ATUAL_RE.search(texto))
    if len(ds) >= 2:
        inicio, fim = sorted(ds[:2])
        return inicio, (None if atual and fim == inicio else fim)
    if len(ds) == 1:
        if atual:
            return ds[0], None
        if _PREVISAO_RE.search(texto) or data_unica == "fim":
            return None, ds[0]
        if data_unica == "mesma":
            so_ano = all(m.group("a3") for m in _DATA_RE.finditer(texto))
            return ds[0], (date(ds[0].year, 12, 1) if so_ano else ds[0])
        return ds[0], None
    return None, None


def _sem_datas(texto: str) -> str:
    texto = _DATA_RE.sub(" ", texto)
    texto = _ATUAL_RE.sub(" ", texto)
    texto = _PREVISAO_RE.sub(" ", texto)
    texto = re.sub(r"\(\s*[-–—a]*\s*\)", " ", texto)
    texto = re.sub(r"\s+(?:a|at[ée]|to|de)\s*(?=$|[-–—|)])", " ", texto, flags=re.I)
    texto = re.sub(r"(\s*[-–—|,/]\s*){2,}", " - ", texto)
    return " ".join(texto.split()).strip(" -–—|,;:/()·")


def _fragmentos(texto: str) -> list[str]:
    """Partes de um cabeçalho ("Cargo | Empresa, Cidade/UF"), sem locais soltos.

    Separadores dentro de parênteses não dividem: "Universidade Dom Bosco (UNDB, São Luís)".
    """
    protegido = re.sub(r"\([^()]*\)", lambda m: m.group(0).replace(",", "\x00").replace("|", "\x01"), texto)
    partes = [p.replace("\x00", ",").replace("\x01", "|") for p in _SEPARADOR_RE.split(protegido)]
    saida = []
    for p in partes:
        p = p.strip(" -–—|,;:·")
        if p.count("(") > p.count(")"):
            p += ")"
        p = re.sub(r"^\((.*)\)$", r"\1", p).strip()
        if p.count(")") > p.count("("):
            p = p.replace(")", "").strip()
        if len(p) < 2:
            continue
        chave = normalizar_termo(p)
        if chave in _LOCAIS or re.fullmatch(r"[A-Z]{2}", p) or re.fullmatch(r"[\w\s]+/[A-Z]{2}", p):
            continue
        saida.append(p)
    return saida


def _trecho(linhas: list[str]) -> str:
    texto = " · ".join(l for l in linhas if l)
    return texto if len(texto) <= LIMITE_TRECHO else texto[: LIMITE_TRECHO - 1].rstrip() + "…"


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


@dataclass
class _Entrada:
    cabecalho: list[str]
    descricao: list[str]
    tem_data: bool = False

    @property
    def linhas(self) -> list[str]:
        return self.cabecalho + self.descricao


def _entradas(linhas: list[str]) -> list[_Entrada]:
    """Agrupa as linhas de uma seção em itens (um emprego, uma formação...).

    Frases (terminam em ponto ou são longas) depois do cabeçalho são descrição. Uma
    linha curta começa um item novo quando: a anterior estava em branco, o item atual
    já tem descrição, ou o item atual já tem data e uma data nova aparece nesta linha
    ou nas duas seguintes (é o cabeçalho do próximo item).
    """
    tem_data = [bool(_datas(l)) for l in linhas]
    entradas: list[_Entrada] = []
    atual: _Entrada | None = None
    branco_antes = False
    for i, linha in enumerate(linhas):
        if not linha:
            branco_antes = True
            continue
        if _eh_marcador(linha):
            if atual is None:
                atual = _Entrada([], [])
                entradas.append(atual)
            atual.descricao.append(_sem_marcador(linha))
            branco_antes = False
            continue
        prosa = linha.endswith(".") or len(linha) > 80
        if atual is not None and not branco_antes and prosa and (atual.tem_data or atual.descricao):
            atual.descricao.append(linha)
            continue
        if atual is not None and not branco_antes and _COMPLEMENTO_RE.match(linha):
            atual.cabecalho.append(linha)  # "Cursando o 6º período", "CR: 8,7"...
            continue
        proximas = [j for j in range(i, min(i + 3, len(linhas))) if linhas[j] and not _eh_marcador(linhas[j])]
        novo = (
            atual is None
            or branco_antes
            or bool(atual.descricao)
            or (atual.tem_data and any(tem_data[j] for j in proximas))
        )
        if novo:
            atual = _Entrada([linha], [], tem_data[i])
            entradas.append(atual)
        else:
            atual.cabecalho.append(linha)
            atual.tem_data = atual.tem_data or tem_data[i]
        branco_antes = False
    return [e for e in entradas if e.cabecalho or e.descricao]


# ---------------------------------------------------------------------------
# 4. Interpretação de cada seção
# ---------------------------------------------------------------------------


def _formacao(e: _Entrada) -> dict:
    texto = " ".join(e.linhas)
    norm = normalizar_termo(texto)
    nivel = next((n for n, rx in _NIVEIS_FORMACAO if rx.search(norm)), "graduacao")
    inicio, fim = _periodo(texto, "fim")
    if fim and fim > timezone.localdate():
        fim = None  # previsão de conclusão = em andamento
    if _ATUAL_RE.search(texto):
        fim = None

    frags = [f for l in e.linhas for f in _fragmentos(_sem_datas(l))]
    frags = [f for f in frags if not _RUIDO_FORMACAO_RE.search(f) or _INSTITUICAO_RE.search(normalizar_termo(f))]
    instituicao = next((f for f in frags if _INSTITUICAO_RE.search(normalizar_termo(f))), "")
    resto = [f for f in frags if f != instituicao]
    curso = next((f for f in resto if any(rx.search(normalizar_termo(f)) for _, rx in _NIVEIS_FORMACAO)), None)
    curso = curso or (resto[0] if resto else "")
    if not instituicao and len(resto) > 1:
        instituicao = next(f for f in resto if f != curso)
    if nivel == "medio" and not _PREFIXO_NIVEL_RE.sub("", curso).strip():
        curso = "Ensino médio"
    curso = _PREFIXO_NIVEL_RE.sub("", curso).strip() or curso
    if nivel == "medio" and normalizar_termo(curso).startswith("ensino medio"):
        curso = "Ensino médio"

    item = {
        "nivel": nivel,
        "curso": curso[:150],
        "instituicao": instituicao[:150],
        "inicio": _iso(inicio),
        "fim": _iso(fim),
    }
    return _com_faltando(item, ["curso", "instituicao"], e)


def _experiencia(e: _Entrada, secao: str) -> dict:
    cabecalho = " ".join(e.cabecalho)
    texto = " ".join(e.linhas)
    inicio, fim = _periodo(cabecalho or texto, "mesma")

    frags = [f for l in e.cabecalho for f in _fragmentos(_sem_datas(l))]
    funcao = next((f for f in frags if _CARGO_RE.search(normalizar_termo(f))), None)
    if funcao is None and frags:
        funcao = frags[0]
    resto = [f for f in frags if f != funcao]
    organizacao = resto[0] if resto else ""
    if funcao and not organizacao:
        m = re.match(r"(.+?)\s+(?:na|no|em|at|pela|pelo|for|da|do)\s+(.+)", funcao, re.I)
        if m and _CARGO_RE.search(normalizar_termo(m.group(1))):
            funcao, organizacao = m.group(1).strip(), m.group(2).strip()

    norm = normalizar_termo(texto)
    if secao == "projetos":
        tipo = "projeto"
    elif secao == "voluntariado" or "voluntari" in norm:
        tipo = "voluntariado"
    elif re.search(r"\b(estagi|intern)", norm):
        tipo = "estagio"
    elif secao == "academica" or re.search(
        r"\b(monitor|bolsista|iniciacao cientifica|pesquisa|extensao|liga academica|empresa junior|pibic)", norm
    ):
        tipo = "academica"
    elif re.search(r"\b(projeto|project|hackathon)\b", norm):
        tipo = "projeto"
    else:
        tipo = "emprego"

    if tipo == "projeto" and not organizacao:
        organizacao = "Projeto pessoal"
    descricao = "\n".join(f"• {d}" if not d.endswith((".", ":")) and len(e.descricao) > 1 else d for d in e.descricao)
    item = {
        "tipo": tipo,
        "funcao": (funcao or "")[:150],
        "organizacao": organizacao[:150],
        "descricao": descricao,
        "inicio": _iso(inicio),
        "fim": _iso(fim),
    }
    return _com_faltando(item, ["funcao", "organizacao"], e)


def _cursos(linhas: list[str]) -> list[dict]:
    """Um curso por linha; linhas só com instituição/carga/data completam o anterior."""
    grupos: list[list[str]] = []
    for linha in linhas:
        if not linha:
            continue
        limpa = re.sub(r"\s*\(([^()]*)\)", r" - \1", _sem_marcador(linha))
        sem_meta = _CARGA_RE.sub(" ", _sem_datas(limpa))
        frags = [f for f in _fragmentos(sem_meta) if not _PLATAFORMA_RE.search(normalizar_termo(f))]
        so_meta = not frags or (
            len(frags) == 1 and _INSTITUICAO_RE.search(normalizar_termo(frags[0])) and grupos
        )
        if so_meta and grupos:
            grupos[-1].append(limpa)
        else:
            grupos.append([limpa])

    itens = []
    for g in grupos:
        texto = " - ".join(g)
        carga = _CARGA_RE.search(texto)
        ds = _datas(texto)
        frags = _fragmentos(_CARGA_RE.sub(" ", _sem_datas(texto)))
        instituicao = next(
            (f for f in frags if _PLATAFORMA_RE.search(normalizar_termo(f)) or _INSTITUICAO_RE.search(normalizar_termo(f))),
            "",
        )
        nome = next((f for f in frags if f != instituicao), "")
        if not instituicao and len(frags) > 1:
            instituicao = frags[1]
        if not nome:
            continue
        item = {
            "nome": nome[:150],
            "instituicao": instituicao[:150],
            "carga_horaria": int(carga.group(1)) if carga and 0 < int(carga.group(1)) <= 5000 else None,
            "concluido_em": _iso(ds[-1] if ds else None),
            "trecho": _trecho(g),
            "faltando": [],
        }
        itens.append(item)
    return itens


def _com_faltando(item: dict, obrigatorios: list[str], e: _Entrada) -> dict:
    item["trecho"] = _trecho(e.cabecalho or e.descricao[:1])
    item["faltando"] = [c for c in obrigatorios if not item.get(c)]
    return item


def _idiomas(secoes: dict[str, list[str]], todas: list[str]) -> list[dict]:
    """Na seção de idiomas, qualquer menção conta; fora dela, só com nível declarado."""
    achados: dict[str, dict] = {}
    da_secao = set(secoes.get("idiomas", []))
    for linha in todas:
        if not linha:
            continue
        segmentos = [s for s in re.split(r"[,;|/]|\s+e\s+|\s+-\s+(?=[A-ZÁ-Ú])", linha) if s.strip()]
        so_um = sum(1 for _, rx in _IDIOMAS if rx.search(linha)) == 1
        for idioma, rx in _IDIOMAS:
            if idioma in achados or not rx.search(linha):
                continue
            segmento = linha if so_um else next((s for s in segmentos if rx.search(s)), linha)
            nivel = next((n for n, rxn in _NIVEIS_IDIOMA if rxn.search(segmento)), None)
            if linha not in da_secao and nivel is None:
                continue
            if re.search(r"\b(escola|curso|instituto|cultura)\b", normalizar_termo(segmento)) and nivel is None:
                continue
            achados[idioma] = {
                "idioma": idioma,
                "nivel": nivel or 2,
                "nivel_informado": nivel is not None,
                "trecho": _trecho([_sem_marcador(linha)]),
            }
    return list(achados.values())


def _vocabulario() -> list[tuple[str, Competencia]]:
    termos: dict[str, Competencia] = {}
    for c in Competencia.objects.filter(ativa=True):
        termos[c.nome_normalizado] = c
    for s in SinonimoCompetencia.objects.select_related("competencia").filter(competencia__ativa=True):
        termos.setdefault(s.termo_normalizado, s.competencia)
    # Termos mais longos primeiro: "react native" antes de "react".
    return sorted(termos.items(), key=lambda t: len(t[0]), reverse=True)


def _competencias(secoes: dict[str, list[str]], todas: list[str]) -> tuple[list[dict], list[str]]:
    da_secao = [l for l in secoes.get("competencias", []) if l]
    # Linhas normalizadas; trechos já reconhecidos são apagados para que um termo curto
    # não conte de novo dentro de um longo ("react" dentro de "react native").
    norm_secao = [[l, normalizar_termo(l)] for l in da_secao]
    normalizadas = [[l, normalizar_termo(l)] for l in todas if l]
    achadas: dict[int, dict] = {}

    for termo, comp in _vocabulario():
        rx = re.compile(r"(?<![a-z0-9+#])" + re.escape(termo) + r"(?![a-z0-9+#])")
        curto = len(termo) <= 2
        # Na seção de competências vale qualquer termo; no resto do texto só os não ambíguos.
        for linha in norm_secao:
            m = rx.search(linha[1])
            if m and (comp.id not in achadas or achadas[comp.id]["origem"] != "secao"):
                trecho_nivel = linha[1][m.end(): m.end() + 30]
                nivel = next((n for n, rxn in _NIVEIS_COMPETENCIA if rxn.search(trecho_nivel)), None)
                achadas[comp.id] = _competencia(comp, "secao", linha[0], nivel)
        if not curto and comp.id not in achadas:
            for linha in normalizadas:
                if rx.search(linha[1]):
                    achadas[comp.id] = _competencia(comp, "texto", linha[0], None)
                    break
        for linha in norm_secao + normalizadas:
            linha[1] = rx.sub(lambda m: " " * len(m.group(0)), linha[1])

    # Termos da seção de competências que o vocabulário não conhece (para o aluno saber).
    desconhecidos: list[str] = []
    for original, _ in norm_secao:
        sem_rotulo = re.sub(r"^[^:]{1,30}:\s*", "", _sem_marcador(original))
        for parte in re.split(r"[,;|/•·]|\s+e\s+|\s+-\s+", sem_rotulo):
            p = re.sub(r"\([^)]*\)?", "", parte).strip(" .()")
            chave = normalizar_termo(p)
            if not (2 <= len(p) <= 35) or len(p.split()) > 4 or not re.search(r"[a-zA-Z]", p):
                continue
            if any(rx.search(chave) for _, rx in _NIVEIS_COMPETENCIA) and len(p.split()) == 1:
                continue
            if Competencia.resolver(p) or any(
                chave == normalizar_termo(c["competencia_nome"]) for c in achadas.values()
            ):
                continue
            if p not in desconhecidos:
                desconhecidos.append(p)
    return list(achadas.values()), desconhecidos[:20]


def _competencia(comp: Competencia, origem: str, linha: str, nivel: int | None) -> dict:
    return {
        "competencia": comp.id,
        "competencia_nome": comp.nome,
        "categoria": comp.categoria,
        "nivel": nivel,
        "origem": origem,
        "trecho": _trecho([_sem_marcador(linha)]),
    }


def _contato(texto: str) -> dict:
    def primeiro(rx):
        m = rx.search(texto)
        return m.group(0).strip().rstrip("/") if m else None

    telefone = None
    for m in _TELEFONE_RE.finditer(texto):
        digitos = re.sub(r"\D", "", m.group(0))
        if 10 <= len(digitos) <= 13 and not re.fullmatch(r"(19|20)\d{2}(19|20)\d{2}", digitos[-8:]):
            telefone = m.group(0).strip()
            break
    return {
        "email": primeiro(_EMAIL_RE),
        "telefone": telefone,
        "linkedin": primeiro(_LINKEDIN_RE),
        "github": primeiro(_GITHUB_RE),
    }


# ---------------------------------------------------------------------------
# 5. Ponto de entrada
# ---------------------------------------------------------------------------


def dividir_secoes(texto: str) -> dict[str, list[str]]:
    secoes: dict[str, list[str]] = {"topo": []}
    atual = "topo"
    for linha in texto.splitlines():
        secao = _titulo(linha)
        if secao:
            atual = secao
            secoes.setdefault(atual, [])
            # "Habilidades: Python, SQL" — título e conteúdo na mesma linha.
            if ":" in linha and linha.split(":", 1)[1].strip():
                secoes[atual].append(linha.split(":", 1)[1].strip())
            continue
        secoes.setdefault(atual, []).append(linha)
    return secoes


def extrair(texto: str, perfil=None) -> dict:
    """Sugestões para o perfil a partir do texto do currículo.

    Cada item traz `trecho` (de onde veio), `faltando` (campos que o aluno precisa
    completar) e `ja_existe` (já está no perfil, para não duplicar).
    """
    secoes = dividir_secoes(texto)
    todas = texto.splitlines()

    formacoes = [_formacao(e) for e in _entradas(secoes.get("formacao", []))]
    experiencias = [
        _experiencia(e, s)
        for s in ("experiencias", "projetos", "academica", "voluntariado")
        for e in _entradas(secoes.get(s, []))
    ]
    formacoes = [f for f in formacoes if f["curso"] or f["instituicao"]]
    experiencias = [x for x in experiencias if x["funcao"] or x["organizacao"]]
    cursos = _cursos(secoes.get("cursos", []))
    idiomas = _idiomas(secoes, todas)
    competencias, desconhecidos = _competencias(secoes, todas)

    sugestoes = {
        "formacoes": formacoes,
        "experiencias": experiencias,
        "competencias": competencias,
        "idiomas": idiomas,
        "cursos": cursos,
        "contato": _contato(texto),
        "termos_nao_reconhecidos": desconhecidos,
        "secoes_encontradas": [s for s in secoes if s != "topo" and any(secoes[s])],
    }
    _marcar_existentes(sugestoes, perfil)
    return sugestoes


def _marcar_existentes(s: dict, perfil) -> None:
    def chave(*partes):
        return "|".join(normalizar_termo(p or "") for p in partes)

    if perfil is None:
        existentes = {k: set() for k in ("formacoes", "experiencias", "competencias", "idiomas", "cursos")}
    else:
        existentes = {
            "formacoes": {chave(f.curso, f.instituicao) for f in perfil.formacoes.all()},
            "experiencias": {chave(e.funcao, e.organizacao) for e in perfil.experiencias.all()},
            "competencias": set(perfil.competencias.values_list("competencia_id", flat=True)),
            "idiomas": set(perfil.idiomas.values_list("idioma", flat=True)),
            "cursos": {chave(c.nome) for c in perfil.cursos.all()},
        }
    for f in s["formacoes"]:
        f["ja_existe"] = chave(f["curso"], f["instituicao"]) in existentes["formacoes"]
    for e in s["experiencias"]:
        e["ja_existe"] = chave(e["funcao"], e["organizacao"]) in existentes["experiencias"]
    for c in s["competencias"]:
        c["ja_existe"] = c["competencia"] in existentes["competencias"]
    for i in s["idiomas"]:
        i["ja_existe"] = i["idioma"] in existentes["idiomas"]
    for c in s["cursos"]:
        c["ja_existe"] = chave(c["nome"]) in existentes["cursos"]
