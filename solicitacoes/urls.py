from django.urls import path
from . import views

app_name = "solicitacoes"
urlpatterns = [
    path("recebida/", views.sucesso, name="sucesso"),
    path("<str:token>/", views.enviar, name="enviar"),
]
