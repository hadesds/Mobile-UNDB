from django.urls import include, path
from rest_framework.routers import SimpleRouter

from . import api

gestor = SimpleRouter()
gestor.register("links-empresa", api.LinkEmpresaViewSet, basename="gestor-link-empresa")
gestor.register("solicitacoes", api.SolicitacaoGestorViewSet, basename="gestor-solicitacao")

urlpatterns = [
    path("gestor/", include(gestor.urls)),
    path("empresas/formulario/<str:token>/", api.FormularioPublicoView.as_view(),
         name="formulario-empresa"),
    path("empresas/formulario/<str:token>/competencias/", api.CompetenciasPublicoView.as_view(),
         name="formulario-empresa-competencias"),
]
