import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone
from backend.models import Vaga, RequisitoCompetencia, RequisitoIdioma


def novo_token():
    return secrets.token_urlsafe(32)


def validade_padrao():
    return timezone.now() + timedelta(days=7)


class LinkEmpresa(models.Model):
    empresa = models.ForeignKey("backend.Empresa", on_delete=models.PROTECT)
    gestor = models.ForeignKey("backend.Gestor", on_delete=models.PROTECT, editable=False)
    token = models.CharField(max_length=64, unique=True, default=novo_token, editable=False)
    expira_em = models.DateTimeField(default=validade_padrao)
    revogado = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "link para empresa"
        verbose_name_plural = "links para empresas"

    def __str__(self):
        return f"{self.empresa} — link {self.pk}"


# Clones preservam tipos, choices e validadores dos campos existentes,
# sem herança de tabela nem alteração dos modelos do backend.
CAMPOS_VAGA = ("titulo", "tipo", "modalidade", "descricao", "prazo",
               "periodo_minimo", "disponibilidade_horario")


class SolicitacaoVaga(models.Model):
    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente de revisão"
        PUBLICADA = "publicada", "Publicada"

    link = models.OneToOneField(LinkEmpresa, on_delete=models.PROTECT, editable=False)
    for nome in CAMPOS_VAGA:
        locals()[nome] = Vaga._meta.get_field(nome).clone()
    del nome
    cursos = models.ManyToManyField("backend.Curso", blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDENTE, editable=False)
    vaga = models.OneToOneField("backend.Vaga", on_delete=models.PROTECT, null=True, blank=True, editable=False)
    revisado_por = models.ForeignKey("backend.Gestor", on_delete=models.PROTECT, null=True, blank=True, editable=False)
    criada_em = models.DateTimeField(auto_now_add=True)
    publicada_em = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        verbose_name = "solicitação de vaga"
        verbose_name_plural = "solicitações de vagas"
        permissions = [("publicar_solicitacaovaga", "Pode confirmar publicação de solicitações")]

    def __str__(self):
        return self.titulo


class CompetenciaSolicitada(models.Model):
    solicitacao = models.ForeignKey(SolicitacaoVaga, on_delete=models.CASCADE, related_name="competencias")
    competencia = models.ForeignKey("backend.Competencia", on_delete=models.PROTECT)
    obrigatorio = RequisitoCompetencia._meta.get_field("obrigatorio").clone()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["solicitacao", "competencia"], name="solicitacao_competencia_unica")]


class IdiomaSolicitado(models.Model):
    solicitacao = models.ForeignKey(SolicitacaoVaga, on_delete=models.CASCADE, related_name="idiomas")
    idioma = RequisitoIdioma._meta.get_field("idioma").clone()
    nivel_minimo = RequisitoIdioma._meta.get_field("nivel_minimo").clone()
    obrigatorio = RequisitoIdioma._meta.get_field("obrigatorio").clone()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["solicitacao", "idioma"], name="solicitacao_idioma_unico")]
