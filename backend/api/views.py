from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from backend.models import (
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Experiencia,
    Formacao,
    Idioma,
    IdiomaPerfil,
    NivelIdioma,
    NivelProficiencia,
    PerfilCompetencias,
    Vaga,
    normalizar_termo,
)

from .permissions import (
    GestorEscreveAlunoLe,
    IsAluno,
    IsAlunoComConsentimento,
    IsGestor,
    _eh_gestor,
)
from .serializers import (
    CadastroAlunoSerializer,
    CompetenciaDoPerfilSerializer,
    CompetenciaSerializer,
    ConsentimentoSerializer,
    CursoComplementarSerializer,
    CursoSerializer,
    EmpresaSerializer,
    ExperienciaSerializer,
    FormacaoSerializer,
    IdiomaPerfilSerializer,
    LoginSerializer,
    LogoutSerializer,
    PerfilSerializer,
    UsuarioSerializer,
    VagaAlunoSerializer,
    VagaSerializer,
)


class SemDelete:
    """Desativa DELETE (vagas e empresas são encerradas/desativadas, nunca apagadas)."""

    http_method_names = ["get", "post", "put", "patch", "head", "options"]


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------


class _Throttled:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class LoginView(_Throttled, TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class RefreshView(_Throttled, TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []


class CadastroAlunoView(_Throttled, APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = CadastroAlunoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        aluno = ser.save()
        refresh = RefreshToken.for_user(aluno.usuario)
        refresh["perfil"] = aluno.usuario.perfil
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "usuario": UsuarioSerializer(aluno.usuario).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """Invalida o refresh token (blacklist). O access expira sozinho."""

    def post(self, request):
        ser = LogoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            RefreshToken(ser.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response(
                {"detail": "Token inválido ou já expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class ConsentimentoView(APIView):
    permission_classes = [IsAluno]

    def post(self, request):
        ser = ConsentimentoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        request.user.aluno.registrar_consentimento(ser.validated_data["aceito"])
        return Response(UsuarioSerializer(request.user).data)


# ---------------------------------------------------------------------------
# Perfil do aluno
# ---------------------------------------------------------------------------


def _perfil_do_aluno(user) -> PerfilCompetencias:
    perfil, _ = PerfilCompetencias.objects.get_or_create(aluno=user.aluno)
    return perfil


class PerfilView(APIView):
    permission_classes = [IsAlunoComConsentimento]

    def get(self, request):
        return Response(PerfilSerializer(_perfil_do_aluno(request.user)).data)


class SecaoPerfilViewSet(viewsets.ModelViewSet):
    """CRUD de uma seção do perfil, sempre restrito ao perfil do próprio aluno."""

    permission_classes = [IsAlunoComConsentimento]
    pagination_class = None

    def get_queryset(self):
        return self.queryset.model.objects.filter(
            perfil=_perfil_do_aluno(self.request.user)
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.request and self.request.user.is_authenticated and hasattr(
            self.request.user, "aluno"
        ):
            ctx["perfil"] = _perfil_do_aluno(self.request.user)
        return ctx

    def perform_create(self, serializer):
        serializer.save(perfil=self.get_serializer_context()["perfil"])


class FormacaoViewSet(SecaoPerfilViewSet):
    queryset = Formacao.objects.all()
    serializer_class = FormacaoSerializer


class ExperienciaViewSet(SecaoPerfilViewSet):
    queryset = Experiencia.objects.all()
    serializer_class = ExperienciaSerializer


class CompetenciaDoPerfilViewSet(SecaoPerfilViewSet):
    queryset = CompetenciaDoPerfil.objects.select_related("competencia")
    serializer_class = CompetenciaDoPerfilSerializer


class IdiomaPerfilViewSet(SecaoPerfilViewSet):
    queryset = IdiomaPerfil.objects.all()
    serializer_class = IdiomaPerfilSerializer


class CursoComplementarViewSet(SecaoPerfilViewSet):
    queryset = CursoComplementar.objects.all()
    serializer_class = CursoComplementarSerializer


# ---------------------------------------------------------------------------
# Catálogos
# ---------------------------------------------------------------------------


class CursoViewSet(viewsets.ReadOnlyModelViewSet):
    """Público: necessário na tela de cadastro, antes do login."""

    queryset = Curso.objects.filter(ativo=True).order_by("nome")
    serializer_class = CursoSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    pagination_class = None


class CompetenciaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CompetenciaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Competencia.objects.filter(ativa=True)
        q = self.request.query_params.get("q", "").strip()
        if q:
            chave = normalizar_termo(q)
            qs = qs.filter(
                Q(nome_normalizado__contains=chave)
                | Q(sinonimos__termo_normalizado__contains=chave)
            ).distinct()
        categoria = self.request.query_params.get("categoria")
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs.order_by("nome")


class OpcoesView(APIView):
    """Públicas: listas de valores válidos para montar os formulários do app."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @staticmethod
    def _choices(cls):
        return [{"valor": v, "rotulo": str(r)} for v, r in cls.choices]

    def get(self, request):
        return Response(
            {
                "idiomas": self._choices(Idioma),
                "niveis_idioma": self._choices(NivelIdioma),
                "niveis_proficiencia": self._choices(NivelProficiencia),
                "formacao_niveis": self._choices(Formacao.Nivel),
                "experiencia_tipos": self._choices(Experiencia.Tipo),
                "competencia_categorias": self._choices(Competencia.Categoria),
                "vaga_tipos": self._choices(Vaga.Tipo),
                "vaga_modalidades": self._choices(Vaga.Modalidade),
                "vaga_status": self._choices(Vaga.Status),
                "convenio_status": self._choices(Empresa.ConvenioStatus),
            }
        )


# ---------------------------------------------------------------------------
# Empresas e vagas
# ---------------------------------------------------------------------------


class EmpresaViewSet(SemDelete, viewsets.ModelViewSet):
    serializer_class = EmpresaSerializer
    permission_classes = [IsGestor]

    def get_queryset(self):
        qs = Empresa.objects.order_by("nome")
        p = self.request.query_params
        q = p.get("q", "").strip()
        if q:
            qs = qs.filter(Q(nome__icontains=q) | Q(nome_fantasia__icontains=q))
        ativa = p.get("ativa")
        if ativa in {"true", "false"}:
            qs = qs.filter(ativa=ativa == "true")
        return qs


class VagaViewSet(SemDelete, viewsets.ModelViewSet):
    permission_classes = [GestorEscreveAlunoLe]

    def _gestor(self) -> bool:
        return _eh_gestor(self.request.user)

    def get_serializer_class(self):
        return VagaSerializer if self._gestor() else VagaAlunoSerializer

    def get_queryset(self):
        qs = (
            Vaga.objects.select_related("empresa")
            .prefetch_related(
                "cursos", "requisitos_competencia__competencia", "requisitos_idioma"
            )
            .order_by("-criada_em")
        )
        p = self.request.query_params

        if self._gestor():
            if p.get("status"):
                qs = qs.filter(status=p["status"])
        else:
            hoje = timezone.localdate()
            qs = qs.filter(status=Vaga.Status.ABERTA).filter(
                Q(prazo__isnull=True) | Q(prazo__gte=hoje)
            )

        if p.get("tipo"):
            qs = qs.filter(tipo=p["tipo"])
        if p.get("modalidade"):
            qs = qs.filter(modalidade=p["modalidade"])
        if p.get("curso"):
            # Vaga sem cursos listados é aberta a qualquer curso.
            qs = qs.filter(Q(cursos=p["curso"]) | Q(cursos__isnull=True))
        q = p.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(titulo__icontains=q)
                | Q(empresa__nome__icontains=q)
                | Q(empresa__nome_fantasia__icontains=q)
            )
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(gestor=self.request.user.gestor)