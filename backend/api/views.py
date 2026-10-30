from datetime import timedelta

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.db.models.deletion import ProtectedError
from django.http import FileResponse
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from backend.compatibilidade import analisar
from backend.leitura_curriculo import LIMITE_BYTES, ArquivoInvalido, extrair, ler_arquivo
from backend.models import (
    Aluno,
    ArquivoCurriculo,
    Analise,
    Candidatura,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Encaminhamento,
    Experiencia,
    Formacao,
    Idioma,
    IdiomaPerfil,
    NivelIdioma,
    NivelProficiencia,
    NucleoCarreiras,
    PerfilCompetencias,
    Usuario,
    Vaga,
    normalizar_termo,
)

from .permissions import (
    AdminEscreveGestorLe,
    GestorEscreveAlunoLe,
    IsAdmin,
    IsAluno,
    IsAlunoComConsentimento,
    IsGestor,
    _eh_gestor,
)
from .serializers import (
    ArquivoCurriculoSerializer,
    CadastroAlunoSerializer,
    CandidatoDetalheSerializer,
    CandidatoSerializer,
    CompetenciaAdminSerializer,
    CursoAdminSerializer,
    DecisaoSerializer,
    NovoGestorSerializer,
    NucleoSerializer,
    UsuarioAdminSerializer,
    CandidaturaDetalheSerializer,
    CandidaturaListaSerializer,
    NovaCandidaturaSerializer,
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
# Importação do currículo em arquivo (PDF/DOCX)
# ---------------------------------------------------------------------------

_TIPOS_CONTEUDO = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _leitura(arquivo: ArquivoCurriculo, perfil: PerfilCompetencias) -> dict:
    return {
        "arquivo": ArquivoCurriculoSerializer(arquivo).data,
        "texto": arquivo.texto,
        "sugestoes": extrair(arquivo.texto, perfil),
    }


class ArquivoCurriculoView(APIView):
    """Envia (POST multipart `arquivo`), lê (GET) ou apaga (DELETE) o currículo em arquivo.

    GET devolve o texto completo lido do arquivo e as sugestões de preenchimento,
    recalculadas na hora (o vocabulário e o próprio perfil podem ter mudado).
    """

    permission_classes = [IsAlunoComConsentimento]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        perfil = _perfil_do_aluno(request.user)
        arquivo = ArquivoCurriculo.objects.filter(perfil=perfil).first()
        if arquivo is None:
            return Response({"detail": "Nenhum arquivo enviado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_leitura(arquivo, perfil))

    def post(self, request):
        enviado = request.FILES.get("arquivo")
        if enviado is None:
            return Response({"arquivo": ["Envie o arquivo do currículo."]}, status=status.HTTP_400_BAD_REQUEST)
        if enviado.size > LIMITE_BYTES:
            return Response({"arquivo": ["O arquivo passa de 5 MB. Envie uma versão menor."]}, status=status.HTTP_400_BAD_REQUEST)
        conteudo = enviado.read()
        try:
            leitura = ler_arquivo(conteudo, enviado.name)
        except ArquivoInvalido as exc:
            return Response({"arquivo": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

        perfil = _perfil_do_aluno(request.user)
        nome = (enviado.name or f"curriculo.{leitura.tipo}")[-255:]
        with transaction.atomic():
            # Um arquivo por aluno: o novo substitui o anterior (e o anterior sai do disco).
            ArquivoCurriculo.objects.filter(perfil=perfil).delete()
            arquivo = ArquivoCurriculo(
                perfil=perfil,
                nome_original=nome,
                tipo=leitura.tipo,
                tamanho=len(conteudo),
                paginas=leitura.paginas,
                texto=leitura.texto,
            )
            arquivo.arquivo.save(f"curriculo.{leitura.tipo}", ContentFile(conteudo), save=False)
            arquivo.save()
        return Response(_leitura(arquivo, perfil), status=status.HTTP_201_CREATED)

    def delete(self, request):
        ArquivoCurriculo.objects.filter(perfil=_perfil_do_aluno(request.user)).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArquivoCurriculoOriginalView(APIView):
    """O arquivo original, como foi enviado. `?baixar=1` força o download."""

    permission_classes = [IsAlunoComConsentimento]

    def get(self, request):
        arquivo = ArquivoCurriculo.objects.filter(perfil=_perfil_do_aluno(request.user)).first()
        if arquivo is None or not arquivo.arquivo:
            return Response({"detail": "Nenhum arquivo enviado."}, status=status.HTTP_404_NOT_FOUND)
        try:
            conteudo = arquivo.arquivo.open("rb")
        except FileNotFoundError:
            return Response({"detail": "O arquivo não está mais disponível. Envie de novo."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            conteudo,
            as_attachment=request.query_params.get("baixar") == "1",
            filename=arquivo.nome_original,
            content_type=_TIPOS_CONTEUDO[arquivo.tipo],
        )


class ImportarCurriculoView(APIView):
    """Adiciona ao perfil, de uma vez, os itens que o aluno confirmou das sugestões.

    Corpo: `{formacoes: [...], experiencias: [...], competencias: [...], idiomas: [...],
    cursos: [...]}` com os mesmos campos das rotas de cada seção. Itens repetidos são
    ignorados; itens inválidos voltam em `erros` sem impedir os demais.
    """

    permission_classes = [IsAlunoComConsentimento]
    SECOES = {
        "formacoes": FormacaoSerializer,
        "experiencias": ExperienciaSerializer,
        "competencias": CompetenciaDoPerfilSerializer,
        "idiomas": IdiomaPerfilSerializer,
        "cursos": CursoComplementarSerializer,
    }

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Envie um objeto com as seções."}, status=status.HTTP_400_BAD_REQUEST)
        perfil = _perfil_do_aluno(request.user)
        criados = {secao: 0 for secao in self.SECOES}
        ignorados = 0
        erros = []

        for secao, serializer_class in self.SECOES.items():
            itens = request.data.get(secao) or []
            if not isinstance(itens, list):
                erros.append({"secao": secao, "indice": None, "erros": {"detail": ["Envie uma lista."]}})
                continue
            for indice, item in enumerate(itens[:100]):
                if not isinstance(item, dict):
                    continue
                if self._repetido(perfil, secao, item):
                    ignorados += 1
                    continue
                ser = serializer_class(data=item, context={"perfil": perfil, "request": request})
                if not ser.is_valid():
                    erros.append({"secao": secao, "indice": indice, "erros": ser.errors})
                    continue
                with transaction.atomic():
                    ser.save(perfil=perfil)
                criados[secao] += 1

        perfil.save(update_fields=["atualizado_em"])
        return Response(
            {
                "criados": criados,
                "ignorados": ignorados,
                "erros": erros,
                "perfil": PerfilSerializer(perfil).data,
            },
            status=status.HTTP_201_CREATED if sum(criados.values()) else status.HTTP_200_OK,
        )

    @staticmethod
    def _repetido(perfil, secao: str, item: dict) -> bool:
        def igual(a, b) -> bool:
            return normalizar_termo(str(a or "")) == normalizar_termo(str(b or ""))

        if secao == "competencias":
            return perfil.competencias.filter(competencia_id=item.get("competencia")).exists()
        if secao == "idiomas":
            return perfil.idiomas.filter(idioma=item.get("idioma")).exists()
        if secao == "formacoes":
            return any(igual(f.curso, item.get("curso")) and igual(f.instituicao, item.get("instituicao")) for f in perfil.formacoes.all())
        if secao == "experiencias":
            return any(igual(e.funcao, item.get("funcao")) and igual(e.organizacao, item.get("organizacao")) for e in perfil.experiencias.all())
        if secao == "cursos":
            return any(igual(c.nome, item.get("nome")) for c in perfil.cursos.all())
        return False


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


class EmpresaViewSet(viewsets.ModelViewSet):
    """Gestor consulta (para cadastrar vagas); a administração mantém o cadastro."""

    serializer_class = EmpresaSerializer
    permission_classes = [AdminEscreveGestorLe]

    def destroy(self, request, *args, **kwargs):
        empresa = self.get_object()
        try:
            empresa.delete()
        except ProtectedError:
            return Response(
                {"detail": "Esta empresa tem vagas cadastradas. Desative-a em vez de excluir."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

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
            qs = qs.annotate(
                n_candidaturas=Count("candidaturas", distinct=True),
                n_aguardando=Count(
                    "candidaturas",
                    filter=Q(candidaturas__status=Candidatura.Status.ANALISADA),
                    distinct=True,
                ),
            )
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

    @action(detail=True, methods=["get"], permission_classes=[IsGestor])
    def candidatos(self, request, pk=None):
        """Candidatos da vaga ordenados por compatibilidade (nunca filtrados por nota)."""
        vaga = self.get_object()
        qs = _candidaturas_gestor().filter(vaga=vaga)
        etapa = request.query_params.get("status")
        if etapa:
            qs = qs.filter(status=etapa)
        candidatos = CandidatoSerializer(qs, many=True).data
        candidatos.sort(
            key=lambda c: (-(c["analise"]["score"] if c["analise"] else -1), c["criada_em"])
        )
        contagem = dict(
            vaga.candidaturas.values_list("status").annotate(n=Count("id")).order_by()
        )
        return Response(
            {
                "requisitos": _ordem_requisitos(vaga),
                "contagem": {s: contagem.get(s, 0) for s, _ in Candidatura.Status.choices},
                "candidatos": candidatos,
            }
        )

# ---------------------------------------------------------------------------
# Candidaturas do aluno
# ---------------------------------------------------------------------------


class CandidaturaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """O aluno se candidata, acompanha o status e atualiza a análise.

    Criar a candidatura já gera a primeira análise. O status só muda pela
    decisão humana do gestor (admin, por enquanto).
    """

    permission_classes = [IsAlunoComConsentimento]
    pagination_class = None

    def get_queryset(self):
        qs = (
            Candidatura.objects.filter(aluno=self.request.user.aluno)
            .select_related("vaga__empresa", "encaminhamento")
            .prefetch_related(
                Prefetch("analises", queryset=Analise.objects.order_by("-criada_em"))
            )
            .order_by("-criada_em")
        )
        vaga = self.request.query_params.get("vaga")
        if vaga and vaga.isdigit():
            qs = qs.filter(vaga_id=vaga)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CandidaturaListaSerializer
        return CandidaturaDetalheSerializer

    def _detalhe(self, pk, codigo=status.HTTP_200_OK):
        candidatura = self.get_queryset().get(pk=pk)
        return Response(CandidaturaDetalheSerializer(candidatura).data, status=codigo)

    def create(self, request, *args, **kwargs):
        aluno = request.user.aluno
        ser = NovaCandidaturaSerializer(data=request.data, context={"aluno": aluno})
        ser.is_valid(raise_exception=True)
        candidatura = Candidatura.objects.create(aluno=aluno, vaga=ser.validated_data["vaga"])
        analisar(candidatura)
        return self._detalhe(candidatura.pk, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reanalisar(self, request, pk=None):
        """Nova análise com o currículo atual; as anteriores ficam no histórico."""
        candidatura = self.get_object()
        analisar(candidatura)
        return self._detalhe(candidatura.pk)


# ---------------------------------------------------------------------------
# Triagem e decisão (gestor do TEIA)
# ---------------------------------------------------------------------------


def _ordem_requisitos(vaga) -> list[dict]:
    """Requisitos na mesma ordem em que o motor avalia (curso, semestre, competências, idiomas)."""
    ordem = []
    if vaga.cursos.exists():
        ordem.append({"requisito": "Curso", "tipo": "curso", "obrigatorio": True})
    if vaga.periodo_minimo:
        ordem.append({"requisito": "Semestre mínimo", "tipo": "periodo", "obrigatorio": True})
    for req in vaga.requisitos_competencia.select_related("competencia"):
        ordem.append(
            {"requisito": req.competencia.nome, "tipo": "competencia", "obrigatorio": req.obrigatorio}
        )
    for req in vaga.requisitos_idioma.all():
        ordem.append(
            {"requisito": req.get_idioma_display(), "tipo": "idioma", "obrigatorio": req.obrigatorio}
        )
    return ordem


def _candidaturas_gestor():
    return Candidatura.objects.select_related(
        "aluno__usuario", "aluno__curso", "vaga__empresa", "encaminhamento__gestor__usuario"
    ).prefetch_related(Prefetch("analises", queryset=Analise.objects.order_by("-criada_em")))


class PainelGestorView(APIView):
    """Resumo da tela inicial: o que espera decisão e o que vence logo."""

    permission_classes = [IsGestor]

    def get(self, request):
        hoje = timezone.localdate()
        abertas = Vaga.objects.filter(status=Vaga.Status.ABERTA).filter(
            Q(prazo__isnull=True) | Q(prazo__gte=hoje)
        )
        aguardando = Candidatura.objects.filter(
            status=Candidatura.Status.ANALISADA, vaga__in=abertas
        )
        mais_antiga = aguardando.order_by("criada_em").values_list("criada_em", flat=True).first()
        vencendo = (
            abertas.filter(prazo__lte=hoje + timedelta(days=7))
            .select_related("empresa")
            .annotate(
                n_aguardando=Count(
                    "candidaturas", filter=Q(candidaturas__status=Candidatura.Status.ANALISADA)
                )
            )
            .order_by("prazo")
        )
        com_fila = (
            abertas.select_related("empresa")
            .annotate(
                n_aguardando=Count(
                    "candidaturas", filter=Q(candidaturas__status=Candidatura.Status.ANALISADA)
                ),
                n_candidaturas=Count("candidaturas"),
            )
            .filter(n_aguardando__gt=0)
            .order_by("prazo", "-n_aguardando")
        )
        recentes = _candidaturas_gestor().order_by("-criada_em")[:5]
        ordens: dict[int, list[dict]] = {}

        def recente(c):
            a = next(iter(c.analises.all()), None)
            if c.vaga_id not in ordens:
                ordens[c.vaga_id] = _ordem_requisitos(c.vaga)
            return {
                "id": c.id,
                "aluno": c.aluno.usuario.nome,
                "vaga": {"id": c.vaga_id, "titulo": c.vaga.titulo},
                "score": a.score if a else None,
                "status": c.status,
                "criada_em": c.criada_em,
                # A faixa de evidência também no painel: o score nunca aparece sozinho.
                "requisitos": ordens[c.vaga_id],
                "itens": list(a.requisitos_atendidos) + list(a.requisitos_faltantes) if a else [],
            }

        def vaga_resumo(v):
            return {
                "id": v.id,
                "titulo": v.titulo,
                "empresa": str(v.empresa),
                "prazo": v.prazo,
                "aguardando": v.n_aguardando,
                "total": getattr(v, "n_candidaturas", None),
            }

        return Response(
            {
                "vagas_abertas": abertas.count(),
                "rascunhos": Vaga.objects.filter(status=Vaga.Status.RASCUNHO).count(),
                "aguardando": aguardando.count(),
                "aguardando_desde": mais_antiga,
                "encaminhadas_30d": Encaminhamento.objects.filter(
                    criado_em__gte=timezone.now() - timedelta(days=30)
                ).count(),
                "vencendo": [vaga_resumo(v) for v in vencendo],
                "fila": [vaga_resumo(v) for v in com_fila],
                "recentes": [recente(c) for c in recentes],
            }
        )


class CandidaturaGestorViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Detalhe da candidatura para o gestor e a decisão humana sobre ela."""

    permission_classes = [IsGestor]
    serializer_class = CandidatoDetalheSerializer

    def get_queryset(self):
        return _candidaturas_gestor()

    @action(detail=True, methods=["post"])
    def decidir(self, request, pk=None):
        candidatura = self.get_object()
        ser = DecisaoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        novo = ser.validated_data["status"]
        observacao = ser.validated_data.get("observacao")

        with transaction.atomic():
            if novo in (Candidatura.Status.ENCAMINHADA, Candidatura.Status.EM_PROCESSO):
                enc, criado = Encaminhamento.objects.get_or_create(
                    candidatura=candidatura,
                    defaults={"gestor": request.user.gestor, "observacao": observacao or ""},
                )
                if not criado and observacao is not None:
                    enc.observacao = observacao
                    enc.save(update_fields=["observacao"])
            elif novo == Candidatura.Status.ANALISADA:
                # Desfazer: volta para a fila sem registro de encaminhamento.
                Encaminhamento.objects.filter(candidatura=candidatura).delete()
            elif observacao is not None and hasattr(candidatura, "encaminhamento"):
                candidatura.encaminhamento.observacao = observacao
                candidatura.encaminhamento.save(update_fields=["observacao"])
            candidatura.status = novo
            candidatura.save(update_fields=["status", "atualizada_em"])

        return Response(CandidatoDetalheSerializer(self.get_queryset().get(pk=candidatura.pk)).data)


# ---------------------------------------------------------------------------
# Administração
# ---------------------------------------------------------------------------


class ResumoAdminView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        hoje = timezone.localdate()
        alunos = Aluno.objects.all()
        com_termo = sum(1 for a in alunos.only("consentimento_lgpd", "versao_termo_lgpd") if a.consentimento_vigente)
        candidaturas = dict(
            Candidatura.objects.values_list("status").annotate(n=Count("id")).order_by()
        )
        return Response(
            {
                "usuarios": {
                    "alunos": alunos.count(),
                    "gestores": Usuario.objects.filter(perfil=Usuario.Perfil.GESTOR).count(),
                    "admins": Usuario.objects.filter(perfil=Usuario.Perfil.ADMIN).count(),
                    "inativos": Usuario.objects.filter(is_active=False).count(),
                },
                "lgpd": {"com_termo": com_termo, "sem_termo": alunos.count() - com_termo},
                "vagas": {
                    "abertas": Vaga.objects.filter(status=Vaga.Status.ABERTA)
                    .filter(Q(prazo__isnull=True) | Q(prazo__gte=hoje))
                    .count(),
                    "rascunhos": Vaga.objects.filter(status=Vaga.Status.RASCUNHO).count(),
                    "encerradas": Vaga.objects.filter(status=Vaga.Status.ENCERRADA).count(),
                },
                "candidaturas": {s: candidaturas.get(s, 0) for s, _ in Candidatura.Status.choices},
                "empresas": {
                    "ativas": Empresa.objects.filter(ativa=True).count(),
                    "convenio_a_vencer": Empresa.objects.filter(
                        ativa=True, convenio_status=Empresa.ConvenioStatus.A_VENCER
                    ).count(),
                    "convenio_vencido": Empresa.objects.filter(
                        ativa=True, convenio_status=Empresa.ConvenioStatus.VENCIDO
                    ).count(),
                },
                "catalogo": {
                    "competencias": Competencia.objects.filter(ativa=True).count(),
                    "cursos": Curso.objects.filter(ativo=True).count(),
                },
            }
        )


class UsuarioAdminViewSet(SemDelete, viewsets.ModelViewSet):
    """Contas: listar, criar gestor, editar nome/cargo e ativar ou desativar o acesso."""

    permission_classes = [IsAdmin]
    serializer_class = UsuarioAdminSerializer

    def get_queryset(self):
        qs = Usuario.objects.select_related("aluno__curso", "gestor__nucleo").order_by("nome")
        p = self.request.query_params
        if p.get("perfil"):
            qs = qs.filter(perfil=p["perfil"])
        if p.get("ativo") in {"true", "false"}:
            qs = qs.filter(is_active=p["ativo"] == "true")
        q = p.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(nome__icontains=q) | Q(email__icontains=q) | Q(aluno__matricula__icontains=q)
            )
        return qs

    def create(self, request, *args, **kwargs):
        ser = NovoGestorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        usuario = ser.save()
        return Response(
            UsuarioAdminSerializer(usuario, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class NucleoViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = NucleoSerializer
    pagination_class = None
    queryset = NucleoCarreiras.objects.order_by("nome")


class _ExcluiSemUso:
    """DELETE só quando nada aponta para o registro; caso contrário, orienta a desativar."""

    mensagem_em_uso = "Este registro está em uso. Desative-o em vez de excluir."

    def destroy(self, request, *args, **kwargs):
        try:
            self.get_object().delete()
        except ProtectedError:
            return Response({"detail": self.mensagem_em_uso}, status=status.HTTP_409_CONFLICT)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CompetenciaAdminViewSet(_ExcluiSemUso, viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = CompetenciaAdminSerializer
    mensagem_em_uso = (
        "Esta competência aparece em currículos ou vagas. Desative-a em vez de excluir."
    )

    def get_queryset(self):
        qs = Competencia.objects.prefetch_related("sinonimos").annotate(
            n_alunos=Count("perfis", distinct=True), n_vagas=Count("requisitos", distinct=True)
        )
        p = self.request.query_params
        q = p.get("q", "").strip()
        if q:
            chave = normalizar_termo(q)
            qs = qs.filter(
                Q(nome_normalizado__contains=chave)
                | Q(sinonimos__termo_normalizado__contains=chave)
            ).distinct()
        if p.get("categoria"):
            qs = qs.filter(categoria=p["categoria"])
        if p.get("ativa") in {"true", "false"}:
            qs = qs.filter(ativa=p["ativa"] == "true")
        return qs.order_by("nome")


class CursoAdminViewSet(_ExcluiSemUso, viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = CursoAdminSerializer
    pagination_class = None
    mensagem_em_uso = "Este curso tem alunos matriculados. Desative-o em vez de excluir."

    def get_queryset(self):
        return Curso.objects.annotate(n_alunos=Count("alunos")).order_by("nome")
