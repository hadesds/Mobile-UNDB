from datetime import date, timedelta

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from backend.models import (
    Aluno,
    Competencia,
    Curso,
    Empresa,
    Faculdade,
    Gestor,
    NucleoCarreiras,
    PerfilCompetencias,
    SinonimoCompetencia,
    Usuario,
    Vaga,
)

SENHA = "Senha-Forte-123"


class BaseAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.fac = Faculdade.objects.create(nome="UNDB", sigla="UNDB")
        cls.curso = Curso.objects.create(faculdade=cls.fac, nome="Engenharia de Software", total_periodos=10)
        cls.outro_curso = Curso.objects.create(faculdade=cls.fac, nome="Direito", total_periodos=10)
        cls.nucleo = NucleoCarreiras.objects.create(faculdade=cls.fac, nome="TEIA")
        cls.python = Competencia.objects.create(nome="Python")
        SinonimoCompetencia.objects.create(competencia=cls.python, termo="py")
        cls.sql = Competencia.objects.create(nome="SQL")

        u = Usuario.objects.create_user(email="gestor@undb.edu.br", password=SENHA, nome="Gestora", perfil="gestor")
        cls.gestor = Gestor.objects.create(usuario=u, nucleo=cls.nucleo)

    def novo_aluno(self, email="ana@aluno.undb.edu.br", matricula="2026001"):
        u = Usuario.objects.create_user(email=email, password=SENHA, nome="Ana", perfil="aluno")
        a = Aluno.objects.create(usuario=u, matricula=matricula, curso=self.curso, periodo=3)
        PerfilCompetencias.objects.create(aluno=a)
        a.registrar_consentimento(True)
        return u

    def logar(self, email, senha=SENHA):
        r = self.client.post(reverse("auth-login"), {"email": email, "password": senha}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r

    def como(self, usuario):
        self.client.force_authenticate(usuario)


class CadastroLoginTests(BaseAPITest):
    def payload(self, **kw):
        base = {
            "email": "novo@aluno.undb.edu.br", "nome": "Novo", "password": SENHA,
            "matricula": "999", "curso": self.curso.id, "periodo": 2, "aceite_lgpd": True,
        }
        base.update(kw)
        return base

    def test_cadastro_cria_aluno_com_consentimento_e_tokens(self):
        r = self.client.post(reverse("auth-register"), self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)
        u = Usuario.objects.get(email="novo@aluno.undb.edu.br")
        self.assertEqual(u.perfil, "aluno")
        self.assertTrue(u.aluno.consentimento_vigente)
        self.assertTrue(PerfilCompetencias.objects.filter(aluno=u.aluno).exists())

    def test_cadastro_ignora_tentativa_de_virar_gestor(self):
        self.client.post(reverse("auth-register"), self.payload(perfil="gestor", is_staff=True), format="json")
        u = Usuario.objects.get(email="novo@aluno.undb.edu.br")
        self.assertEqual(u.perfil, "aluno")
        self.assertFalse(u.is_staff)

    def test_cadastro_exige_aceite_lgpd(self):
        r = self.client.post(reverse("auth-register"), self.payload(aceite_lgpd=False), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("aceite_lgpd", r.data)

    def test_cadastro_restringe_dominio(self):
        r = self.client.post(reverse("auth-register"), self.payload(email="x@gmail.com"), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data)

    @override_settings(ALUNO_EMAIL_DOMINIOS=[])
    def test_dominio_pode_ser_liberado(self):
        r = self.client.post(reverse("auth-register"), self.payload(email="x@gmail.com"), format="json")
        self.assertEqual(r.status_code, 201, r.content)

    def test_cadastro_valida_periodo_do_curso(self):
        r = self.client.post(reverse("auth-register"), self.payload(periodo=11), format="json")
        self.assertEqual(r.status_code, 400)

    def test_cadastro_email_e_matricula_duplicados(self):
        self.novo_aluno()
        r = self.client.post(
            reverse("auth-register"),
            self.payload(email="ANA@aluno.undb.edu.br", matricula="2026001"),
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data)
        self.assertIn("matricula", r.data)

    def test_cadastro_senha_fraca(self):
        r = self.client.post(reverse("auth-register"), self.payload(password="12345678"), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.data)

    def test_login_me_e_logout_invalida_refresh(self):
        self.novo_aluno()
        r = self.logar("ana@aluno.undb.edu.br")
        self.assertEqual(r.data["usuario"]["perfil"], "aluno")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["aluno"]["matricula"], "2026001")

        out = self.client.post(reverse("auth-logout"), {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(out.status_code, 204)
        self.client.credentials()
        again = self.client.post(reverse("auth-refresh"), {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(again.status_code, 401)

    def test_login_invalido(self):
        self.novo_aluno()
        r = self.client.post(reverse("auth-login"), {"email": "ana@aluno.undb.edu.br", "password": "errada"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_me_exige_autenticacao(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_refresh_rotaciona(self):
        self.novo_aluno()
        r = self.logar("ana@aluno.undb.edu.br")
        novo = self.client.post(reverse("auth-refresh"), {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(novo.status_code, 200)
        self.assertNotEqual(novo.data["refresh"], r.data["refresh"])
        reuso = self.client.post(reverse("auth-refresh"), {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(reuso.status_code, 401)


class PerfilTests(BaseAPITest):
    def setUp(self):
        self.ana = self.novo_aluno()
        self.bia = self.novo_aluno("bia@aluno.undb.edu.br", "2026002")

    def test_perfil_exige_consentimento(self):
        self.ana.aluno.registrar_consentimento(False)
        self.como(self.ana)
        r = self.client.get(reverse("me-perfil"))
        self.assertEqual(r.status_code, 403)
        self.assertIn("LGPD", str(r.data["detail"]))
        self.assertEqual(self.client.get("/api/v1/me/perfil/formacoes/").status_code, 403)

    def test_reaceitar_consentimento_libera(self):
        self.ana.aluno.registrar_consentimento(False)
        self.como(self.ana)
        r = self.client.post(reverse("me-consentimento"), {"aceito": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get(reverse("me-perfil")).status_code, 200)

    def test_gestor_nao_acessa_perfil_de_aluno(self):
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get(reverse("me-perfil")).status_code, 403)

    def test_crud_formacao_e_validacao_de_datas(self):
        self.como(self.ana)
        url = "/api/v1/me/perfil/formacoes/"
        ruim = {"nivel": "graduacao", "instituicao": "UNDB", "curso": "ES", "inicio": "2024-01-01", "fim": "2023-01-01"}
        self.assertEqual(self.client.post(url, ruim, format="json").status_code, 400)
        ok = dict(ruim, fim=None)
        r = self.client.post(url, ok, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        det = f"{url}{r.data['id']}/"
        self.assertEqual(self.client.patch(det, {"fim": "2023-01-01"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(det, {"instituicao": "UNDB MA"}, format="json").status_code, 200)
        self.assertEqual(self.client.delete(det).status_code, 204)

    def test_competencia_por_sinonimo_e_duplicidade(self):
        self.como(self.ana)
        url = "/api/v1/me/perfil/competencias/"
        r = self.client.post(url, {"termo": "PY", "nivel": 2}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["competencia_nome"], "Python")
        dup = self.client.post(url, {"competencia": self.python.id}, format="json")
        self.assertEqual(dup.status_code, 400)
        desconhecida = self.client.post(url, {"termo": "cobol-xyz"}, format="json")
        self.assertEqual(desconhecida.status_code, 400)
        vazio = self.client.post(url, {}, format="json")
        self.assertEqual(vazio.status_code, 400)

    def test_idioma_duplicado(self):
        self.como(self.ana)
        url = "/api/v1/me/perfil/idiomas/"
        self.assertEqual(self.client.post(url, {"idioma": "ingles", "nivel": 3}, format="json").status_code, 201)
        self.assertEqual(self.client.post(url, {"idioma": "ingles", "nivel": 2}, format="json").status_code, 400)

    def test_isolamento_entre_alunos(self):
        self.como(self.ana)
        r = self.client.post("/api/v1/me/perfil/cursos/", {"nome": "Django", "instituicao": "X", "carga_horaria": 20}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        item = r.data["id"]
        self.como(self.bia)
        self.assertEqual(self.client.get("/api/v1/me/perfil/cursos/").data, [])
        self.assertEqual(self.client.get(f"/api/v1/me/perfil/cursos/{item}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/v1/me/perfil/cursos/{item}/").status_code, 404)

    def test_completude_conta_secoes(self):
        self.como(self.ana)
        self.client.post("/api/v1/me/perfil/idiomas/", {"idioma": "ingles", "nivel": 3}, format="json")
        self.client.post("/api/v1/me/perfil/competencias/", {"competencia": self.sql.id}, format="json")
        r = self.client.get(reverse("me-perfil"))
        self.assertEqual(r.data["completude"], 40)
        self.client.post("/api/v1/me/perfil/formacoes/", {"nivel": "graduacao", "instituicao": "U", "curso": "C"}, format="json")
        self.assertEqual(self.client.get(reverse("me-perfil")).data["completude"], 60)


class VagaEmpresaTests(BaseAPITest):
    def setUp(self):
        self.ana = self.novo_aluno()
        self.empresa = Empresa.objects.create(nome="ACME LTDA", nome_fantasia="Acme", contato_email="rh@acme.com")

    def dados_vaga(self, **kw):
        base = {
            "empresa": self.empresa.id, "titulo": "Estágio Backend", "tipo": "estagio_nao_obrigatorio",
            "modalidade": "remoto", "descricao": "Django", "status": "rascunho",
            "requisitos_competencia": [{"competencia": self.python.id, "obrigatorio": True}],
            "requisitos_idioma": [{"idioma": "ingles", "nivel_minimo": 2, "obrigatorio": False}],
        }
        base.update(kw)
        return base

    def test_gestor_cria_vaga_com_requisitos(self):
        self.como(self.gestor.usuario)
        r = self.client.post("/api/v1/vagas/", self.dados_vaga(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["gestor"], self.gestor.id)
        self.assertEqual(len(r.data["requisitos_competencia"]), 1)

    def test_requisitos_sao_substituidos_na_edicao(self):
        self.como(self.gestor.usuario)
        r = self.client.post("/api/v1/vagas/", self.dados_vaga(), format="json")
        url = f"/api/v1/vagas/{r.data['id']}/"
        r2 = self.client.patch(url, {"requisitos_competencia": [{"competencia": self.sql.id, "obrigatorio": False}]}, format="json")
        self.assertEqual(r2.status_code, 200, r2.content)
        self.assertEqual([x["competencia"] for x in r2.data["requisitos_competencia"]], [self.sql.id])
        # idiomas não enviados são preservados
        self.assertEqual(len(r2.data["requisitos_idioma"]), 1)

    def test_requisito_repetido(self):
        self.como(self.gestor.usuario)
        d = self.dados_vaga(requisitos_competencia=[{"competencia": self.python.id}, {"competencia": self.python.id}])
        self.assertEqual(self.client.post("/api/v1/vagas/", d, format="json").status_code, 400)

    def test_abrir_vaga_exige_requisito_e_prazo_valido(self):
        self.como(self.gestor.usuario)
        sem = self.dados_vaga(status="aberta", requisitos_competencia=[], requisitos_idioma=[])
        self.assertEqual(self.client.post("/api/v1/vagas/", sem, format="json").status_code, 400)
        passado = self.dados_vaga(status="aberta", prazo=str(date.today() - timedelta(days=1)))
        self.assertEqual(self.client.post("/api/v1/vagas/", passado, format="json").status_code, 400)
        ok = self.dados_vaga(status="aberta", prazo=str(date.today() + timedelta(days=5)))
        self.assertEqual(self.client.post("/api/v1/vagas/", ok, format="json").status_code, 201)

    def test_delete_desabilitado(self):
        self.como(self.gestor.usuario)
        r = self.client.post("/api/v1/vagas/", self.dados_vaga(), format="json")
        self.assertEqual(self.client.delete(f"/api/v1/vagas/{r.data['id']}/").status_code, 405)
        # Empresas: o gestor só consulta; o cadastro é da administração.
        e = self.client.post("/api/v1/empresas/", {"nome": "Outra SA"}, format="json")
        self.assertEqual(e.status_code, 403, e.content)
        self.assertEqual(self.client.delete(f"/api/v1/empresas/{self.empresa.id}/").status_code, 403)

    def _cria(self, titulo, status="aberta", prazo=None, cursos=(), **kw):
        v = Vaga.objects.create(
            empresa=self.empresa, gestor=self.gestor, titulo=titulo, tipo="clt",
            modalidade=kw.pop("modalidade", "remoto"), status=status, prazo=prazo, **kw,
        )
        v.cursos.set(cursos)
        return v

    def test_aluno_ve_so_vagas_abertas_no_prazo(self):
        self._cria("Aberta")
        self._cria("Rascunho", status="rascunho")
        self._cria("Encerrada", status="encerrada")
        self._cria("Vencida", prazo=date.today() - timedelta(days=1))
        self._cria("Hoje", prazo=date.today())
        self.como(self.ana)
        r = self.client.get("/api/v1/vagas/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual({v["titulo"] for v in r.data["results"]}, {"Aberta", "Hoje"})

    def test_aluno_nao_ve_dados_internos(self):
        v = self._cria("Aberta")
        self.como(self.ana)
        r = self.client.get(f"/api/v1/vagas/{v.id}/")
        self.assertEqual(r.data["empresa"], "Acme")
        self.assertNotIn("gestor", r.data)
        self.assertNotIn("status", r.data)
        self.assertNotIn("contato_email", str(r.data))

    def test_aluno_nao_acessa_vaga_fechada_nem_escreve(self):
        v = self._cria("Rascunho", status="rascunho")
        self.como(self.ana)
        self.assertEqual(self.client.get(f"/api/v1/vagas/{v.id}/").status_code, 404)
        self.assertEqual(self.client.post("/api/v1/vagas/", self.dados_vaga(), format="json").status_code, 403)

    def test_filtros_de_vagas(self):
        self._cria("Para ES", cursos=[self.curso])
        self._cria("Para Direito", cursos=[self.outro_curso])
        self._cria("Livre", modalidade="presencial")
        self.como(self.ana)
        r = self.client.get("/api/v1/vagas/", {"curso": self.curso.id})
        self.assertEqual({v["titulo"] for v in r.data["results"]}, {"Para ES", "Livre"})
        r = self.client.get("/api/v1/vagas/", {"modalidade": "presencial"})
        self.assertEqual({v["titulo"] for v in r.data["results"]}, {"Livre"})
        r = self.client.get("/api/v1/vagas/", {"q": "acme"})
        self.assertEqual(r.data["count"], 3)

    def test_gestor_filtra_por_status(self):
        self._cria("A")
        self._cria("R", status="rascunho")
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get("/api/v1/vagas/").data["count"], 2)
        self.assertEqual(self.client.get("/api/v1/vagas/", {"status": "rascunho"}).data["count"], 1)

    def test_empresas_somente_gestor(self):
        self.como(self.ana)
        self.assertEqual(self.client.get("/api/v1/empresas/").status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/empresas/").status_code, 401)
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get("/api/v1/empresas/").status_code, 200)


class CatalogoTests(BaseAPITest):
    def test_cursos_e_opcoes_sao_publicos(self):
        Curso.objects.create(faculdade=self.fac, nome="Inativo", ativo=False)
        r = self.client.get("/api/v1/cursos/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual({c["nome"] for c in r.data}, {"Engenharia de Software", "Direito"})
        o = self.client.get("/api/v1/opcoes/")
        self.assertEqual(o.status_code, 200)
        self.assertIn("idiomas", o.data)

    def test_competencias_exigem_login_e_buscam_por_sinonimo(self):
        self.assertEqual(self.client.get("/api/v1/competencias/").status_code, 401)
        self.como(self.novo_aluno())
        r = self.client.get("/api/v1/competencias/", {"q": "PY"})
        self.assertEqual([c["nome"] for c in r.data["results"]], ["Python"])
        r = self.client.get("/api/v1/competencias/", {"q": "sq"})
        self.assertEqual([c["nome"] for c in r.data["results"]], ["SQL"])