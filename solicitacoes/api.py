"""API REST do envio de vagas por empresas.

- Gestor ou admin (JWT): gera, lista e revoga links. O token aparece só na criação.
- Gestor (JWT): revisa, publica ou recusa as solicitações (admin apenas consulta).
- Empresa (sem conta): lê e envia o formulário apenas com o token do link.
"""
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from backend.api.permissions import _eh_admin, _eh_gestor
from backend.models import CampoModelo, Competencia, Curso, Empresa, Idioma, NivelIdioma, Vaga, normalizar_termo

from .models import (CAMPOS_VAGA, CompetenciaSolicitada, IdiomaSolicitado, LinkEmpresa,
                     PerguntaSolicitada, SolicitacaoVaga)
from . import services

VALIDADE_MAXIMA = timedelta(days=90)
MAX_COMPETENCIAS = 20
MAX_IDIOMAS = 10
MAX_PERGUNTAS = services.MAX_PERGUNTAS


def _escolhas(cls):
    return [{"valor": v, "rotulo": str(r)} for v, r in cls.choices]


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------


class LinkSerializer(serializers.ModelSerializer):
    """Link sem o token: o banco só guarda o hash e um prefixo para identificação."""

    empresa = serializers.PrimaryKeyRelatedField(queryset=Empresa.objects.filter(ativa=True))
    empresa_nome = serializers.CharField(source="empresa.__str__", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True)
    revogado_por_nome = serializers.CharField(source="revogado_por.nome", read_only=True, default=None)
    situacao = serializers.SerializerMethodField()
    solicitacao = serializers.SerializerMethodField()

    class Meta:
        model = LinkEmpresa
        fields = ["id", "empresa", "empresa_nome", "token_prefixo", "situacao", "solicitacao",
                  "expira_em", "criado_por_nome", "criado_em", "revogado_em", "revogado_por_nome"]
        read_only_fields = ["id", "token_prefixo", "criado_em", "revogado_em"]
        extra_kwargs = {"expira_em": {"required": False}}

    def get_situacao(self, link):
        return services.situacao_link(link)

    def get_solicitacao(self, link):
        s = getattr(link, "solicitacaovaga", None)
        if not s:
            return None
        return {"id": s.pk, "status": s.status, "titulo": s.titulo, "criada_em": s.criada_em,
                "vaga": s.vaga_id}

    def validate_expira_em(self, valor):
        agora = timezone.now()
        if valor <= agora + timedelta(minutes=30):
            raise serializers.ValidationError("A validade precisa ser de pelo menos 30 minutos.")
        if valor > agora + VALIDADE_MAXIMA:
            raise serializers.ValidationError("A validade máxima é de 90 dias.")
        return valor

    def create(self, validated):
        link, token = LinkEmpresa.gerar(criado_por=self.context["request"].user, **validated)
        link._token = token  # só nesta resposta
        return link

    def to_representation(self, link):
        dados = super().to_representation(link)
        token = getattr(link, "_token", None)
        if token:
            dados["token"] = token
            dados["url"] = services.url_publica(token, self.context.get("request"))
        return dados


class CompetenciaSolicitadaSerializer(serializers.ModelSerializer):
    competencia = serializers.PrimaryKeyRelatedField(queryset=Competencia.objects.filter(ativa=True))
    competencia_nome = serializers.CharField(source="competencia.nome", read_only=True)

    class Meta:
        model = CompetenciaSolicitada
        fields = ["competencia", "competencia_nome", "obrigatorio"]


class IdiomaSolicitadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdiomaSolicitado
        fields = ["idioma", "nivel_minimo", "obrigatorio"]


class PerguntaSolicitadaSerializer(serializers.ModelSerializer):
    rotulo = serializers.CharField(max_length=150)

    class Meta:
        model = PerguntaSolicitada
        fields = ["rotulo", "ajuda", "formato", "obrigatorio"]


