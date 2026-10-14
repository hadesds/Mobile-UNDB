from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from .curriculo import Competencia, Idioma, NivelIdioma
from .faculdade import Curso
from .usuarios import Aluno, Gestor


class Empresa(models.Model):
    """Empresa parceira. No MVP não tem login: o gestor do TEIA intermedeia."""

    class ConvenioStatus(models.TextChoices):
        SEM_CONVENIO = "sem_convenio", "Sem convênio"
        ATIVO = "ativo", "Ativo"
        A_VENCER = "a_vencer", "A vencer"
        VENCIDO = "vencido", "Vencido"

    nome = models.CharField("razão social / nome", max_length=150, unique=True)
    nome_fantasia = models.CharField(max_length=150, blank=True)
    contato_nome = models.CharField(max_length=150, blank=True)
    contato_email = models.EmailField(blank=True)
    contato_telefone = models.CharField(max_length=30, blank=True)
    convenio_status = models.CharField(
        max_length=15,
        choices=ConvenioStatus.choices,
        default=ConvenioStatus.SEM_CONVENIO,
    )
    ativa = models.BooleanField(default=True)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "empresa"
        verbose_name_plural = "empresas"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome_fantasia or self.nome


class Vaga(models.Model):
    class Tipo(models.TextChoices):
        ESTAGIO_OBRIGATORIO = "estagio_obrigatorio", "Estágio obrigatório"
        ESTAGIO_NAO_OBRIGATORIO = "estagio_nao_obrigatorio", "Estágio não obrigatório"
        CLT = "clt", "Emprego formal (CLT)"

    class Modalidade(models.TextChoices):
        PRESENCIAL = "presencial", "Presencial"
        REMOTO = "remoto", "Remoto"
        HIBRIDO = "hibrido", "Híbrido"

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ABERTA = "aberta", "Aberta"
        ENCERRADA = "encerrada", "Encerrada"

    empresa = models.ForeignKey(
        Empresa, on_delete=models.PROTECT, related_name="vagas"
    )
    gestor = models.ForeignKey(Gestor, on_delete=models.PROTECT, related_name="vagas")
    titulo = models.CharField(max_length=150)
    tipo = models.CharField(max_length=25, choices=Tipo.choices)
    modalidade = models.CharField(max_length=15, choices=Modalidade.choices)
    descricao = models.TextField(blank=True)
    prazo = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.RASCUNHO
    )

    # Requisitos estruturados (as competências e idiomas ficam nas tabelas abaixo).
    cursos = models.ManyToManyField(
        Curso,
        related_name="vagas",
        blank=True,
        help_text="Vazio = aberta a qualquer curso.",
    )
    periodo_minimo = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
    )
    disponibilidade_horario = models.CharField(max_length=150, blank=True)

    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "vaga"
        verbose_name_plural = "vagas"
        ordering = ["-criada_em"]

    def __str__(self) -> str:
        return f"{self.titulo} — {self.empresa}"

    @property
    def esta_aberta(self) -> bool:
        no_prazo = self.prazo is None or self.prazo >= timezone.localdate()
        return self.status == self.Status.ABERTA and no_prazo


class RequisitoCompetencia(models.Model):
    vaga = models.ForeignKey(
        Vaga, on_delete=models.CASCADE, related_name="requisitos_competencia"
    )
    competencia = models.ForeignKey(
        Competencia, on_delete=models.PROTECT, related_name="requisitos"
    )
    obrigatorio = models.BooleanField(
        default=True, help_text="Desmarcado = desejável."
    )

    class Meta:
        verbose_name = "requisito de competência"
        verbose_name_plural = "requisitos de competência"
        constraints = [
            models.UniqueConstraint(
                fields=["vaga", "competencia"], name="requisito_competencia_unico"
            )
        ]

    def __str__(self) -> str:
        return f"{self.competencia} ({'obrigatório' if self.obrigatorio else 'desejável'})"


