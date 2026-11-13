from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from backend.models import Competencia, Curso, Empresa, Faculdade, Gestor, NucleoCarreiras, Usuario, Vaga
from .models import LinkEmpresa, SolicitacaoVaga


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        fac = Faculdade.objects.create(nome="UNDB", sigla="UNDB")
        nucleo = NucleoCarreiras.objects.create(faculdade=fac, nome="TEIA")
        # Sem is_staff: o app usa só JWT, não o Admin.
        cls.user = Usuario.objects.create_user(email="g@example.com", nome="Gestora", perfil="gestor")
        cls.gestor = Gestor.objects.create(usuario=cls.user, nucleo=nucleo)
        cls.empresa = Empresa.objects.create(nome="ACME")
        cls.comp = Competencia.objects.create(nome="Python")
        cls.curso = Curso.objects.create(faculdade=fac, nome="Computação")

    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.publico = APIClient()

    def payload(self, **extra):
        return {"titulo": "Estágio Dev", "tipo": "estagio_nao_obrigatorio", "modalidade": "remoto",
                "cursos": [self.curso.pk],
                "requisitos_competencia": [{"competencia": self.comp.pk, "obrigatorio": True}],
                "requisitos_idioma": [], **extra}

    def novo_link(self, **kw):
        """Cria um link e devolve (link, url pública da API)."""
        link, token = LinkEmpresa.gerar(empresa=self.empresa, criado_por=self.user)
        if kw:
            LinkEmpresa.objects.filter(pk=link.pk).update(**kw)
        return link, f"/api/v1/empresas/formulario/{token}/"