class SolicitacaoSerializer(serializers.ModelSerializer):
    """Mesmo formato do VagaSerializer (campos, cursos e requisitos aninhados).

    Empresa vem do link; status, vaga e revisor são controlados pelo servidor.
    Listas enviadas substituem as anteriores; omitidas são mantidas (PATCH).
    """

    cursos = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Curso.objects.filter(ativo=True), required=False)
    requisitos_competencia = CompetenciaSolicitadaSerializer(
        many=True, required=False, source="competencias", max_length=MAX_COMPETENCIAS)
    requisitos_idioma = IdiomaSolicitadoSerializer(
        many=True, required=False, source="idiomas", max_length=MAX_IDIOMAS)
    perguntas = PerguntaSolicitadaSerializer(many=True, required=False, max_length=MAX_PERGUNTAS)

    class Meta:
        model = SolicitacaoVaga
        fields = [*CAMPOS_VAGA, "cursos", "requisitos_competencia", "requisitos_idioma", "perguntas"]

    def validate_perguntas(self, itens):
        try:
            services.validar_perguntas(itens)
        except services.DadosInvalidos as exc:
            raise serializers.ValidationError(exc.detail["perguntas"])
        return itens

    def _link(self):
        return self.instance.link if self.instance else self.context["link"]

    def validate(self, attrs):
        inst = self.instance
        base = inst or SolicitacaoVaga()  # sem instância: valores padrão do modelo
        campos = {n: attrs.get(n, getattr(base, n)) for n in CAMPOS_VAGA}
        if "competencias" in attrs:
            comps = [{"competencia": c["competencia"].pk, "obrigatorio": c.get("obrigatorio", True)}
                     for c in attrs["competencias"]]
        else:
            comps = list(inst.competencias.values("competencia", "obrigatorio")) if inst else []
        if "idiomas" in attrs:
            idiomas = attrs["idiomas"]
        else:
            idiomas = list(inst.idiomas.values("idioma", "nivel_minimo", "obrigatorio")) if inst else []
        if "cursos" in attrs:
            cursos = [c.pk for c in attrs["cursos"]]
        else:
            cursos = list(inst.cursos.values_list("pk", flat=True)) if inst else []
        vaga = services.serializer_vaga(self._link().empresa_id, campos, comps, idiomas, cursos)
        if not vaga.is_valid():
            erros = dict(vaga.errors)
            # Mesmos nomes de campo do VagaSerializer; só "empresa" vem do link.
            if "empresa" in erros:
                erros["non_field_errors"] = ["A empresa deste link não está mais ativa."]
                del erros["empresa"]
            raise ValidationError(erros)
        return attrs

    @transaction.atomic
    def _gravar(self, obj, validated):
        cursos = validated.pop("cursos", None)
        comps = validated.pop("competencias", None)
        idiomas = validated.pop("idiomas", None)
        perguntas = validated.pop("perguntas", None)
        for campo, valor in validated.items():
            setattr(obj, campo, valor)
        obj.save()
        if cursos is not None:
            obj.cursos.set(cursos)
        if comps is not None:
            obj.competencias.all().delete()
            CompetenciaSolicitada.objects.bulk_create(
                [CompetenciaSolicitada(solicitacao=obj, **c) for c in comps])
        if idiomas is not None:
            obj.idiomas.all().delete()
            IdiomaSolicitado.objects.bulk_create(
                [IdiomaSolicitado(solicitacao=obj, **i) for i in idiomas])
        if perguntas is not None:
            obj.perguntas.all().delete()
            PerguntaSolicitada.objects.bulk_create(
                [PerguntaSolicitada(solicitacao=obj, ordem=i, **p) for i, p in enumerate(perguntas)])
        return obj

    def create(self, validated):
        return self._gravar(SolicitacaoVaga(link=self.context["link"]), validated)

    def update(self, obj, validated):
        return self._gravar(obj, validated)


class SolicitacaoGestorSerializer(SolicitacaoSerializer):
    empresa = serializers.IntegerField(source="link.empresa_id", read_only=True)
    empresa_nome = serializers.CharField(source="link.empresa.__str__", read_only=True)
    link = serializers.PrimaryKeyRelatedField(read_only=True)
    revisado_por_nome = serializers.CharField(source="revisado_por.usuario.nome", read_only=True, default=None)

    class Meta(SolicitacaoSerializer.Meta):
        fields = ["id", "link", "empresa", "empresa_nome", "status", "vaga", "revisado_por",
                  "revisado_por_nome", "criada_em", "publicada_em",
                  *SolicitacaoSerializer.Meta.fields]
        read_only_fields = ["id", "status", "vaga", "revisado_por", "criada_em", "publicada_em"]


