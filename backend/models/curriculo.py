import unicodedata
import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .usuarios import Aluno


def normalizar_termo(texto: str) -> str:
    """Minúsculas, sem acentos e com espaços colapsados.

    Base do vocabulário compartilhado: 'Pyton ' e 'python' viram a mesma chave.
    """
    sem_acento = (
        unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    )
    return " ".join(sem_acento.lower().split())


class NivelProficiencia(models.IntegerChoices):
    BASICO = 1, "Básico"
    INTERMEDIARIO = 2, "Intermediário"
    AVANCADO = 3, "Avançado"


class NivelIdioma(models.IntegerChoices):
    BASICO = 1, "Básico"
    INTERMEDIARIO = 2, "Intermediário"
    AVANCADO = 3, "Avançado"
    FLUENTE = 4, "Fluente"


class Idioma(models.TextChoices):
    INGLES = "ingles", "Inglês"
    ESPANHOL = "espanhol", "Espanhol"
    FRANCES = "frances", "Francês"
    ALEMAO = "alemao", "Alemão"
    ITALIANO = "italiano", "Italiano"
    LIBRAS = "libras", "Libras"
    OUTRO = "outro", "Outro"


def _validar_periodo(inicio, fim):
    if inicio and fim and fim < inicio:
        raise ValidationError({"fim": "A data final não pode ser anterior à inicial."})


# --------------------------------------------------------------------------
# Vocabulário de competências (compartilhado entre perfil do aluno e vagas)
# --------------------------------------------------------------------------


class Competencia(models.Model):
    class Categoria(models.TextChoices):
        TECNICA = "tecnica", "Técnica"
        FERRAMENTA = "ferramenta", "Ferramenta / tecnologia"
        COMPORTAMENTAL = "comportamental", "Comportamental"

    nome = models.CharField(max_length=100)
    nome_normalizado = models.CharField(max_length=100, unique=True, editable=False)
    categoria = models.CharField(
        max_length=15, choices=Categoria.choices, default=Categoria.TECNICA
    )
    ativa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "competência"
        verbose_name_plural = "competências"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome

    def save(self, *args, **kwargs):
        self.nome_normalizado = normalizar_termo(self.nome)
        super().save(*args, **kwargs)

    @classmethod
    def resolver(cls, texto: str):
        """Acha a competência pelo nome ou por um sinônimo (ou None)."""
        chave = normalizar_termo(texto)
        return (
            cls.objects.filter(nome_normalizado=chave, ativa=True).first()
            or cls.objects.filter(
                sinonimos__termo_normalizado=chave, ativa=True
            ).first()
        )


class SinonimoCompetencia(models.Model):
    """Grafia alternativa que aponta para uma competência (ex.: 'JS' -> JavaScript)."""

    competencia = models.ForeignKey(
        Competencia, on_delete=models.CASCADE, related_name="sinonimos"
    )
    termo = models.CharField(max_length=100)
    termo_normalizado = models.CharField(max_length=100, unique=True, editable=False)

    class Meta:
        verbose_name = "sinônimo de competência"
        verbose_name_plural = "sinônimos de competência"
        ordering = ["termo"]

    def __str__(self) -> str:
        return f"{self.termo} -> {self.competencia}"

    def clean(self):
        chave = normalizar_termo(self.termo)
        conflito = Competencia.objects.filter(nome_normalizado=chave).exclude(
            pk=self.competencia_id
        )
        if conflito.exists():
            raise ValidationError(
                {"termo": "Este termo já é o nome de outra competência."}
            )

    def save(self, *args, **kwargs):
        self.termo_normalizado = normalizar_termo(self.termo)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------
# Perfil de competências do aluno (currículo estruturado)
# --------------------------------------------------------------------------


class PerfilCompetencias(models.Model):
    aluno = models.OneToOneField(
        Aluno, on_delete=models.CASCADE, related_name="perfil_competencias"
    )
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil de competências"
        verbose_name_plural = "perfis de competências"

    def __str__(self) -> str:
        return f"Perfil de {self.aluno}"

    def secoes_preenchidas(self) -> dict:
        return {
            "formacao": self.formacoes.exists(),
            "experiencias": self.experiencias.exists(),
            "competencias": self.competencias.exists(),
            "idiomas": self.idiomas.exists(),
            "cursos": self.cursos.exists(),
        }

    @property
    def completude(self) -> int:
        """% de seções preenchidas. Orienta o preenchimento; NÃO avalia o aluno."""
        secoes = self.secoes_preenchidas()
        return round(100 * sum(secoes.values()) / len(secoes))


