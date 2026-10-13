from django.db import models


class Faculdade(models.Model):
    nome = models.CharField(max_length=150, unique=True)
    sigla = models.CharField(max_length=20, unique=True)
    cidade = models.CharField(max_length=100, blank=True)
    uf = models.CharField(max_length=2, blank=True)

    class Meta:
        verbose_name = "faculdade"
        verbose_name_plural = "faculdades"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.sigla


class Curso(models.Model):
    faculdade = models.ForeignKey(
        Faculdade, on_delete=models.PROTECT, related_name="cursos"
    )
    nome = models.CharField(max_length=150)
    # Usado para validar o período do aluno e o "período mínimo" das vagas.
    total_periodos = models.PositiveSmallIntegerField(default=10)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "curso"
        verbose_name_plural = "cursos"
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["faculdade", "nome"], name="curso_unico_por_faculdade"
            )
        ]

    def __str__(self) -> str:
        return self.nome


class NucleoCarreiras(models.Model):

    faculdade = models.ForeignKey(
        Faculdade, on_delete=models.PROTECT, related_name="nucleos_carreiras"
    )
    nome = models.CharField(max_length=100)
    email_contato = models.EmailField(blank=True)

    class Meta:
        verbose_name = "núcleo de carreiras"
        verbose_name_plural = "núcleos de carreiras"
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["faculdade", "nome"], name="nucleo_unico_por_faculdade"
            )
        ]

    def __str__(self) -> str:
        return self.nome