class RequisitoIdioma(models.Model):
    vaga = models.ForeignKey(
        Vaga, on_delete=models.CASCADE, related_name="requisitos_idioma"
    )
    idioma = models.CharField(max_length=10, choices=Idioma.choices)
    nivel_minimo = models.PositiveSmallIntegerField(choices=NivelIdioma.choices)
    obrigatorio = models.BooleanField(default=True)

    class Meta:
        verbose_name = "requisito de idioma"
        verbose_name_plural = "requisitos de idioma"
        constraints = [
            models.UniqueConstraint(
                fields=["vaga", "idioma"], name="requisito_idioma_unico"
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_idioma_display()} ≥ {self.get_nivel_minimo_display()}"


class Candidatura(models.Model):
    """Criada quando o aluno solicita a análise de uma vaga (decisão da spec)."""

    class Status(models.TextChoices):
        ANALISADA = "analisada", "Analisada"
        ENCAMINHADA = "encaminhada", "Encaminhada à empresa"
        EM_PROCESSO = "em_processo", "Em processo"
        # Só o gestor (decisão humana) move para este estado; o sistema nunca elimina.
        NAO_SELECIONADA = "nao_selecionada", "Não selecionada"

    aluno = models.ForeignKey(
        Aluno, on_delete=models.CASCADE, related_name="candidaturas"
    )
    vaga = models.ForeignKey(
        Vaga, on_delete=models.CASCADE, related_name="candidaturas"
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.ANALISADA
    )
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "candidatura"
        verbose_name_plural = "candidaturas"
        ordering = ["-criada_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["aluno", "vaga"], name="candidatura_unica_por_aluno_vaga"
            )
        ]

    def __str__(self) -> str:
        return f"{self.aluno} -> {self.vaga}"

    def clean(self):
        # LGPD: sem consentimento vigente não há análise do currículo.
        if (
            self._state.adding
            and self.aluno_id
            and not self.aluno.consentimento_vigente
        ):
            raise ValidationError(
                "O aluno precisa aceitar o termo LGPD vigente antes de se candidatar."
            )


class Analise(models.Model):
    """Resultado da comparação perfil x requisitos.

    Uma candidatura pode ter várias análises (histórico): atualizar o currículo
    gera uma nova, sem reescrever o significado das anteriores.
    """

    class Faixa(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"

    # PROVISÓRIO: o cálculo, os pesos e as faixas ainda serão validados com o TEIA.
    FAIXA_MEDIA_MIN = 40
    FAIXA_ALTA_MIN = 70

    candidatura = models.ForeignKey(
        Candidatura, on_delete=models.CASCADE, related_name="analises"
    )
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    # [{"requisito": "Python", "tipo": "competencia", "evidencia": "..."}]
    requisitos_atendidos = models.JSONField(default=list, blank=True)
    # [{"requisito": "Inglês", "tipo": "idioma", "motivo": "ausente"|"nao_informado"}]
    requisitos_faltantes = models.JSONField(default=list, blank=True)
    feedback_texto = models.TextField(blank=True)
    # Cópia dos dados do perfil usados na análise (rastreabilidade).
    perfil_snapshot = models.JSONField(default=dict, blank=True)
    versao_motor = models.CharField(max_length=30, default="regras-0.1")
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "análise"
        verbose_name_plural = "análises"
        ordering = ["-criada_em"]
        get_latest_by = "criada_em"

    def __str__(self) -> str:
        return f"{self.candidatura} — {self.score}"

    @property
    def faixa(self) -> str:
        if self.score >= self.FAIXA_ALTA_MIN:
            return self.Faixa.ALTA
        if self.score >= self.FAIXA_MEDIA_MIN:
            return self.Faixa.MEDIA
        return self.Faixa.BAIXA


class Encaminhamento(models.Model):
    """Decisão humana do gestor de encaminhar a candidatura à empresa."""

    candidatura = models.OneToOneField(
        Candidatura, on_delete=models.CASCADE, related_name="encaminhamento"
    )
    gestor = models.ForeignKey(
        Gestor, on_delete=models.PROTECT, related_name="encaminhamentos"
    )
    observacao = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "encaminhamento"
        verbose_name_plural = "encaminhamentos"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"{self.candidatura} (por {self.gestor})"