from django.conf import settings
from django.contrib.auth.password_validation import validate_password as validar_senha
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from backend.models import (
    VERSAO_TERMO_LGPD,
    Aluno,
    ArquivoCurriculo,
    Analise,
    Candidatura,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Experiencia,
    Faculdade,
    Formacao,
    Gestor,
    IdiomaPerfil,
    NucleoCarreiras,
    PerfilCompetencias,
    RequisitoCompetencia,
    RequisitoIdioma,
    SinonimoCompetencia,
    Usuario,
    Vaga,
    normalizar_termo,
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


class ArquivoCurriculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArquivoCurriculo
        fields = ["nome_original", "tipo", "tamanho", "paginas", "enviado_em"]
        read_only_fields = fields


class PerfilSerializer(serializers.ModelSerializer):
    """Visão completa (somente leitura) do perfil; edição é feita por seção."""

    completude = serializers.IntegerField(read_only=True)
    secoes = serializers.SerializerMethodField()
    arquivo = serializers.SerializerMethodField()
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
            "arquivo",
            "atualizado_em",
        ]
        read_only_fields = fields

    def get_secoes(self, perfil):
        return perfil.secoes_preenchidas()

    def get_arquivo(self, perfil):
        arquivo = ArquivoCurriculo.objects.filter(perfil=perfil).first()
        return ArquivoCurriculoSerializer(arquivo).data if arquivo else None


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
    candidaturas = serializers.SerializerMethodField()

    class Meta:
        model = Vaga
        fields = [
            "id",
            "empresa",
            "empresa_nome",
            "gestor",
            "candidaturas",
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
        read_only_fields = ["id", "gestor", "candidaturas", "criada_em", "atualizada_em"]

    def get_empresa_nome(self, vaga):
        return str(vaga.empresa)

    def get_candidaturas(self, vaga):
        """Total e quantas ainda esperam a decisão do gestor (status `analisada`)."""
        total = getattr(vaga, "n_candidaturas", None)
        if total is None:
            qs = vaga.candidaturas.all()
            return {"total": qs.count(), "aguardando": qs.filter(status=Candidatura.Status.ANALISADA).count()}
        return {"total": total, "aguardando": vaga.n_aguardando}

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

# ---------------------------------------------------------------------------
# Candidaturas (visão do aluno)
# ---------------------------------------------------------------------------


class VagaResumoSerializer(serializers.ModelSerializer):
    empresa = serializers.CharField(source="empresa.__str__", read_only=True)

    class Meta:
        model = Vaga
        fields = ["id", "titulo", "empresa", "tipo", "modalidade", "prazo"]
        read_only_fields = fields


class AnaliseSerializer(serializers.ModelSerializer):
    faixa = serializers.CharField(read_only=True)
    itens = serializers.SerializerMethodField()

    class Meta:
        model = Analise
        fields = ["id", "score", "faixa", "itens", "feedback_texto", "versao_motor", "criada_em"]
        read_only_fields = fields

    def get_itens(self, analise):
        return list(analise.requisitos_atendidos) + list(analise.requisitos_faltantes)


class AnaliseResumoSerializer(serializers.ModelSerializer):
    faixa = serializers.CharField(read_only=True)

    class Meta:
        model = Analise
        fields = ["id", "score", "faixa", "criada_em"]
        read_only_fields = fields


def _ultima_analise(candidatura):
    # Usa o prefetch quando existir (as análises já vêm ordenadas da mais nova).
    analises = list(candidatura.analises.all())
    return analises[0] if analises else None


class CandidaturaListaSerializer(serializers.ModelSerializer):
    vaga = VagaResumoSerializer(read_only=True)
    analise = serializers.SerializerMethodField()

    class Meta:
        model = Candidatura
        fields = ["id", "vaga", "status", "analise", "criada_em", "atualizada_em"]
        read_only_fields = fields

    def get_analise(self, candidatura):
        ultima = _ultima_analise(candidatura)
        return AnaliseResumoSerializer(ultima).data if ultima else None


class CandidaturaDetalheSerializer(CandidaturaListaSerializer):
    historico = serializers.SerializerMethodField()
    encaminhada_em = serializers.SerializerMethodField()

    class Meta(CandidaturaListaSerializer.Meta):
        fields = CandidaturaListaSerializer.Meta.fields + ["historico", "encaminhada_em"]
        read_only_fields = fields

    def get_analise(self, candidatura):
        ultima = _ultima_analise(candidatura)
        return AnaliseSerializer(ultima).data if ultima else None

    def get_historico(self, candidatura):
        return AnaliseResumoSerializer(candidatura.analises.all(), many=True).data

    def get_encaminhada_em(self, candidatura):
        enc = getattr(candidatura, "encaminhamento", None)
        return enc.criado_em if enc else None


class NovaCandidaturaSerializer(serializers.Serializer):
    vaga = serializers.PrimaryKeyRelatedField(queryset=Vaga.objects.all())

    def validate_vaga(self, vaga):
        if not vaga.esta_aberta:
            raise serializers.ValidationError("Esta vaga não está aberta para candidaturas.")
        aluno = self.context["aluno"]
        if Candidatura.objects.filter(aluno=aluno, vaga=vaga).exists():
            raise serializers.ValidationError("Você já se candidatou a esta vaga.")
        return vaga


# ---------------------------------------------------------------------------
# Triagem (visão do gestor)
# ---------------------------------------------------------------------------


class AlunoResumoSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source="usuario.nome", read_only=True)
    email = serializers.EmailField(source="usuario.email", read_only=True)
    curso = serializers.CharField(source="curso.nome", read_only=True)
    consentimento_vigente = serializers.BooleanField(read_only=True)

    class Meta:
        model = Aluno
        fields = ["id", "nome", "email", "matricula", "curso", "periodo", "consentimento_vigente"]
        read_only_fields = fields