class LinksGestorTests(Base):
    def test_gestor_cria_lista_e_revoga(self):
        self.api.force_authenticate(self.user)
        r = self.api.post("/api/v1/gestor/links-empresa/", {"empresa": self.empresa.pk}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["situacao"], "ativo")
        self.assertEqual(r.data["criado_por_nome"], "Gestora")
        token = r.data["token"]
        self.assertTrue(r.data["url"].endswith(f"/empresas/vagas/{token}/"))
        self.assertEqual(r.data["token_prefixo"], token[:6])
        link_id = r.data["id"]

        # Depois da criação o token não volta em nenhuma resposta.
        lista = self.api.get("/api/v1/gestor/links-empresa/?situacao=ativo")
        self.assertEqual(lista.data["count"], 1)
        detalhe = self.api.get(f"/api/v1/gestor/links-empresa/{link_id}/")
        for resposta in (lista, detalhe):
            self.assertNotIn(token, resposta.content.decode())
            self.assertNotIn(LinkEmpresa.objects.get().token_hash, resposta.content.decode())
        self.assertNotIn("url", detalhe.data)

        r = self.api.post(f"/api/v1/gestor/links-empresa/{link_id}/revogar/")
        self.assertEqual(r.data["situacao"], "revogado")
        self.assertEqual(r.data["revogado_por_nome"], "Gestora")
        self.assertIsNotNone(r.data["revogado_em"])
        self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/?situacao=ativo").data["count"], 0)
        self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/?situacao=encerrado").data["count"], 1)
        self.assertEqual(self.publico.get(f"/api/v1/empresas/formulario/{token}/").status_code, 410)
        # Sem edição nem exclusão.
        self.assertEqual(self.api.delete(f"/api/v1/gestor/links-empresa/{link_id}/").status_code, 405)
        self.assertEqual(self.api.patch(f"/api/v1/gestor/links-empresa/{link_id}/", {}).status_code, 405)

    def test_validacoes_da_criacao(self):
        self.api.force_authenticate(self.user)
        url = "/api/v1/gestor/links-empresa/"
        inativa = Empresa.objects.create(nome="Inativa", ativa=False)
        self.assertEqual(self.api.post(url, {"empresa": inativa.pk}).status_code, 400)
        for dias in (-1, 0, 91):
            expira = (timezone.now() + timedelta(days=dias)).isoformat()
            r = self.api.post(url, {"empresa": self.empresa.pk, "expira_em": expira}, format="json")
            self.assertEqual(r.status_code, 400, dias)
        dados = {"empresa": self.empresa.pk, "token": "x", "token_hash": "x", "revogado": True,
                 "criado_por": 999}
        r = self.api.post(url, dados, format="json")
        self.assertEqual(r.status_code, 201)
        link = LinkEmpresa.objects.get(pk=r.data["id"])
        self.assertNotEqual(r.data["token"], "x")
        self.assertNotEqual(link.token_hash, "x")
        self.assertEqual((link.revogado, link.criado_por), (False, self.user))

    @override_settings(SOLICITACOES_FORMULARIO_URL="https://teia.app/empresa?token={token}")
    def test_url_externa_configuravel(self):
        self.api.force_authenticate(self.user)
        r = self.api.post("/api/v1/gestor/links-empresa/", {"empresa": self.empresa.pk})
        self.assertEqual(r.data["url"], f"https://teia.app/empresa?token={r.data['token']}")

    def test_admin_gera_e_revoga_mas_nao_revisa(self):
        admin = Usuario.objects.create_user(email="adm@example.com", nome="Admin", perfil="admin")
        self.api.force_authenticate(admin)
        r = self.api.post("/api/v1/gestor/links-empresa/", {"empresa": self.empresa.pk})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["criado_por_nome"], "Admin")
        enviar = self.publico.post(r.data["url"].replace("http://testserver/empresas/vagas/",
                                                         "/api/v1/empresas/formulario/"),
                                   self.payload(), format="json")
        self.assertEqual(enviar.status_code, 201)
        sid = enviar.data["id"]
        self.assertEqual(self.api.get("/api/v1/gestor/solicitacoes/").data["count"], 1)
        self.assertEqual(self.api.get(f"/api/v1/gestor/solicitacoes/{sid}/").status_code, 200)
        for metodo, rota in (("patch", ""), ("post", "publicar/"), ("post", "recusar/")):
            resposta = getattr(self.api, metodo)(f"/api/v1/gestor/solicitacoes/{sid}/{rota}", {}, format="json")
            self.assertEqual(resposta.status_code, 403, rota)
        self.assertFalse(Vaga.objects.exists())
        outro, _ = self.novo_link()
        self.assertEqual(self.api.post(f"/api/v1/gestor/links-empresa/{outro.pk}/revogar/").status_code, 200)

    def test_limite_de_geracao(self):
        from unittest import mock
        from rest_framework.throttling import ScopedRateThrottle
        self.api.force_authenticate(self.user)
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"gerar_link_empresa": "2/hour"}):
            codigos = [self.api.post("/api/v1/gestor/links-empresa/", {"empresa": self.empresa.pk}).status_code
                       for _ in range(3)]
            self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/").status_code, 200)
        self.assertEqual(codigos, [201, 201, 429])

    def test_somente_equipe(self):
        self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/").status_code, 401)
        aluno = Usuario.objects.create_user(email="aluno@example.com", nome="aluno", perfil="aluno")
        self.api.force_authenticate(aluno)
        self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/").status_code, 403)
        self.assertEqual(self.api.post("/api/v1/gestor/links-empresa/", {"empresa": self.empresa.pk}).status_code, 403)
        self.assertEqual(self.api.get("/api/v1/gestor/solicitacoes/").status_code, 403)
        inativo = Usuario.objects.create_user(email="adm2@example.com", nome="x", perfil="admin", is_active=False)
        self.api.force_authenticate(inativo)
        self.assertEqual(self.api.get("/api/v1/gestor/links-empresa/").status_code, 403)


