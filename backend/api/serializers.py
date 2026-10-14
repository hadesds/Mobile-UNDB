from django.conf import settings
from django.contrib.auth.password_validation import validate_password as validar_senha
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from backend.models import (
    VERSAO_TERMO_LGPD,
    Aluno,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Experiencia,
    Formacao,
    IdiomaPerfil,
    PerfilCompetencias,
    RequisitoCompetencia,
    RequisitoIdioma,
    Usuario,
    Vaga,
)

# ---------------------------------------------------------------------------
# Catálogos
# ---------------------------------------------------------------------------


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = ["id", "nome", "total_periodos"]
        read_only_fields = fields


class CompetenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competencia
        fields = ["id", "nome", "categoria"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Autenticação e conta
# ---------------------------------------------------------------------------


class UsuarioSerializer(serializers.ModelSerializer):
    aluno = serializers.SerializerMethodField()
    gestor = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id", "email", "nome", "perfil", "aluno", "gestor"]
        read_only_fields = fields

    def get_aluno(self, user):
        aluno = getattr(user, "aluno", None)
        if aluno is None:
            return None
        return {
            "id": aluno.id,
            "matricula": aluno.matricula,
            "curso": {"id": aluno.curso_id, "nome": aluno.curso.nome},
            "periodo": aluno.periodo,
            "consentimento_vigente": aluno.consentimento_vigente,
            "consentimento_lgpd_em": aluno.consentimento_lgpd_em,
            "versao_termo_vigente": VERSAO_TERMO_LGPD,
        }

    def get_gestor(self, user):
        gestor = getattr(user, "gestor", None)
        if gestor is None:
            return None
        return {
            "id": gestor.id,
            "nucleo": {"id": gestor.nucleo_id, "nome": gestor.nucleo.nome},
            "cargo": gestor.cargo,
        }


class LoginSerializer(TokenObtainPairSerializer):
    """Login por e-mail + senha; devolve tokens e os dados do usuário."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["perfil"] = user.perfil
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["usuario"] = UsuarioSerializer(self.user).data
        return data


class CadastroAlunoSerializer(serializers.Serializer):
    """Auto-cadastro de aluno. Gestores NUNCA se cadastram por aqui."""

    email = serializers.EmailField()
    nome = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    matricula = serializers.CharField(max_length=30)
    curso = serializers.PrimaryKeyRelatedField(
        queryset=Curso.objects.filter(ativo=True)
    )
    periodo = serializers.IntegerField(min_value=1, max_value=20)
    aceite_lgpd = serializers.BooleanField()

    def validate_email(self, value):
        value = value.strip().lower()
        dominios = settings.ALUNO_EMAIL_DOMINIOS
        if dominios and value.rsplit("@", 1)[-1] not in dominios:
            raise serializers.ValidationError(
                "Use seu e-mail institucional (@" + ", @".join(dominios) + ")."
            )
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate_matricula(self, value):
        value = value.strip()
        if Aluno.objects.filter(matricula=value).exists():
            raise serializers.ValidationError("Esta matrícula já está cadastrada.")
        return value

    def validate_password(self, value):
        validar_senha(value)
        return value

    def validate_aceite_lgpd(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "É necessário aceitar o termo de consentimento (LGPD)."
            )
        return value

    def validate(self, attrs):
        if attrs["periodo"] > attrs["curso"].total_periodos:
            raise serializers.ValidationError(
                {"periodo": f"O curso possui {attrs['curso'].total_periodos} períodos."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated):
        usuario = Usuario.objects.create_user(
            email=validated["email"],
            password=validated["password"],
            nome=validated["nome"],
            perfil=Usuario.Perfil.ALUNO,
        )
        aluno = Aluno.objects.create(
            usuario=usuario,
            matricula=validated["matricula"],
            curso=validated["curso"],
            periodo=validated["periodo"],
        )
        PerfilCompetencias.objects.create(aluno=aluno)
        aluno.registrar_consentimento(True)
        return aluno


class ConsentimentoSerializer(serializers.Serializer):
    aceito = serializers.BooleanField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ---------------------------------------------------------------------------
# Perfil de competências do aluno
# ---------------------------------------------------------------------------


def _validar_datas(attrs, instance):
    inicio = attrs.get("inicio", getattr(instance, "inicio", None))
    fim = attrs.get("fim", getattr(instance, "fim", None))
    if inicio and fim and fim < inicio:
        raise serializers.ValidationError(
            {"fim": "A data final não pode ser anterior à inicial."}
        )


class FormacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formacao
        fields = ["id", "nivel", "instituicao", "curso", "inicio", "fim"]

    def validate(self, attrs):
        _validar_datas(attrs, self.instance)
        return attrs


class ExperienciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiencia
        fields = ["id", "tipo", "organizacao", "funcao", "descricao", "inicio", "fim"]

    def validate(self, attrs):
        _validar_datas(attrs, self.instance)
        return attrs


class CursoComplementarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CursoComplementar
        fields = ["id", "nome", "instituicao", "carga_horaria", "concluido_em"]


class CompetenciaDoPerfilSerializer(serializers.ModelSerializer):
    """Aceita `competencia` (id) ou `termo` (texto, resolvido por nome/sinônimo)."""

    competencia = serializers.PrimaryKeyRelatedField(
        queryset=Competencia.objects.filter(ativa=True), required=False
    )
    termo = serializers.CharField(write_only=True, required=False)
    competencia_nome = serializers.CharField(source="competencia.nome", read_only=True)

    class Meta:
        model = CompetenciaDoPerfil
        fields = ["id", "competencia", "competencia_nome", "termo", "nivel"]

    def validate(self, attrs):
        termo = attrs.pop("termo", None)
        competencia = attrs.get("competencia")

        if competencia is None and termo:
            competencia = Competencia.resolver(termo)
            if competencia is None:
                raise serializers.ValidationError(
                    {"termo": "Competência não encontrada no vocabulário. Escolha uma da lista."}
                )
            attrs["competencia"] = competencia

        if competencia is None:
            if self.instance is None:
                raise serializers.ValidationError(
                    "Informe 'competencia' (id) ou 'termo'."
                )
            competencia = self.instance.competencia

        duplicada = CompetenciaDoPerfil.objects.filter(
            perfil=self.context["perfil"], competencia=competencia
        )
        if self.instance is not None:
            duplicada = duplicada.exclude(pk=self.instance.pk)
        if duplicada.exists():
            raise serializers.ValidationError(
                {"competencia": "Você já adicionou esta competência."}
            )
        return attrs


class IdiomaPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdiomaPerfil
        fields = ["id", "idioma", "nivel"]

    def validate(self, attrs):
        idioma = attrs.get("idioma", getattr(self.instance, "idioma", None))
        duplicado = IdiomaPerfil.objects.filter(
            perfil=self.context["perfil"], idioma=idioma
        )
        if self.instance is not None:
            duplicado = duplicado.exclude(pk=self.instance.pk)
        if duplicado.exists():
            raise serializers.ValidationError(
                {"idioma": "Você já adicionou este idioma."}
            )
        return attrs


class PerfilSerializer(serializers.ModelSerializer):
    """Visão completa (somente leitura) do perfil; edição é feita por seção."""

    completude = serializers.IntegerField(read_only=True)
    secoes = serializers.SerializerMethodField()
    formacoes = FormacaoSerializer(many=True, read_only=True)
    experiencias = ExperienciaSerializer(many=True, read_only=True)
    competencias = CompetenciaDoPerfilSerializer(many=True, read_only=True)
    idiomas = IdiomaPerfilSerializer(many=True, read_only=True)
    cursos = CursoComplementarSerializer(many=True, read_only=True)

    class Meta:
        model = PerfilCompetencias
        fields = [
            "id",
            "completude",
            "secoes",
            "formacoes",
            "experiencias",
            "competencias",
            "idiomas",
            "cursos",
            "atualizado_em",
        ]
        read_only_fields = fields

    def get_secoes(self, perfil):
        return perfil.secoes_preenchidas()


# ---------------------------------------------------------------------------
# Empresas e vagas
# ---------------------------------------------------------------------------


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = [
            "id",
            "nome",
            "nome_fantasia",
            "contato_nome",
            "contato_email",
            "contato_telefone",
            "convenio_status",
            "ativa",
            "criada_em",
        ]
        read_only_fields = ["id", "criada_em"]


class RequisitoCompetenciaSerializer(serializers.ModelSerializer):
    competencia = serializers.PrimaryKeyRelatedField(
        queryset=Competencia.objects.filter(ativa=True)
    )
    competencia_nome = serializers.CharField(source="competencia.nome", read_only=True)

    class Meta:
        model = RequisitoCompetencia
        fields = ["id", "competencia", "competencia_nome", "obrigatorio"]


class RequisitoIdiomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitoIdioma
        fields = ["id", "idioma", "nivel_minimo", "obrigatorio"]


class VagaSerializer(serializers.ModelSerializer):
    """Visão do gestor: leitura e escrita, com requisitos aninhados."""

    empresa = serializers.PrimaryKeyRelatedField(
        queryset=Empresa.objects.filter(ativa=True)
    )
    empresa_nome = serializers.SerializerMethodField()
    cursos = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Curso.objects.filter(ativo=True), required=False
    )
    requisitos_competencia = RequisitoCompetenciaSerializer(many=True, required=False)
    requisitos_idioma = RequisitoIdiomaSerializer(many=True, required=False)
    gestor = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Vaga
        fields = [
            "id",
            "empresa",
            "empresa_nome",
            "gestor",
            "titulo",
            "tipo",
            "modalidade",
            "descricao",
            "prazo",
            "status",
            "cursos",
            "periodo_minimo",
            "disponibilidade_horario",
            "requisitos_competencia",
            "requisitos_idioma",
            "criada_em",
            "atualizada_em",
        ]
        read_only_fields = ["id", "gestor", "criada_em", "atualizada_em"]

    def get_empresa_nome(self, vaga):
        return str(vaga.empresa)

    def validate_requisitos_competencia(self, itens):
        ids = [i["competencia"].id for i in itens]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Competência repetida nos requisitos.")
        return itens

    def validate_requisitos_idioma(self, itens):
        idiomas = [i["idioma"] for i in itens]
        if len(idiomas) != len(set(idiomas)):
            raise serializers.ValidationError("Idioma repetido nos requisitos.")
        return itens

    def _tem_requisitos(self, attrs) -> bool:
        inst = self.instance
        if "requisitos_competencia" in attrs:
            comps = attrs["requisitos_competencia"]
        else:
            comps = inst.requisitos_competencia.exists() if inst else False
        if "requisitos_idioma" in attrs:
            idiomas = attrs["requisitos_idioma"]
        else:
            idiomas = inst.requisitos_idioma.exists() if inst else False
        return bool(comps or idiomas)

    def validate(self, attrs):
        inst = self.instance
        status = attrs.get("status", inst.status if inst else Vaga.Status.RASCUNHO)
        if status == Vaga.Status.ABERTA:
            if not self._tem_requisitos(attrs):
                raise serializers.ValidationError(
                    {"status": "Para abrir a vaga, cadastre ao menos um requisito (competência ou idioma)."}
                )
            prazo = attrs.get("prazo", inst.prazo if inst else None)
            if prazo and prazo < timezone.localdate():
                raise serializers.ValidationError(
                    {"prazo": "O prazo não pode estar no passado para uma vaga aberta."}
                )
        return attrs

    @staticmethod
    def _salvar_requisitos(vaga, competencias, idiomas):
        # None = campo não enviado (mantém); lista = substitui por completo.
        if competencias is not None:
            vaga.requisitos_competencia.all().delete()
            RequisitoCompetencia.objects.bulk_create(
                [RequisitoCompetencia(vaga=vaga, **item) for item in competencias]
            )
        if idiomas is not None:
            vaga.requisitos_idioma.all().delete()
            RequisitoIdioma.objects.bulk_create(
                [RequisitoIdioma(vaga=vaga, **item) for item in idiomas]
            )

    @transaction.atomic
    def create(self, validated):
        cursos = validated.pop("cursos", [])
        competencias = validated.pop("requisitos_competencia", None)
        idiomas = validated.pop("requisitos_idioma", None)
        vaga = Vaga.objects.create(**validated)
        vaga.cursos.set(cursos)
        self._salvar_requisitos(vaga, competencias, idiomas)
        return vaga

    @transaction.atomic
    def update(self, instance, validated):
        cursos = validated.pop("cursos", None)
        competencias = validated.pop("requisitos_competencia", None)
        idiomas = validated.pop("requisitos_idioma", None)
        for campo, valor in validated.items():
            setattr(instance, campo, valor)
        instance.save()
        if cursos is not None:
            instance.cursos.set(cursos)
        self._salvar_requisitos(instance, competencias, idiomas)
        return instance


class VagaAlunoSerializer(serializers.ModelSerializer):
    """Visão do aluno: somente leitura, sem dados internos do TEIA."""

    empresa = serializers.SerializerMethodField()
    cursos = CursoSerializer(many=True, read_only=True)
    requisitos_competencia = RequisitoCompetenciaSerializer(many=True, read_only=True)
    requisitos_idioma = RequisitoIdiomaSerializer(many=True, read_only=True)

    class Meta:
        model = Vaga
        fields = [
            "id",
            "titulo",
            "empresa",
            "tipo",
            "modalidade",
            "descricao",
            "prazo",
            "cursos",
            "periodo_minimo",
            "disponibilidade_horario",
            "requisitos_competencia",
            "requisitos_idioma",
        ]
        read_only_fields = fields

    def get_empresa(self, vaga):
        return str(vaga.empresa)