def _encaminhamento(candidatura):
    enc = getattr(candidatura, "encaminhamento", None)
    if enc is None:
        return None
    return {
        "observacao": enc.observacao,
        "criado_em": enc.criado_em,
        "gestor": enc.gestor.usuario.nome,
    }


class CandidatoSerializer(serializers.ModelSerializer):
    """Uma candidatura vista pelo gestor: aluno, etapa e a análise mais recente."""

    aluno = AlunoResumoSerializer(read_only=True)
    analise = serializers.SerializerMethodField()
    encaminhamento = serializers.SerializerMethodField()

    class Meta:
        model = Candidatura
        fields = ["id", "aluno", "status", "analise", "encaminhamento", "criada_em", "atualizada_em"]
        read_only_fields = fields

    def get_analise(self, candidatura):
        ultima = _ultima_analise(candidatura)
        return AnaliseSerializer(ultima).data if ultima else None

    def get_encaminhamento(self, candidatura):
        return _encaminhamento(candidatura)


class CandidatoDetalheSerializer(CandidatoSerializer):
    """Inclui vaga, histórico e o currículo atual (só com consentimento vigente)."""

    vaga = VagaResumoSerializer(read_only=True)
    historico = serializers.SerializerMethodField()
    curriculo = serializers.SerializerMethodField()

    class Meta(CandidatoSerializer.Meta):
        fields = CandidatoSerializer.Meta.fields + ["vaga", "historico", "curriculo"]
        read_only_fields = fields

    def get_historico(self, candidatura):
        return AnaliseResumoSerializer(candidatura.analises.all(), many=True).data

    def get_curriculo(self, candidatura):
        # LGPD: consentimento revogado = o TEIA deixa de ver o currículo.
        aluno = candidatura.aluno
        if not aluno.consentimento_vigente:
            return None
        perfil, _ = PerfilCompetencias.objects.get_or_create(aluno=aluno)
        return PerfilSerializer(perfil).data


class DecisaoSerializer(serializers.Serializer):
    """Decisão humana do gestor sobre a candidatura."""

    status = serializers.ChoiceField(choices=Candidatura.Status.choices)
    observacao = serializers.CharField(required=False, allow_blank=True, max_length=2000)


# ---------------------------------------------------------------------------
# Administração
# ---------------------------------------------------------------------------


