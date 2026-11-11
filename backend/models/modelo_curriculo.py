"""Modelo de currículo por vaga ("cada vaga tem um currículo").

Cada vaga tem um ModeloCurriculo com a lista de campos que ela pede (CampoModelo).
Um campo é de uma de duas origens:

- PERFIL: aponta para um dado que o sistema já tem (nome, curso, competências...)
  e chega ao aluno preenchido. O aluno pode editar antes de enviar.
- VAGA: pergunta específica desta vaga (ex.: "por que esta empresa?") e chega em
  branco.

O que o aluno envia fica em RespostaCandidatura, uma linha por campo. A montagem
do formulário e a validação ficam em `backend/formulario_candidatura.py`.

Ideias para depois (não feitas):
- T1 (certificados): uma FontePerfil.CERTIFICADOS que liste os certificados
  marcados para a candidatura.
- T5 (importar currículo): o texto importado pode sugerir valores para campos de
  origem VAGA também, mas sempre como sugestão para o aluno revisar.
"""

from django.core.exceptions import ValidationError
from django.db import models

from .vagas import Candidatura, Vaga


class ModeloCurriculo(models.Model):
    vaga = models.OneToOneField(
        Vaga, on_delete=models.CASCADE, related_name="modelo_curriculo"
    )
    instrucoes = models.TextField(
        blank=True, help_text="Texto curto exibido no topo do formulário de candidatura."
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "modelo de currículo"
        verbose_name_plural = "modelos de currículo"

    def __str__(self) -> str:
        return f"Currículo para {self.vaga}"


class CampoModelo(models.Model):
    class Origem(models.TextChoices):
        PERFIL = "perfil", "Do perfil (sai preenchido)"
        VAGA = "vaga", "Específico da vaga (sai em branco)"

    class Formato(models.TextChoices):
        """Como o app deve desenhar o campo. O valor trafega sempre como texto."""

        TEXTO = "texto", "Texto curto"
        TEXTO_LONGO = "texto_longo", "Texto longo"
        NUMERO = "numero", "Número"
        SIM_NAO = "sim_nao", "Sim ou não"  # valor "sim" ou "nao"
        URL = "url", "Link"

    class FontePerfil(models.TextChoices):
        """De onde vem o valor de um campo de origem PERFIL.

        Ao criar uma fonte nova, implemente-a em formulario_candidatura.FONTES.
        """

        NOME = "nome", "Nome"
        EMAIL = "email", "E-mail institucional"
        MATRICULA = "matricula", "Matrícula"
        CURSO = "curso", "Curso"
        PERIODO = "periodo", "Semestre atual"
        FORMACAO = "formacao", "Formação"
        EXPERIENCIAS = "experiencias", "Experiências"
        COMPETENCIAS = "competencias", "Competências"
        IDIOMAS = "idiomas", "Idiomas"
        CURSOS_COMPLEMENTARES = "cursos_complementares", "Cursos complementares"

    modelo = models.ForeignKey(
        ModeloCurriculo, on_delete=models.CASCADE, related_name="campos"
    )
    chave = models.SlugField(
        max_length=50,
        help_text="Identificador do campo na API (ex.: nome, motivacao). Único no modelo.",
    )
    rotulo = models.CharField(max_length=150)
    ajuda = models.CharField(
        max_length=255, blank=True, help_text="Dica exibida abaixo do campo."
    )
    origem = models.CharField(max_length=10, choices=Origem.choices)
    fonte_perfil = models.CharField(
        max_length=30,
        choices=FontePerfil.choices,
        blank=True,
        help_text="Obrigatório quando a origem é 'perfil'.",
    )
    formato = models.CharField(
        max_length=15, choices=Formato.choices, default=Formato.TEXTO
    )
    obrigatorio = models.BooleanField(default=True)
    ordem = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "campo do modelo"
        verbose_name_plural = "campos do modelo"
        ordering = ["ordem", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["modelo", "chave"], name="campo_modelo_chave_unica"
            )
        ]

    def __str__(self) -> str:
        return self.rotulo

    def clean(self):
        if self.origem == self.Origem.PERFIL and not self.fonte_perfil:
            raise ValidationError(
                {"fonte_perfil": "Escolha de qual dado do perfil o campo vem."}
            )
        if self.origem == self.Origem.VAGA and self.fonte_perfil:
            raise ValidationError(
                {"fonte_perfil": "Campos específicos da vaga não têm fonte no perfil."}
            )


class RespostaCandidatura(models.Model):
    """O que o aluno enviou em cada campo do modelo, na hora de se candidatar.

    Guarda cópia de chave/rótulo/origem: se o gestor mudar ou apagar o campo
    depois, a resposta continua legível (campo vira NULL).
    """

    candidatura = models.ForeignKey(
        Candidatura, on_delete=models.CASCADE, related_name="respostas"
    )
    campo = models.ForeignKey(
        CampoModelo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="respostas",
    )
    chave = models.SlugField(max_length=50)
    rotulo = models.CharField(max_length=150)
    origem = models.CharField(max_length=10, choices=CampoModelo.Origem.choices)
    valor = models.TextField(blank=True)
    # Só para campos de perfil: o valor enviado é diferente do sugerido pelo sistema?
    editado = models.BooleanField(default=False)
    ordem = models.PositiveSmallIntegerField(default=0)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "resposta da candidatura"
        verbose_name_plural = "respostas da candidatura"
        ordering = ["ordem", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidatura", "chave"], name="resposta_unica_por_campo"
            )
        ]

    def __str__(self) -> str:
        return f"{self.rotulo}: {self.valor[:40]}"