class FormularioPublicoTests(Base):
    def setUp(self):
        super().setUp()
        self.link, self.url = self.novo_link()

    def test_get_traz_dados_do_formulario(self):
        r = self.publico.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["empresa"], {"nome": "ACME"})
        self.assertEqual(r.data["opcoes"]["cursos"][0]["id"], self.curso.pk)
        self.assertEqual(r["Cache-Control"], "no-store")
        self.assertNotIn("contato_email", str(r.data))
        busca = self.publico.get(self.url + "competencias/?q=pyt")
        self.assertEqual([c["id"] for c in busca.data], [self.comp.pk])

    def test_envio_unico_sem_login_e_sem_csrf(self):
        publico = APIClient(enforce_csrf_checks=True)
        r = publico.post(self.url, self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.data)
        obj = SolicitacaoVaga.objects.get()
        self.assertEqual(obj.link, self.link)
        self.assertEqual(obj.status, "pendente")
        self.assertEqual(list(obj.cursos.all()), [self.curso])
        self.assertEqual(obj.competencias.get().competencia, self.comp)
        self.assertFalse(Vaga.objects.exists())
        r = publico.post(self.url, self.payload(), format="json")
        self.assertEqual(r.status_code, 410)
        self.assertEqual(r.data["situacao"], "utilizado")
        self.assertEqual(publico.get(self.url).status_code, 410)

    def test_perguntas_ao_candidato(self):
        self.assertEqual(self.publico.get(self.url).data["limites"]["perguntas"], 10)
        perguntas = [{"rotulo": "Por que esta vaga?", "formato": "texto_longo"},
                     {"rotulo": "Tem disponibilidade presencial?", "formato": "sim_nao", "obrigatorio": False,
                      "ajuda": "Responda sim ou não"}]
        r = self.publico.post(self.url, {**self.payload(), "perguntas": perguntas}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        obj = SolicitacaoVaga.objects.get()
        self.assertEqual([(p.rotulo, p.formato, p.obrigatorio) for p in obj.perguntas.all()],
                         [("Por que esta vaga?", "texto_longo", True),
                          ("Tem disponibilidade presencial?", "sim_nao", False)])
        self.assertEqual(obj.perguntas.last().ordem, 1)

    def test_perguntas_invalidas(self):
        for perguntas in ([{"rotulo": "  "}], [{"rotulo": "A"}, {"rotulo": "a"}],
                          [{"rotulo": "P", "formato": "xyz"}],
                          [{"rotulo": f"P{i}"} for i in range(11)]):
            r = self.publico.post(self.url, {**self.payload(), "perguntas": perguntas}, format="json")
            self.assertEqual(r.status_code, 400, perguntas)
            self.assertIn("perguntas", r.data)
        self.assertFalse(SolicitacaoVaga.objects.exists())

    def test_campos_controlados_pelo_servidor(self):
        dados = self.payload(status="publicada", vaga=1, link=999, empresa=999, revisado_por=1)
        self.assertEqual(self.publico.post(self.url, dados, format="json").status_code, 201)
        obj = SolicitacaoVaga.objects.get()
        self.assertEqual((obj.status, obj.vaga_id, obj.revisado_por_id), ("pendente", None, None))
        self.assertEqual(obj.link.empresa, self.empresa)

    def test_validacao(self):
        casos = [
            self.payload(titulo=""),
            self.payload(periodo_minimo=21),
            self.payload(tipo="inexistente"),
            self.payload(requisitos_competencia=[{"competencia": self.comp.pk}] * 2),
            self.payload(requisitos_competencia=[{"competencia": 99999}]),
            self.payload(requisitos_competencia=[{"competencia": self.comp.pk}] * 21),
        ]
        for dados in casos:
            r = self.publico.post(self.url, dados, format="json")
            self.assertEqual(r.status_code, 400, dados)
        self.assertFalse(SolicitacaoVaga.objects.exists())

    def test_links_indisponiveis(self):
        self.assertEqual(self.publico.get("/api/v1/empresas/formulario/invalido/").status_code, 404)
        hash_ = f"/api/v1/empresas/formulario/{self.link.token_hash}/"
        self.assertEqual(self.publico.get(hash_).status_code, 404)
        self.assertEqual(self.publico.get("/api/v1/empresas/formulario/" + "a" * 200 + "/").status_code, 404)
        casos = {"revogado": {"revogado": True},
                 "expirado": {"expira_em": timezone.now() - timedelta(seconds=1)}}
        for situacao, campos in casos.items():
            _, url = self.novo_link(**campos)
            for r in (self.publico.get(url), self.publico.post(url, self.payload(), format="json"),
                      self.publico.get(url + "competencias/")):
                self.assertEqual(r.status_code, 410)
                self.assertEqual(r.data["situacao"], situacao)
        self.empresa.ativa = False
        self.empresa.save()
        r = self.publico.post(self.url, self.payload(), format="json")
        self.assertEqual(r.data["situacao"], "empresa_inativa")
        self.assertFalse(SolicitacaoVaga.objects.exists())

    def test_ignora_jwt_invalido(self):
        self.publico.credentials(HTTP_AUTHORIZATION="Bearer lixo")
        self.assertEqual(self.publico.get(self.url).status_code, 200)

    def test_throttle(self):
        from unittest import mock
        from rest_framework.throttling import ScopedRateThrottle
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"formulario_empresa": "2/min"}):
            codigos = [self.publico.get(self.url).status_code for _ in range(3)]
        self.assertEqual(codigos, [200, 200, 429])


