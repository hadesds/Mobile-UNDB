import uuid
from pathlib import Path

from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .usuarios import Aluno
from .vagas import Candidatura


def _caminho_certificado(instancia, nome: str) -> str:
    # Nome aleatório: o nome original (que costuma ter o nome do aluno) fica só no banco.
    return f"certificados/{uuid.uuid4().hex}{Path(nome).suffix.lower()}"


class Certificado(models.Model):
    """Certificado ou atividade complementar do aluno, com o comprovante em arquivo.

    `origem` diz de onde veio: hoje só `upload` (o aluno enviou). `undb` fica
    reservado para quando houver importação oficial (ver docs/certificados-undb.md).
    """

    class Origem(models.TextChoices):
        UPLOAD = "upload", "Enviado pelo aluno"
        UNDB = "undb", "Importado da UNDB"

    aluno = models.ForeignKey(
        Aluno, on_delete=models.CASCADE, related_name="certificados"
    )
    titulo = models.CharField(max_length=150)
    instituicao = models.CharField("instituição", max_length=150, blank=True)
    carga_horaria = models.PositiveIntegerField(
        "carga horária (h)", null=True, blank=True
    )
    data = models.DateField("data de conclusão", null=True, blank=True)
    arquivo = models.FileField(upload_to=_caminho_certificado)
    nome_original = models.CharField(max_length=255, blank=True)
    origem = models.CharField(
        max_length=10, choices=Origem.choices, default=Origem.UPLOAD
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "certificado"
        verbose_name_plural = "certificados"
        ordering = ["-data", "-criado_em"]

    def __str__(self) -> str:
        return self.titulo


class CandidaturaCertificado(models.Model):
    """Certificado que o aluno escolheu apresentar numa candidatura."""

    candidatura = models.ForeignKey(
        Candidatura, on_delete=models.CASCADE, related_name="certificados_escolhidos"
    )
    certificado = models.ForeignKey(
        Certificado, on_delete=models.CASCADE, related_name="candidaturas"
    )

    class Meta:
        verbose_name = "certificado da candidatura"
        verbose_name_plural = "certificados da candidatura"
        constraints = [
            models.UniqueConstraint(
                fields=["candidatura", "certificado"],
                name="certificado_unico_por_candidatura",
            )
        ]

    def __str__(self) -> str:
        return f"{self.candidatura_id} · {self.certificado}"


@receiver(post_delete, sender=Certificado)
def _apagar_arquivo_certificado(sender, instance, **kwargs):
    """Remover o registro (inclusive em cascata) apaga também o arquivo do storage."""
    if instance.arquivo:
        instance.arquivo.delete(save=False)
