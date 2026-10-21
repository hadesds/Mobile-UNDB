from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError as APIValidationError
from backend.api.permissions import _eh_gestor
from backend.api.serializers import VagaSerializer
from backend.models import Vaga
from .models import CAMPOS_VAGA, SolicitacaoVaga


def gestor_autorizado(user, *permissoes):
    return bool(_eh_gestor(user) and user.is_active and user.is_staff and user.has_perms(permissoes))


def validar(solicitacao, competencias, idiomas, cursos, publicar=False):
    dados = {nome: getattr(solicitacao, nome) for nome in CAMPOS_VAGA}
    dados.update(empresa=solicitacao.link.empresa_id, cursos=list(cursos),
                 status=Vaga.Status.ABERTA if publicar else Vaga.Status.RASCUNHO,
                 requisitos_competencia=list(competencias), requisitos_idioma=list(idiomas))
    serializer = VagaSerializer(data=dados)
    try:
        serializer.is_valid(raise_exception=True)
    except APIValidationError as exc:
        raise ValidationError(str(exc.detail)) from exc
    return serializer


@transaction.atomic
def publicar(solicitacao_id, user):
    if not gestor_autorizado(user, "solicitacoes.change_solicitacaovaga", "solicitacoes.publicar_solicitacaovaga"):
        raise PermissionDenied
    solicitacao = SolicitacaoVaga.objects.select_for_update().get(pk=solicitacao_id)
    if solicitacao.vaga_id:
        return solicitacao.vaga
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
