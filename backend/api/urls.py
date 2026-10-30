from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("cursos", views.CursoViewSet, basename="curso")
router.register("competencias", views.CompetenciaViewSet, basename="competencia")
router.register("empresas", views.EmpresaViewSet, basename="empresa")
router.register("vagas", views.VagaViewSet, basename="vaga")
router.register("candidaturas", views.CandidaturaViewSet, basename="candidatura")

gestor_router = DefaultRouter()
gestor_router.register(
    "candidaturas", views.CandidaturaGestorViewSet, basename="gestor-candidatura"
)

admin_router = DefaultRouter()
admin_router.register("usuarios", views.UsuarioAdminViewSet, basename="admin-usuario")
admin_router.register("nucleos", views.NucleoViewSet, basename="admin-nucleo")
admin_router.register("competencias", views.CompetenciaAdminViewSet, basename="admin-competencia")
admin_router.register("cursos", views.CursoAdminViewSet, basename="admin-curso")

perfil_router = DefaultRouter()
perfil_router.register("formacoes", views.FormacaoViewSet, basename="formacao")
perfil_router.register("experiencias", views.ExperienciaViewSet, basename="experiencia")
perfil_router.register(
    "competencias", views.CompetenciaDoPerfilViewSet, basename="perfil-competencia"
)
perfil_router.register("idiomas", views.IdiomaPerfilViewSet, basename="perfil-idioma")
perfil_router.register("cursos", views.CursoComplementarViewSet, basename="perfil-curso")

urlpatterns = [
    path("auth/register/", views.CadastroAlunoView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", views.RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("me/consentimento/", views.ConsentimentoView.as_view(), name="me-consentimento"),
    path("me/perfil/", views.PerfilView.as_view(), name="me-perfil"),
    path("me/perfil/arquivo/", views.ArquivoCurriculoView.as_view(), name="me-perfil-arquivo"),
    path(
        "me/perfil/arquivo/original/",
        views.ArquivoCurriculoOriginalView.as_view(),
        name="me-perfil-arquivo-original",
    ),
    path("me/perfil/importar/", views.ImportarCurriculoView.as_view(), name="me-perfil-importar"),
    path("me/perfil/", include(perfil_router.urls)),
    path("opcoes/", views.OpcoesView.as_view(), name="opcoes"),
    path("gestor/painel/", views.PainelGestorView.as_view(), name="gestor-painel"),
    path("gestor/", include(gestor_router.urls)),
    path("admin/resumo/", views.ResumoAdminView.as_view(), name="admin-resumo"),
    path("admin/", include(admin_router.urls)),
    path("", include(router.urls)),
]