# ---------------------------------------------------------------------------
# Gestor e administração (JWT)
# ---------------------------------------------------------------------------


class GestorOuAdmin(BasePermission):
    message = "Acesso restrito à equipe do TEIA."

    def has_permission(self, request, view):
        u = request.user
        return bool((_eh_gestor(u) or _eh_admin(u)) and u.is_active)


class GestorRevisaAdminLe(GestorOuAdmin):
    """Leitura para gestor ou admin; editar, publicar e recusar só o gestor (autor da vaga)."""

    message = "Somente gestores do TEIA podem revisar vagas enviadas."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return super().has_permission(request, view)
        return _eh_gestor(request.user) and request.user.is_active


class LinkEmpresaViewSet(mixins.ListModelMixin, mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Links de envio. Gestor ou admin cria, lista e revoga (sem edição nem exclusão)."""

    serializer_class = LinkSerializer
    permission_classes = [GestorOuAdmin]
    throttle_scope = "gerar_link_empresa"

    def get_throttles(self):
        # Limita a geração (conta comprometida não cria links em massa); leitura e revogação livres.
        return [ScopedRateThrottle()] if self.action == "create" else []

    def get_queryset(self):
        qs = (LinkEmpresa.objects.select_related("empresa", "criado_por", "revogado_por", "solicitacaovaga")
              .order_by("-criado_em"))
        p = self.request.query_params
        if p.get("empresa"):
            qs = qs.filter(empresa=p["empresa"])
        situacao = p.get("situacao")
        agora = timezone.now()
        if situacao == "ativo":
            qs = qs.filter(pk__in=services.links_disponiveis().values("pk"))
        elif situacao == "utilizado":
            qs = qs.filter(solicitacaovaga__isnull=False)
        elif situacao == "revogado":
            qs = qs.filter(revogado=True)
        elif situacao == "expirado":
            qs = qs.filter(revogado=False, solicitacaovaga__isnull=True, expira_em__lte=agora)
        elif situacao == "encerrado":  # expirados ou revogados sem envio
            qs = qs.filter(solicitacaovaga__isnull=True).filter(Q(revogado=True) | Q(expira_em__lte=agora))
        return qs

    @action(detail=True, methods=["post"])
    def revogar(self, request, pk=None):
        with transaction.atomic():
            link = get_object_or_404(LinkEmpresa.objects.select_for_update(), pk=pk)
            link.revogar(request.user)
        return Response(self.get_serializer(self.get_queryset().get(pk=pk)).data)


class SolicitacaoGestorViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                               mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Revisão das vagas enviadas: editar (só pendentes), publicar ou recusar."""

    serializer_class = SolicitacaoGestorSerializer
    permission_classes = [GestorRevisaAdminLe]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        qs = (SolicitacaoVaga.objects
              .select_related("link__empresa", "revisado_por__usuario")
              .prefetch_related("cursos", "competencias__competencia", "idiomas", "perguntas")
              .order_by("-criada_em"))
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("empresa"):
            qs = qs.filter(link__empresa=p["empresa"])
        q = p.get("q", "").strip()
        if q:
            qs = qs.filter(Q(titulo__icontains=q) | Q(link__empresa__nome__icontains=q)
                           | Q(link__empresa__nome_fantasia__icontains=q))
        return qs

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            obj = get_object_or_404(SolicitacaoVaga.objects.select_for_update(), pk=kwargs["pk"])
            if obj.status != SolicitacaoVaga.Status.PENDENTE:
                return Response({"detail": "Somente solicitações pendentes podem ser editadas."},
                                status=status.HTTP_409_CONFLICT)
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(self.get_serializer(self.get_queryset().get(pk=obj.pk)).data)

    def _executar(self, acao, pk, codigo=status.HTTP_200_OK):
        self.get_object()  # 404 se não existir
        try:
            acao(pk, self.request.user)
        except services.DadosInvalidos as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(self.get_queryset().get(pk=pk)).data, status=codigo)

    @action(detail=True, methods=["post"])
    def publicar(self, request, pk=None):
        """Revalida com as regras de vaga aberta e cria a Vaga (idempotente)."""
        return self._executar(services.publicar, pk)

    @action(detail=True, methods=["post"])
    def recusar(self, request, pk=None):
        return self._executar(services.recusar, pk)


