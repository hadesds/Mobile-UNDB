from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from .faculdade import Curso, NucleoCarreiras

# Ao mudar o texto do termo LGPD, incrementar para exigir novo aceite.
VERSAO_TERMO_LGPD = "1.0"


class UsuarioManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("perfil", Usuario.Perfil.ADMIN)
        if not extra["is_staff"] or not extra["is_superuser"]:
            raise ValueError("Superusuário precisa de is_staff e is_superuser.")
        return self._create_user(email, password, **extra)


class Usuario(AbstractUser):
    """Login por e-mail institucional. Empresa não é usuário no MVP."""

    class Perfil(models.TextChoices):
        ALUNO = "aluno", "Aluno"
        GESTOR = "gestor", "Gestor de vagas (TEIA)"
        ADMIN = "admin", "Administrador"

    username = None
    email = models.EmailField("e-mail institucional", unique=True)
    nome = models.CharField(max_length=150)
    perfil = models.CharField(
        max_length=10, choices=Perfil.choices, default=Perfil.ALUNO
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    objects = UsuarioManager()

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"
        ordering = ["nome"]

    def __str__(self) -> str:
        return f"{self.nome} <{self.email}>"

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)

    @property
    def eh_aluno(self) -> bool:
        return self.perfil == self.Perfil.ALUNO

    @property
    def eh_gestor(self) -> bool:
        return self.perfil == self.Perfil.GESTOR


class Aluno(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="aluno"
    )
    matricula = models.CharField(max_length=30, unique=True)
    curso = models.ForeignKey(Curso, on_delete=models.PROTECT, related_name="alunos")
    periodo = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )

    # LGPD: consentimento explícito para análise do currículo.
    consentimento_lgpd = models.BooleanField(default=False)
    consentimento_lgpd_em = models.DateTimeField(null=True, blank=True)
    versao_termo_lgpd = models.CharField(max_length=10, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "aluno"
        verbose_name_plural = "alunos"
        ordering = ["usuario__nome"]

    def __str__(self) -> str:
        return f"{self.usuario.nome} ({self.matricula})"

    def clean(self):
        if self.usuario_id and self.usuario.perfil != Usuario.Perfil.ALUNO:
            raise ValidationError("O usuário vinculado precisa ter perfil de aluno.")
        if self.curso_id and self.periodo and self.periodo > self.curso.total_periodos:
            raise ValidationError(
                {"periodo": f"O curso possui {self.curso.total_periodos} períodos."}
            )

    @property
    def consentimento_vigente(self) -> bool:
        return self.consentimento_lgpd and self.versao_termo_lgpd == VERSAO_TERMO_LGPD

    def registrar_consentimento(self, aceito: bool = True) -> None:
        self.consentimento_lgpd = aceito
        self.consentimento_lgpd_em = timezone.now() if aceito else None
        self.versao_termo_lgpd = VERSAO_TERMO_LGPD if aceito else ""
        self.save(
            update_fields=[
                "consentimento_lgpd",
                "consentimento_lgpd_em",
                "versao_termo_lgpd",
                "atualizado_em",
            ]
        )


class Gestor(models.Model):
    """Gestor de vagas do TEIA. Criado apenas pela administração."""

    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="gestor"
    )
    nucleo = models.ForeignKey(
        NucleoCarreiras, on_delete=models.PROTECT, related_name="gestores"
    )
    cargo = models.CharField(max_length=100, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "gestor de vagas"
        verbose_name_plural = "gestores de vagas"
        ordering = ["usuario__nome"]

    def __str__(self) -> str:
        return f"{self.usuario.nome} — {self.nucleo}"

    def clean(self):
        if self.usuario_id and self.usuario.perfil != Usuario.Perfil.GESTOR:
            raise ValidationError("O usuário vinculado precisa ter perfil de gestor.")