from datetime import timedelta

from django.contrib import admin
from django.urls import reverse
from django.utils import timezone

from backend.models import Empresa, ModeloCurriculo, Usuario, Vaga

from .test_api import SENHA, BaseAPITest


class PainelAdminTests(BaseAPITest):
    """O tema (unfold) não pode quebrar nenhuma tela do admin."""

    def setUp(self):
        self.su = Usuario.objects.create_superuser(email="root@undb.edu.br", password=SENHA, nome="Root")
        self.client.force_login(self.su)
        self.vaga = Vaga.objects.create(
            empresa=Empresa.objects.create(nome="Empresa X"), gestor=self.gestor, titulo="Estágio",
            tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta",
            prazo=timezone.localdate() + timedelta(days=10),
        )

    def test_todas_as_listas_e_formularios_de_inclusao_abrem(self):
        for modelo, model_admin in admin.site._registry.items():
            meta = modelo._meta
            if not model_admin.has_view_permission(self._req()):
                continue  # ex.: solicitacoes é só para gestor (regra do próprio app)
            with self.subTest(modelo=meta.label):
                lista = reverse(f"admin:{meta.app_label}_{meta.model_name}_changelist")
                self.assertEqual(self.client.get(lista).status_code, 200)
                if model_admin.has_add_permission(self._req()):
                    novo = reverse(f"admin:{meta.app_label}_{meta.model_name}_add")
                    self.assertEqual(self.client.get(novo).status_code, 200)

    def _req(self):
        from django.test import RequestFactory

        r = RequestFactory().get("/")
        r.user = self.su
        return r

    def test_vaga_leva_ao_modelo_de_curriculo(self):
        url = reverse("admin:backend_vaga_change", args=[self.vaga.pk])
        self.assertContains(self.client.get(url), "Criar modelo de currículo")
        ModeloCurriculo.objects.create(vaga=self.vaga)
        self.assertContains(self.client.get(url), "Editar modelo de currículo (0 campos)")

    def test_gestor_abre_as_telas_de_solicitacoes_com_o_tema(self):
        u = self.gestor.usuario
        u.is_staff = True
        u.save(update_fields=["is_staff"])
        self.client.force_login(u)
        for nome in ("solicitacoes_linkempresa_changelist", "solicitacoes_solicitacaovaga_changelist"):
            with self.subTest(nome):
                self.assertEqual(self.client.get(reverse(f"admin:{nome}")).status_code, 200)