class Formacao(models.Model):
    class Nivel(models.TextChoices):
        MEDIO = "medio", "Ensino médio"
        TECNICO = "tecnico", "Técnico"
        GRADUACAO = "graduacao", "Graduação"
        ESPECIALIZACAO = "especializacao", "Especialização"
        MESTRADO = "mestrado", "Mestrado"
        DOUTORADO = "doutorado", "Doutorado"

    perfil = models.ForeignKey(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="formacoes"
    )
    nivel = models.CharField(max_length=15, choices=Nivel.choices)
    instituicao = models.CharField(max_length=150)
    curso = models.CharField(max_length=150)
    inicio = models.DateField(null=True, blank=True)
    fim = models.DateField(null=True, blank=True)  # vazio = em andamento

    class Meta:
        verbose_name = "formação"
        verbose_name_plural = "formações"
        ordering = ["-inicio"]

    def __str__(self) -> str:
        return f"{self.curso} — {self.instituicao}"

    def clean(self):
        _validar_periodo(self.inicio, self.fim)


class Experiencia(models.Model):
    """Estágio, emprego, projeto, voluntariado ou atividade acadêmica."""

    class Tipo(models.TextChoices):
        ESTAGIO = "estagio", "Estágio"
        EMPREGO = "emprego", "Emprego"
        PROJETO = "projeto", "Projeto"
        VOLUNTARIADO = "voluntariado", "Voluntariado"
        ACADEMICA = "academica", "Atividade acadêmica"

    perfil = models.ForeignKey(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="experiencias"
    )
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    organizacao = models.CharField(max_length=150)
    funcao = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    inicio = models.DateField(null=True, blank=True)
    fim = models.DateField(null=True, blank=True)  # vazio = atual

    class Meta:
        verbose_name = "experiência"
        verbose_name_plural = "experiências"
        ordering = ["-inicio"]

    def __str__(self) -> str:
        return f"{self.funcao} — {self.organizacao}"

    def clean(self):
        _validar_periodo(self.inicio, self.fim)


class CompetenciaDoPerfil(models.Model):
    perfil = models.ForeignKey(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="competencias"
    )
    competencia = models.ForeignKey(
        Competencia, on_delete=models.PROTECT, related_name="perfis"
    )
    nivel = models.PositiveSmallIntegerField(
        choices=NivelProficiencia.choices, null=True, blank=True
    )

    class Meta:
        verbose_name = "competência do perfil"
        verbose_name_plural = "competências do perfil"
        constraints = [
            models.UniqueConstraint(
                fields=["perfil", "competencia"], name="competencia_unica_por_perfil"
            )
        ]

    def __str__(self) -> str:
        return str(self.competencia)


class IdiomaPerfil(models.Model):
    perfil = models.ForeignKey(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="idiomas"
    )
    idioma = models.CharField(max_length=10, choices=Idioma.choices)
    nivel = models.PositiveSmallIntegerField(choices=NivelIdioma.choices)

    class Meta:
        verbose_name = "idioma do perfil"
        verbose_name_plural = "idiomas do perfil"
        constraints = [
            models.UniqueConstraint(
                fields=["perfil", "idioma"], name="idioma_unico_por_perfil"
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_idioma_display()} ({self.get_nivel_display()})"


class CursoComplementar(models.Model):
    perfil = models.ForeignKey(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="cursos"
    )
    nome = models.CharField(max_length=150)
    instituicao = models.CharField(max_length=150, blank=True)
    carga_horaria = models.PositiveIntegerField(null=True, blank=True)
    concluido_em = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "curso complementar"
        verbose_name_plural = "cursos complementares"
        ordering = ["-concluido_em"]

    def __str__(self) -> str:
        return self.nome


# --------------------------------------------------------------------------
# Arquivo de currículo enviado pelo aluno (PDF/DOCX)
# --------------------------------------------------------------------------


def _caminho_arquivo(instancia, nome: str) -> str:
    # Nome aleatório: o nome original (que costuma ter o nome do aluno) fica só no banco.
    return f"curriculos/{uuid.uuid4().hex}{Path(nome).suffix.lower()}"


class ArquivoCurriculo(models.Model):
    """O arquivo original do aluno e o texto lido dele (base das sugestões de preenchimento)."""

    class Tipo(models.TextChoices):
        PDF = "pdf", "PDF"
        DOCX = "docx", "Word (DOCX)"

    perfil = models.OneToOneField(
        PerfilCompetencias, on_delete=models.CASCADE, related_name="arquivo"
    )
    arquivo = models.FileField(upload_to=_caminho_arquivo)
    nome_original = models.CharField(max_length=255)
    tipo = models.CharField(max_length=4, choices=Tipo.choices)
    tamanho = models.PositiveIntegerField(help_text="Em bytes.")
    paginas = models.PositiveSmallIntegerField(null=True, blank=True)
    texto = models.TextField(blank=True)
    enviado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "arquivo de currículo"
        verbose_name_plural = "arquivos de currículo"

    def __str__(self) -> str:
        return self.nome_original


@receiver(post_delete, sender=ArquivoCurriculo)
def _apagar_arquivo(sender, instance, **kwargs):
    """Remover o registro (inclusive em cascata) apaga também o arquivo do disco."""
    if instance.arquivo:
        instance.arquivo.delete(save=False)
