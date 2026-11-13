"""Camada de entrada de certificados.

Toda origem (hoje só o upload do aluno; amanhã uma importação oficial da UNDB)
entrega `CertificadoNovo` e passa por `cadastrar`. Assim modelos, endpoints e o
cálculo de compatibilidade não dependem de onde o certificado veio.

Trocar a origem depois = escrever uma função que devolva `list[CertificadoNovo]` e
chamar `importar_lote(aluno, novos, Certificado.Origem.UNDB)`. Ver docs/certificados-undb.md.
Nada aqui guarda senha ou token do portal da UNDB.
"""

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import transaction

from backend.models import Aluno, Certificado

LIMITE_BYTES = 5 * 1024 * 1024

# extensão -> (assinatura dos primeiros bytes, tipo de conteúdo)
TIPOS_ACEITOS = {
    ".pdf": (b"%PDF", "application/pdf"),
    ".jpg": (b"\xff\xd8\xff", "image/jpeg"),
    ".jpeg": (b"\xff\xd8\xff", "image/jpeg"),
    ".png": (b"\x89PNG\r\n\x1a\n", "image/png"),
}


class CertificadoInvalido(Exception):
    """Mensagem pronta para o aluno."""


@dataclass
class CertificadoNovo:
    titulo: str
    conteudo: bytes
    nome_arquivo: str
    instituicao: str = ""
    carga_horaria: int | None = None
    data: date | None = None


def tipo_de_conteudo(nome: str, conteudo: bytes) -> str:
    """Confere tamanho, extensão e assinatura do arquivo; devolve o content-type."""
    if len(conteudo) > LIMITE_BYTES:
        raise CertificadoInvalido("O arquivo passa de 5 MB. Envie uma versão menor.")
    extensao = Path(nome or "").suffix.lower()
    if extensao not in TIPOS_ACEITOS:
        raise CertificadoInvalido("Formato não aceito. Envie PDF, JPG ou PNG.")
    assinatura, tipo = TIPOS_ACEITOS[extensao]
    if not conteudo.startswith(assinatura):
        raise CertificadoInvalido("O arquivo está corrompido ou não é do tipo informado.")
    return tipo


def tipo_pelo_nome(nome: str) -> str:
    """Content-type de um arquivo já guardado (pela extensão)."""
    return TIPOS_ACEITOS.get(Path(nome or "").suffix.lower(), (b"", "application/octet-stream"))[1]


def cadastrar(
    aluno: Aluno, novo: CertificadoNovo, origem: str = Certificado.Origem.UPLOAD
) -> Certificado:
    tipo_de_conteudo(novo.nome_arquivo, novo.conteudo)
    extensao = Path(novo.nome_arquivo).suffix.lower()
    certificado = Certificado(
        aluno=aluno,
        titulo=novo.titulo.strip(),
        instituicao=novo.instituicao.strip(),
        carga_horaria=novo.carga_horaria,
        data=novo.data,
        nome_original=(novo.nome_arquivo or "")[-255:],
        origem=origem,
    )
    certificado.arquivo.save(f"certificado{extensao}", ContentFile(novo.conteudo), save=False)
    try:
        certificado.save()
    except Exception:
        certificado.arquivo.delete(save=False)  # sem registro no banco, o arquivo não fica órfão
        raise
    return certificado


def importar_lote(aluno: Aluno, novos: list[CertificadoNovo], origem: str) -> list[Certificado]:
    """Cadastra vários de uma vez (tudo ou nada). Usado por futuras importações.

    Confere o lote inteiro antes de gravar qualquer arquivo; se algo falhar depois
    disso, a transação desfaz o banco e os arquivos já gravados são apagados.
    """
    for novo in novos:
        tipo_de_conteudo(novo.nome_arquivo, novo.conteudo)
    gravados: list[Certificado] = []
    try:
        with transaction.atomic():
            for novo in novos:
                gravados.append(cadastrar(aluno, novo, origem))
    except Exception:
        for c in gravados:
            c.arquivo.delete(save=False)
        raise
    return gravados
