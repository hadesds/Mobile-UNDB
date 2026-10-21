from datetime import timedelta
from django.contrib.auth.models import Permission
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from backend.models import Usuario, Gestor, Faculdade, NucleoCarreiras, Empresa, Competencia, Vaga
from .models import LinkEmpresa, SolicitacaoVaga, CompetenciaSolicitada
from .services import publicar


class FluxoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        fac = Faculdade.objects.create(nome="UNDB", sigla="UNDB")
        nucleo = NucleoCarreiras.objects.create(faculdade=fac, nome="TEIA")
        cls.user = Usuario.objects.create_user(email="gestor@example.com", nome="Gestor", perfil="gestor", is_staff=True)
        cls.gestor = Gestor.objects.create(usuario=cls.user, nucleo=nucleo)
        cls.user.user_permissions.set(Permission.objects.filter(content_type__app_label="solicitacoes"))
        cls.empresa = Empresa.objects.create(nome="Empresa")
        cls.comp = Competencia.objects.create(nome="Python")

    def setUp(self):
        self.link = LinkEmpresa.objects.create(empresa=self.empresa, gestor=self.gestor)
        self.url = reverse("solicitacoes:enviar", args=[self.link.token])

    def payload(self):
        return {"titulo": "Desenvolvedor", "tipo": "clt", "modalidade": "remoto",
                "competencias-TOTAL_FORMS": "1", "competencias-INITIAL_FORMS": "0",
                "competencias-0-competencia": str(self.comp.pk), "competencias-0-obrigatorio": "on",
                "idiomas-TOTAL_FORMS": "0", "idiomas-INITIAL_FORMS": "0"}

    def enviar(self):
        response = self.client.post(self.url, self.payload())
        self.assertEqual(response.status_code, 302, response.content)
        return SolicitacaoVaga.objects.get(link=self.link)

    def test_fluxo_e_publicacao_idempotente(self):
        self.assertContains(self.client.get(self.url), "Envie uma vaga")
        obj = self.enviar()
        self.assertEqual(obj.status, "pendente")
        self.assertFalse(Vaga.objects.exists())
        self.assertEqual(self.client.post(self.url, self.payload()).status_code, 404)
        vaga = publicar(obj.pk, self.user)
        self.assertEqual(publicar(obj.pk, self.user).pk, vaga.pk)
        self.assertEqual(Vaga.objects.count(), 1)
        self.assertEqual(vaga.gestor, self.gestor)
        self.assertEqual(vaga.status, "aberta")
        self.assertEqual(vaga.requisitos_competencia.get().competencia, self.comp)
        obj.refresh_from_db()
        self.assertEqual(obj.revisado_por, self.gestor)
        self.assertIsNotNone(obj.publicada_em)

    def test_dados_controlados_pelo_servidor(self):
        dados = self.payload()
        dados.update(status="publicada", empresa="9999", gestor="9999", vaga="9999", revisado_por="9999", link="9999")
        self.assertEqual(self.client.post(self.url, dados).status_code, 302)
        obj = SolicitacaoVaga.objects.get()
        self.assertEqual(obj.link, self.link)
        self.assertEqual(obj.status, "pendente")
        self.assertIsNone(obj.vaga_id)
        self.assertIsNone(obj.revisado_por_id)

    def test_links_indisponiveis(self):
        for campo, valor in [("revogado", True), ("expira_em", timezone.now()-timedelta(seconds=1))]:
            original = getattr(self.link, campo)
            setattr(self.link, campo, valor)
            self.link.save()
            for metodo in [self.client.get, self.client.post]:
                self.assertEqual(metodo(self.url).status_code, 404)
            setattr(self.link, campo, original)
        self.empresa.ativa = False
        self.empresa.save()
        self.link.save()
        self.assertEqual(self.client.post(self.url, self.payload()).status_code, 404)
        self.assertEqual(self.client.get(reverse("solicitacoes:enviar", args=["invalido"])).status_code, 404)

    def test_csrf(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post(self.url, self.payload()).status_code, 403)

    def test_validacao_formulario(self):
        dados = self.payload()
        dados["periodo_minimo"] = "21"
        self.assertEqual(self.client.post(self.url, dados).status_code, 200)
        self.assertFalse(SolicitacaoVaga.objects.exists())
        dados = self.payload()
        dados["competencias-TOTAL_FORMS"] = "2"
        dados["competencias-1-competencia"] = str(self.comp.pk)
        self.assertEqual(self.client.post(self.url, dados).status_code, 200)
        self.assertFalse(SolicitacaoVaga.objects.exists())

    def test_revalida_antes_de_publicar(self):
        obj = self.enviar()
        for alteracao in ["prazo", "competencia", "empresa", "requisitos"]:
            with self.subTest(alteracao=alteracao):
                if alteracao == "prazo":
                    obj.prazo = timezone.localdate()-timedelta(days=1)
                    obj.save()
                elif alteracao == "competencia":
                    obj.prazo = None
                    obj.save()
                    self.comp.ativa = False
                    self.comp.save()
                elif alteracao == "empresa":
                    self.comp.ativa = True
                    self.comp.save()
                    self.empresa.ativa = False
                    self.empresa.save()
                else:
                    self.empresa.ativa = True
                    self.empresa.save()
                    obj.competencias.all().delete()
                with self.assertRaises(ValidationError):
                    publicar(obj.pk, self.user)
                self.assertFalse(Vaga.objects.exists())

    def test_admin_confirmacao_edicao_e_permissoes(self):
        obj = self.enviar()
        self.client.force_login(self.user)
        change = reverse("admin:solicitacoes_solicitacaovaga_change", args=[obj.pk])
        self.assertContains(self.client.get(change), "Desenvolvedor")
        dados = self.payload()
        dados.update(titulo="Título revisado", cursos=[], _save="Salvar")
        dados["competencias-INITIAL_FORMS"] = "1"
        dados["competencias-0-id"] = str(obj.competencias.get().pk)
        dados["competencias-0-solicitacao"] = str(obj.pk)
        response = self.client.post(change, dados)
        self.assertEqual(response.status_code, 302, response.context and response.context["adminform"].form.errors)
        obj.refresh_from_db()
        self.assertEqual(obj.titulo, "Título revisado")
        url = reverse("admin:solicitacoes_publicar", args=[obj.pk])
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertFalse(Vaga.objects.exists())
        self.assertEqual(self.client.post(url).status_code, 302)
        self.assertEqual(Vaga.objects.get().titulo, "Título revisado")
        self.assertEqual(self.client.post(change, dados).status_code, 403)
        self.assertEqual(self.client.get(change).status_code, 200)

    def test_nao_gestor_e_sem_permissao(self):
        obj = self.enviar()
        url = reverse("admin:solicitacoes_publicar", args=[obj.pk])
        for perfil in ["aluno", "admin", "gestor"]:
            user = Usuario.objects.create_user(email=perfil+"-restrito@example.com", nome=perfil, perfil=perfil, is_staff=True)
            if perfil == "gestor":
                Gestor.objects.create(usuario=user, nucleo=self.gestor.nucleo)
            else:
                user.user_permissions.set(Permission.objects.filter(content_type__app_label="solicitacoes"))
            self.client.force_login(user)
            self.assertEqual(self.client.post(url).status_code, 403)
            with self.assertRaises(PermissionDenied):
                publicar(obj.pk, user)
        self.assertFalse(Vaga.objects.exists())

    def test_geracao_link_admin(self):
        self.client.force_login(self.user)
        url = reverse("admin:solicitacoes_linkempresa_add")
        self.assertEqual(self.client.get(url).status_code, 200)
        response = self.client.post(url, {"empresa": self.empresa.pk,
            "expira_em_0": "2099-01-01", "expira_em_1": "12:00:00", "_save": "Salvar"})
        self.assertEqual(response.status_code, 302)
        link = LinkEmpresa.objects.exclude(pk=self.link.pk).get()
        self.assertEqual(link.gestor, self.gestor)
        self.assertNotEqual(link.token, self.link.token)
        response = self.client.get(reverse("admin:solicitacoes_linkempresa_change", args=[link.pk]))
        self.assertContains(response, "http://testserver/empresas/vagas/"+link.token)

    def test_aluno_so_enxerga_apos_confirmacao(self):
        from rest_framework.test import APIClient
        from backend.models import Aluno, Curso
        curso = Curso.objects.create(faculdade=self.gestor.nucleo.faculdade, nome="Computação")
        user = Usuario.objects.create_user(email="aluno-api@example.com", nome="Aluno", perfil="aluno")
        Aluno.objects.create(usuario=user, matricula="123", curso=curso, periodo=1)
        client = APIClient()
        client.force_authenticate(user)
        obj = self.enviar()
        self.assertEqual(client.get("/api/v1/vagas/").data["count"], 0)
        publicar(obj.pk, self.user)
        self.assertEqual(client.get("/api/v1/vagas/").data["count"], 1)

    def test_relacoes_cursos_e_idiomas(self):
        from backend.models import Curso
        from backend.models.curriculo import Idioma, NivelIdioma
        curso = Curso.objects.create(faculdade=self.gestor.nucleo.faculdade, nome="Direito")
        dados = self.payload()
        dados.update({"cursos": [curso.pk], "idiomas-TOTAL_FORMS": "1",
                      "idiomas-0-idioma": Idioma.choices[0][0],
                      "idiomas-0-nivel_minimo": NivelIdioma.choices[0][0]})
        self.assertEqual(self.client.post(self.url, dados).status_code, 302)
        vaga = publicar(SolicitacaoVaga.objects.get().pk, self.user)
        self.assertEqual(list(vaga.cursos.all()), [curso])
        self.assertEqual(vaga.requisitos_idioma.count(), 1)