class RevisaoGestorTests(Base):
    def setUp(self):
        super().setUp()
        self.link, url = self.novo_link()
        r = self.publico.post(url, self.payload(), format="json")
        self.obj = SolicitacaoVaga.objects.get(pk=r.data["id"])
        self.api.force_authenticate(self.user)
        self.url = f"/api/v1/gestor/solicitacoes/{self.obj.pk}/"

    def test_lista_detalhe_e_link_utilizado(self):
        lista = self.api.get("/api/v1/gestor/solicitacoes/?status=pendente").data
        self.assertEqual(lista["count"], 1)
        item = lista["results"][0]
        self.assertEqual(item["empresa_nome"], "ACME")
        self.assertEqual(item["requisitos_competencia"][0]["competencia_nome"], "Python")
        link = self.api.get(f"/api/v1/gestor/links-empresa/{self.link.pk}/").data
        self.assertEqual(link["situacao"], "utilizado")
        self.assertEqual(link["solicitacao"]["id"], self.obj.pk)
        filtrados = self.api.get("/api/v1/gestor/links-empresa/?situacao=utilizado").data
        self.assertEqual([l["id"] for l in filtrados["results"]], [self.link.pk])

    def test_edita_e_publica(self):
        r = self.api.patch(self.url, {"titulo": "Estágio Backend", "prazo": None}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["titulo"], "Estágio Backend")
        self.assertEqual(len(r.data["requisitos_competencia"]), 1)  # omitido = mantido

        r = self.api.post(self.url + "publicar/")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "publicada")
        vaga = Vaga.objects.get(pk=r.data["vaga"])
        self.assertEqual((vaga.titulo, vaga.status, vaga.gestor), ("Estágio Backend", "aberta", self.gestor))
        self.assertEqual(self.api.post(self.url + "publicar/").data["vaga"], vaga.pk)  # idempotente
        self.assertEqual(vaga.modelo_curriculo.campos.filter(origem="vaga").count(), 0)
        self.assertEqual(Vaga.objects.count(), 1)
        self.assertEqual(self.api.patch(self.url, {"titulo": "X"}, format="json").status_code, 409)
        self.assertEqual(self.api.post(self.url + "recusar/").status_code, 400)

    def test_publicar_revalida_regras_de_vaga_aberta(self):
        r = self.api.patch(self.url, {"requisitos_competencia": []}, format="json")
        self.assertEqual(r.status_code, 200)
        r = self.api.post(self.url + "publicar/")
        self.assertEqual(r.status_code, 400)
        self.assertIn("status", r.data)
        self.assertFalse(Vaga.objects.exists())

    def test_recusa(self):
        r = self.api.post(self.url + "recusar/")
        self.assertEqual(r.data["status"], "recusada")
        self.assertEqual(r.data["revisado_por"], self.gestor.pk)
        self.assertEqual(self.api.post(self.url + "publicar/").status_code, 400)
        self.assertEqual(self.api.patch(self.url, {"titulo": "X"}, format="json").status_code, 409)
        self.assertFalse(Vaga.objects.exists())

    def test_sem_put_nem_delete(self):
        self.assertEqual(self.api.put(self.url, self.payload(), format="json").status_code, 405)
        self.assertEqual(self.api.delete(self.url).status_code, 405)
