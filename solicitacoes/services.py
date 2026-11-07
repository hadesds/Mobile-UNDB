from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from backend.api.permissions import _eh_gestor
from backend.api.serializers import VagaSerializer
from backend.models import Vaga
from .models import CAMPOS_VAGA, LinkEmpresa, SolicitacaoVaga


class DadosInvalidos(ValidationError):
    """ValidationError do Django que preserva os erros estruturados do serializer.

    `messages` (textos) serve ao Admin e à página HTML; `detail` (dict) serve à API.
    """

    def __init__(self, detail):
        self.detail = detail
        super().__init__(list(_textos(detail)) or ["Dados inválidos."])


def _textos(erros, prefixo=""):
    if isinstance(erros, dict):
        for campo, valor in erros.items():
            rotulo = "" if campo == "non_field_errors" else f"{campo}: "
            yield from _textos(valor, prefixo + rotulo)
    elif isinstance(erros, (list, tuple)):
        for item in erros:
            yield from _textos(item, prefixo)
    elif erros:
        yield f"{prefixo}{erros}"


def gestor_autorizado(user):
    """Gestores vinculados e ativos operam o fluxo (Admin ou API) sem permissões manuais.

    O acesso ao Admin continua exigindo `is_staff` (verificado pelo próprio admin site).
    """
    return bool(_eh_gestor(user) and user.is_active)


# ---------------------------------------------------------------------------
# Links
# ---------------------------------------------------------------------------


def links_disponiveis():
    """Links que ainda aceitam envio (não revogados, no prazo, empresa ativa e sem envio)."""
    return LinkEmpresa.objects.filter(
        revogado=False, expira_em__gt=timezone.now(), empresa__ativa=True,
        solicitacaovaga__isnull=True)


def situacao_link(link):
    if link.revogado:
        return "revogado"
    if hasattr(link, "solicitacaovaga"):
        return "utilizado"
    if link.expira_em <= timezone.now():
        return "expirado"
    if not link.empresa.ativa:
        return "empresa_inativa"
    return "ativo"


def url_publica(token, request=None):
    """Endereço que o gestor envia à empresa (só pode ser montado na criação do link).

    Com `SOLICITACOES_FORMULARIO_URL` (ex.: "https://teia.app/empresa?token={token}")
    aponta para uma página externa que consome a API; sem ela, para a página
    servida pelo próprio Django.
    """
    modelo = getattr(settings, "SOLICITACOES_FORMULARIO_URL", "")
    if modelo:
        return modelo.format(token=token)
    caminho = reverse("solicitacoes:enviar", args=[token])
    return request.build_absolute_uri(caminho) if request else caminho


# ---------------------------------------------------------------------------
# Validação e publicação
# ---------------------------------------------------------------------------


def serializer_vaga(empresa_id, campos, competencias, idiomas, cursos, publicar=False):
    """VagaSerializer (não validado) com os dados da solicitação: mesmas regras da vaga."""
    dados = {nome: campos.get(nome) for nome in CAMPOS_VAGA}
    dados.update(empresa=empresa_id, cursos=list(cursos),
                 status=Vaga.Status.ABERTA if publicar else Vaga.Status.RASCUNHO,
                 requisitos_competencia=list(competencias), requisitos_idioma=list(idiomas))
    return VagaSerializer(data=dados)


def validar(solicitacao, competencias, idiomas, cursos, publicar=False):
    campos = {nome: getattr(solicitacao, nome) for nome in CAMPOS_VAGA}
    serializer = serializer_vaga(solicitacao.link.empresa_id, campos, competencias,
                                 idiomas, cursos, publicar=publicar)
    if not serializer.is_valid():
        raise DadosInvalidos(serializer.errors)
    return serializer


@transaction.atomic
def publicar(solicitacao_id, user):
    if not gestor_autorizado(user):
        raise PermissionDenied
    solicitacao = SolicitacaoVaga.objects.select_for_update().get(pk=solicitacao_id)
    if solicitacao.vaga_id:
        return solicitacao.vaga
    if solicitacao.status == SolicitacaoVaga.Status.RECUSADA:
        raise DadosInvalidos({"status": ["Solicitação recusada não pode ser publicada."]})
    serializer = validar(
        solicitacao, solicitacao.competencias.values("competencia", "obrigatorio"),
        solicitacao.idiomas.values("idioma", "nivel_minimo", "obrigatorio"),
        solicitacao.cursos.values_list("pk", flat=True), publicar=True)
    vaga = serializer.save(gestor=user.gestor)
    solicitacao.vaga = vaga
    solicitacao.status = SolicitacaoVaga.Status.PUBLICADA
    solicitacao.revisado_por = user.gestor
    solicitacao.publicada_em = timezone.now()
    solicitacao.save(update_fields=["vaga", "status", "revisado_por", "publicada_em"])
    return vaga


@transaction.atomic
def recusar(solicitacao_id, user):
    if not gestor_autorizado(user):
        raise PermissionDenied
    solicitacao = SolicitacaoVaga.objects.select_for_update().get(pk=solicitacao_id)
    if solicitacao.vaga_id:
        raise DadosInvalidos({"status": ["Solicitação já publicada não pode ser recusada."]})
    if solicitacao.status != SolicitacaoVaga.Status.RECUSADA:
        solicitacao.status = SolicitacaoVaga.Status.RECUSADA
        solicitacao.revisado_por = user.gestor
        solicitacao.save(update_fields=["status", "revisado_por"])
    return solicitacao
