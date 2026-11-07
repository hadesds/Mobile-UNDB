import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from backend.models import Vaga, RequisitoCompetencia, RequisitoIdioma


def novo_token():
    return secrets.token_urlsafe(32)


def hash_token(token):
    """O banco guarda só o SHA-256: um vazamento não expõe links utilizáveis."""
    return hashlib.sha256(token.encode()).hexdigest()


def validade_padrao():
    return timezone.now() + timedelta(days=7)


class LinkEmpresa(models.Model):
    TAMANHO_PREFIXO = 6

    empresa = models.ForeignKey("backend.Empresa", on_delete=models.PROTECT)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                   related_name="links_empresa_criados", editable=False)
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    token_prefixo = models.CharField("início do token", max_length=8, editable=False,
                                     help_text="Só para identificar o link; o token completo não é guardado.")
    expira_em = models.DateTimeField(default=validade_padrao)
    revogado = models.BooleanField(default=False, editable=False)
    revogado_em = models.DateTimeField(null=True, blank=True, editable=False)
    revogado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True,
                                     blank=True, related_name="links_empresa_revogados", editable=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "link para empresa"
        verbose_name_plural = "links para empresas"

    def __str__(self):
        return f"{self.empresa} — {self.token_prefixo}…"

    @classmethod
    def gerar(cls, *, empresa, criado_por, expira_em=None):
        """Cria o link e devolve (link, token). O token só existe neste retorno."""
        token = novo_token()
        link = cls.objects.create(
            empresa=empresa, criado_por=criado_por, token_hash=hash_token(token),
            token_prefixo=token[:cls.TAMANHO_PREFIXO], expira_em=expira_em or validade_padrao())
        return link, token

    @classmethod
    def com_token(cls, token, queryset=None):
        qs = cls.objects.all() if queryset is None else queryset
        if not token or len(token) > 128:
            return qs.none()
        return qs.filter(token_hash=hash_token(token))

    def revogar(self, usuario):
        if not self.revogado:
            self.revogado = True
            self.revogado_em = timezone.now()
            self.revogado_por = usuario
            self.save(update_fields=["revogado", "revogado_em", "revogado_por"])


# Clones preservam tipos, choices e validadores dos campos existentes,
# sem herança de tabela nem alteração dos modelos do backend.
CAMPOS_VAGA = ("titulo", "tipo", "modalidade", "descricao", "prazo",
               "periodo_minimo", "disponibilidade_horario")


class SolicitacaoVaga(models.Model):
    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente de revisão"
        PUBLICADA = "publicada", "Publicada"
        RECUSADA = "recusada", "Recusada"

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