# ---------------------------------------------------------------------------
# Empresa (público, somente com token)
# ---------------------------------------------------------------------------


class _Publico:
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "formulario_empresa"

    def _link(self, token, bloquear=False):
        """Link disponível para o token. Token inexistente → 404; já indisponível → 410."""
        qs = services.links_disponiveis()
        if bloquear:
            qs = qs.select_for_update(of=("self",))
        link = LinkEmpresa.com_token(token, qs.select_related("empresa")).first()
        if link:
            return link
        existente = LinkEmpresa.com_token(token).select_related("empresa", "solicitacaovaga").first()
        if not existente:
            raise Http404
        raise _Indisponivel(services.situacao_link(existente))


class _Indisponivel(Exception):
    def __init__(self, situacao):
        self.situacao = situacao


MENSAGENS_INDISPONIVEL = {
    "revogado": "Este link foi revogado. Solicite um novo link ao TEIA.",
    "utilizado": "Este link já foi utilizado. Para enviar outra vaga, solicite um novo link ao TEIA.",
    "expirado": "Este link expirou. Solicite um novo link ao TEIA.",
    "empresa_inativa": "Este link não está disponível. Entre em contato com o TEIA.",
}


def _resposta_indisponivel(exc):
    return Response({"detail": MENSAGENS_INDISPONIVEL.get(exc.situacao, "Link indisponível."),
                     "situacao": exc.situacao}, status=status.HTTP_410_GONE)


class FormularioPublicoView(_Publico, APIView):
    """GET: dados para montar o formulário. POST: envia a vaga para revisão (uma vez por link)."""

    def get(self, request, token):
        try:
            link = self._link(token)
        except _Indisponivel as exc:
            return _resposta_indisponivel(exc)
        resposta = Response({
            "empresa": {"nome": str(link.empresa)},
            "expira_em": link.expira_em,
            "limites": {"requisitos_competencia": MAX_COMPETENCIAS, "requisitos_idioma": MAX_IDIOMAS,
                        "perguntas": MAX_PERGUNTAS},
            "opcoes": {
                "vaga_tipos": _escolhas(Vaga.Tipo),
                "vaga_modalidades": _escolhas(Vaga.Modalidade),
                "idiomas": _escolhas(Idioma),
                "niveis_idioma": _escolhas(NivelIdioma),
                "pergunta_formatos": _escolhas(CampoModelo.Formato),
                "cursos": list(Curso.objects.filter(ativo=True).order_by("nome")
                               .values("id", "nome", "total_periodos")),
            },
        })
        return _sem_cache(resposta)

    def post(self, request, token):
        try:
            with transaction.atomic():
                link = self._link(token, bloquear=True)
                serializer = SolicitacaoSerializer(data=request.data, context={"link": link})
                serializer.is_valid(raise_exception=True)
                obj = serializer.save()
        except _Indisponivel as exc:
            return _resposta_indisponivel(exc)
        except IntegrityError:
            return _resposta_indisponivel(_Indisponivel("utilizado"))
        return _sem_cache(Response(
            {"id": obj.pk, "status": obj.status, "criada_em": obj.criada_em,
             "detail": "Vaga recebida. Ela será revisada pelo TEIA antes da publicação."},
            status=status.HTTP_201_CREATED))


class CompetenciasPublicoView(_Publico, APIView):
    """Busca no vocabulário de competências (nome ou sinônimo) para quem tem um link válido."""

    def get(self, request, token):
        try:
            self._link(token)
        except _Indisponivel as exc:
            return _resposta_indisponivel(exc)
        qs = Competencia.objects.filter(ativa=True)
        q = request.query_params.get("q", "").strip()
        if q:
            chave = normalizar_termo(q)
            qs = qs.filter(Q(nome_normalizado__contains=chave)
                           | Q(sinonimos__termo_normalizado__contains=chave)).distinct()
        return _sem_cache(Response(list(qs.order_by("nome").values("id", "nome", "categoria")[:30])))


def _sem_cache(resposta):
    resposta["Cache-Control"] = "no-store"
    resposta["Referrer-Policy"] = "no-referrer"
    resposta["X-Robots-Tag"] = "noindex, nofollow"
    return resposta