class NucleoSerializer(serializers.ModelSerializer):
    class Meta:
        model = NucleoCarreiras
        fields = ["id", "nome"]
        read_only_fields = fields


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Listagem e edição de contas pela administração."""

    ativo = serializers.BooleanField(source="is_active", required=False)
    detalhe = serializers.SerializerMethodField()
    cargo = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=100)

    class Meta:
        model = Usuario
        fields = ["id", "nome", "email", "perfil", "ativo", "detalhe", "cargo", "date_joined", "last_login"]
        read_only_fields = ["id", "email", "perfil", "detalhe", "date_joined", "last_login"]

    def get_detalhe(self, user):
        aluno = getattr(user, "aluno", None)
        if aluno is not None:
            return {
                "matricula": aluno.matricula,
                "curso": aluno.curso.nome,
                "periodo": aluno.periodo,
                "consentimento_vigente": aluno.consentimento_vigente,
            }
        gestor = getattr(user, "gestor", None)
        if gestor is not None:
            return {"cargo": gestor.cargo, "nucleo": gestor.nucleo.nome}
        return None

    def validate_ativo(self, ativo):
        if not ativo and self.instance is not None and self.instance == self.context["request"].user:
            raise serializers.ValidationError("Você não pode desativar a própria conta.")
        return ativo

    def update(self, instance, validated):
        cargo = validated.pop("cargo", None)
        instance = super().update(instance, validated)
        gestor = getattr(instance, "gestor", None)
        if cargo is not None and gestor is not None:
            gestor.cargo = cargo
            gestor.save(update_fields=["cargo"])
        return instance


class NovoGestorSerializer(serializers.Serializer):
    """Cria a conta de gestor do TEIA (gestores não se cadastram sozinhos)."""

    nome = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    nucleo = serializers.PrimaryKeyRelatedField(queryset=NucleoCarreiras.objects.all())
    cargo = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate_password(self, value):
        validar_senha(value)
        return value

    @transaction.atomic
    def create(self, validated):
        usuario = Usuario.objects.create_user(
            email=validated["email"],
            password=validated["password"],
            nome=validated["nome"],
            perfil=Usuario.Perfil.GESTOR,
        )
        Gestor.objects.create(
            usuario=usuario, nucleo=validated["nucleo"], cargo=validated.get("cargo", "")
        )
        return usuario


class CompetenciaAdminSerializer(serializers.ModelSerializer):
    """Vocabulário: a lista `sinonimos` (termos) substitui a anterior quando enviada."""

    sinonimos = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, write_only=True
    )
    em_uso = serializers.SerializerMethodField()

    class Meta:
        model = Competencia
        fields = ["id", "nome", "categoria", "ativa", "sinonimos", "em_uso"]
        read_only_fields = ["id", "em_uso"]

    def to_representation(self, inst):
        data = super().to_representation(inst)
        data["sinonimos"] = [s.termo for s in inst.sinonimos.all()]
        return data

    def get_em_uso(self, inst):
        alunos = getattr(inst, "n_alunos", None)
        vagas = getattr(inst, "n_vagas", None)
        return {
            "alunos": inst.perfis.count() if alunos is None else alunos,
            "vagas": inst.requisitos.count() if vagas is None else vagas,
        }

    def validate_nome(self, nome):
        nome = " ".join(nome.split())
        chave = normalizar_termo(nome)
        outras = Competencia.objects.filter(nome_normalizado=chave)
        if self.instance is not None:
            outras = outras.exclude(pk=self.instance.pk)
        if outras.exists():
            raise serializers.ValidationError("Já existe uma competência com este nome.")
        sinonimo = SinonimoCompetencia.objects.filter(termo_normalizado=chave)
        if self.instance is not None:
            sinonimo = sinonimo.exclude(competencia=self.instance)
        if sinonimo.exists():
            raise serializers.ValidationError("Este nome já é sinônimo de outra competência.")
        return nome

    def validate_sinonimos(self, termos):
        limpos, chaves = [], set()
        for termo in termos:
            termo = " ".join(termo.split())
            chave = normalizar_termo(termo)
            if not chave or chave in chaves:
                continue
            outra = Competencia.objects.filter(nome_normalizado=chave)
            usado = SinonimoCompetencia.objects.filter(termo_normalizado=chave)
            if self.instance is not None:
                outra = outra.exclude(pk=self.instance.pk)
                usado = usado.exclude(competencia=self.instance)
            if outra.exists():
                raise serializers.ValidationError(f"“{termo}” já é o nome de outra competência.")
            if usado.exists():
                raise serializers.ValidationError(f"“{termo}” já é sinônimo de outra competência.")
            chaves.add(chave)
            limpos.append(termo)
        return limpos

    def validate(self, attrs):
        nome = attrs.get("nome", getattr(self.instance, "nome", ""))
        chave = normalizar_termo(nome)
        attrs["sinonimos"] = [
            t for t in attrs.get("sinonimos", []) if normalizar_termo(t) != chave
        ] if "sinonimos" in attrs else None
        return attrs

    @staticmethod
    def _salvar_sinonimos(comp, termos):
        if termos is None:
            return
        comp.sinonimos.all().delete()
        for termo in termos:
            SinonimoCompetencia.objects.create(competencia=comp, termo=termo)

    @transaction.atomic
    def create(self, validated):
        termos = validated.pop("sinonimos", None)
        comp = Competencia.objects.create(**validated)
        self._salvar_sinonimos(comp, termos)
        return comp

    @transaction.atomic
    def update(self, instance, validated):
        termos = validated.pop("sinonimos", None)
        instance = super().update(instance, validated)
        self._salvar_sinonimos(instance, termos)
        return instance


class CursoAdminSerializer(serializers.ModelSerializer):
    faculdade = serializers.PrimaryKeyRelatedField(
        queryset=Faculdade.objects.all(), required=False
    )
    alunos = serializers.SerializerMethodField()

    class Meta:
        model = Curso
        fields = ["id", "nome", "faculdade", "total_periodos", "ativo", "alunos"]
        read_only_fields = ["id", "alunos"]
        validators = []  # nome único por faculdade: checado em validate() com a faculdade padrão

    def get_alunos(self, curso):
        n = getattr(curso, "n_alunos", None)
        return n if n is not None else curso.alunos.count()

    def validate_total_periodos(self, valor):
        if not 1 <= valor <= 20:
            raise serializers.ValidationError("Informe entre 1 e 20 períodos.")
        return valor

    def validate(self, attrs):
        faculdade = attrs.get("faculdade") or getattr(self.instance, "faculdade", None)
        if faculdade is None:
            faculdade = Faculdade.objects.order_by("id").first()
            if faculdade is None:
                raise serializers.ValidationError({"faculdade": "Cadastre uma faculdade antes."})
            attrs["faculdade"] = faculdade
        nome = attrs.get("nome", getattr(self.instance, "nome", ""))
        repetido = Curso.objects.filter(faculdade=faculdade, nome__iexact=nome.strip())
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError({"nome": "Este curso já existe."})
        return attrs
