from datetime import date, timedelta

from backend.compatibilidade import analisar
from backend.models import (
    Candidatura,
    CompetenciaDoPerfil,
    Curso,
    Empresa,
    Encaminhamento,
    RequisitoCompetencia,
    RequisitoIdioma,
    Usuario,
    Vaga,
)

from .test_api import SENHA, BaseAPITest


class TriagemGestorTests(BaseAPITest):
    def setUp(self):
        self.empresa = Empresa.objects.create(nome="ACME LTDA", nome_fantasia="Acme")
        self.vaga = Vaga.objects.create(
            empresa=self.empresa, gestor=self.gestor, titulo="Backend Jr.", tipo="clt",
            modalidade="remoto", status="aberta", prazo=date.today() + timedelta(days=3),
        )
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.python)
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.sql, obrigatorio=False)
        RequisitoIdioma.objects.create(vaga=self.vaga, idioma="ingles", nivel_minimo=2)

        self.ana = self.novo_aluno()
        self.bia = self.novo_aluno(email="bia@aluno.undb.edu.br", matricula="2026002")
        CompetenciaDoPerfil.objects.create(perfil=self.bia.aluno.perfil_competencias, competencia=self.python)
        CompetenciaDoPerfil.objects.create(perfil=self.bia.aluno.perfil_competencias, competencia=self.sql)
        self.c_ana = Candidatura.objects.create(aluno=self.ana.aluno, vaga=self.vaga)
        self.c_bia = Candidatura.objects.create(aluno=self.bia.aluno, vaga=self.vaga)
        analisar(self.c_ana)
        analisar(self.c_bia)

    def test_candidatos_ordenados_com_justificativa(self):
        self.como(self.gestor.usuario)
        r = self.client.get(f"/api/v1/vagas/{self.vaga.id}/candidatos/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual([c["id"] for c in r.data["candidatos"]], [self.c_bia.id, self.c_ana.id])
        self.assertEqual([q["requisito"] for q in r.data["requisitos"]], ["Python", "SQL", "Inglês"])
        self.assertEqual(r.data["contagem"]["analisada"], 2)
        primeiro = r.data["candidatos"][0]
        self.assertEqual(primeiro["aluno"]["nome"], "Ana")
        self.assertEqual(len(primeiro["analise"]["itens"]), 3)

    def test_aluno_nao_acessa_triagem(self):
        self.como(self.ana)
        self.assertEqual(self.client.get(f"/api/v1/vagas/{self.vaga.id}/candidatos/").status_code, 403)
        self.assertEqual(self.client.get(f"/api/v1/gestor/candidaturas/{self.c_ana.id}/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/gestor/painel/").status_code, 403)

    def test_decidir_encaminhar_e_desfazer(self):
        self.como(self.gestor.usuario)
        url = f"/api/v1/gestor/candidaturas/{self.c_bia.id}/decidir/"
        r = self.client.post(url, {"status": "encaminhada", "observacao": "Perfil forte em dados."}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["status"], "encaminhada")
        self.assertEqual(r.data["encaminhamento"]["observacao"], "Perfil forte em dados.")
        self.assertTrue(Encaminhamento.objects.filter(candidatura=self.c_bia).exists())

        # O aluno vê o novo status e a data do encaminhamento.
        self.como(self.bia)
        d = self.client.get(f"/api/v1/candidaturas/{self.c_bia.id}/").data
        self.assertEqual(d["status"], "encaminhada")
        self.assertIsNotNone(d["encaminhada_em"])

        self.como(self.gestor.usuario)
        r = self.client.post(url, {"status": "analisada"}, format="json")
        self.assertEqual(r.data["status"], "analisada")
        self.assertFalse(Encaminhamento.objects.filter(candidatura=self.c_bia).exists())

    def test_nao_selecionada_e_status_invalido(self):
        self.como(self.gestor.usuario)
        url = f"/api/v1/gestor/candidaturas/{self.c_ana.id}/decidir/"
        self.assertEqual(self.client.post(url, {"status": "eliminada"}, format="json").status_code, 400)
        r = self.client.post(url, {"status": "nao_selecionada"}, format="json")
        self.assertEqual(r.data["status"], "nao_selecionada")

    def test_curriculo_some_sem_consentimento(self):
        self.como(self.gestor.usuario)
        url = f"/api/v1/gestor/candidaturas/{self.c_bia.id}/"
        self.assertIsNotNone(self.client.get(url).data["curriculo"])
        self.bia.aluno.registrar_consentimento(False)
        r = self.client.get(url)
        self.assertIsNone(r.data["curriculo"])
        self.assertFalse(r.data["aluno"]["consentimento_vigente"])

    def test_painel_e_contagem_nas_vagas(self):
        self.como(self.gestor.usuario)
        r = self.client.get("/api/v1/gestor/painel/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["aguardando"], 2)
        self.assertEqual(r.data["vencendo"][0]["id"], self.vaga.id)
        self.assertEqual(r.data["fila"][0]["aguardando"], 2)
        v = self.client.get(f"/api/v1/vagas/{self.vaga.id}/").data
        self.assertEqual(v["candidaturas"], {"total": 2, "aguardando": 2})


class AdministracaoTests(BaseAPITest):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            email="admin@undb.edu.br", password=SENHA, nome="Admin", perfil="admin"
        )
        self.ana = self.novo_aluno()

    def test_somente_admin(self):
        for u in (self.ana, self.gestor.usuario):
            self.como(u)
            self.assertEqual(self.client.get("/api/v1/admin/resumo/").status_code, 403)
            self.assertEqual(self.client.get("/api/v1/admin/usuarios/").status_code, 403)

    def test_resumo(self):
        self.como(self.admin)
        r = self.client.get("/api/v1/admin/resumo/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["usuarios"]["alunos"], 1)
        self.assertEqual(r.data["lgpd"]["com_termo"], 1)

    def test_cria_gestor_e_desativa(self):
        self.como(self.admin)
        r = self.client.post("/api/v1/admin/usuarios/", {
            "nome": "Novo Gestor", "email": "Novo@undb.edu.br", "password": SENHA,
            "nucleo": self.nucleo.id, "cargo": "Analista",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["perfil"], "gestor")
        self.assertEqual(r.data["detalhe"]["nucleo"], "TEIA")
        uid = r.data["id"]

        r = self.client.patch(f"/api/v1/admin/usuarios/{uid}/", {"ativo": False, "cargo": "Coord."}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.data["ativo"])
        self.assertEqual(r.data["detalhe"]["cargo"], "Coord.")
        self.client.force_authenticate(None)
        login = self.client.post("/api/v1/auth/login/", {"email": "novo@undb.edu.br", "password": SENHA}, format="json")
        self.assertEqual(login.status_code, 401)

    def test_nao_desativa_a_si_mesmo(self):
        self.como(self.admin)
        r = self.client.patch(f"/api/v1/admin/usuarios/{self.admin.id}/", {"ativo": False}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_filtra_usuarios(self):
        self.como(self.admin)
        r = self.client.get("/api/v1/admin/usuarios/", {"perfil": "aluno"})
        self.assertEqual([u["email"] for u in r.data["results"]], ["ana@aluno.undb.edu.br"])
        self.assertEqual(r.data["results"][0]["detalhe"]["matricula"], "2026001")

    def test_empresas_crud(self):
        self.como(self.admin)
        r = self.client.post("/api/v1/empresas/", {"nome": "Nova SA", "convenio_status": "ativo"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.client.delete(f"/api/v1/empresas/{r.data['id']}/").status_code, 204)

        usada = Empresa.objects.create(nome="Com Vaga")
        Vaga.objects.create(empresa=usada, gestor=self.gestor, titulo="X", tipo="clt", modalidade="remoto")
        self.assertEqual(self.client.delete(f"/api/v1/empresas/{usada.id}/").status_code, 409)

    def test_competencia_com_sinonimos(self):
        self.como(self.admin)
        r = self.client.post("/api/v1/admin/competencias/", {
            "nome": "JavaScript", "categoria": "tecnica", "sinonimos": ["JS", "js ", "ECMAScript"],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["sinonimos"], ["ECMAScript", "JS"])
        # O vocabulário passa a resolver o sinônimo.
        self.como(self.ana)
        t = self.client.post("/api/v1/me/perfil/competencias/", {"termo": "js"}, format="json")
        self.assertEqual(t.status_code, 201, t.content)

        self.como(self.admin)
        conflito = self.client.post("/api/v1/admin/competencias/", {"nome": "Outra", "sinonimos": ["py"]}, format="json")
        self.assertEqual(conflito.status_code, 400)
        self.assertEqual(self.client.delete(f"/api/v1/admin/competencias/{r.data['id']}/").status_code, 409)
        livre = self.client.post("/api/v1/admin/competencias/", {"nome": "Rust"}, format="json")
        self.assertEqual(self.client.delete(f"/api/v1/admin/competencias/{livre.data['id']}/").status_code, 204)

    def test_cursos(self):
        self.como(self.admin)
        r = self.client.post("/api/v1/admin/cursos/", {"nome": "Medicina", "total_periodos": 12}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["faculdade"], self.fac.id)
        dup = self.client.post("/api/v1/admin/cursos/", {"nome": "medicina", "total_periodos": 12}, format="json")
        self.assertEqual(dup.status_code, 400)
        self.client.patch(f"/api/v1/admin/cursos/{r.data['id']}/", {"ativo": False}, format="json")
        self.assertFalse(Curso.objects.get(pk=r.data["id"]).ativo)
        self.assertEqual(self.client.delete(f"/api/v1/admin/cursos/{self.curso.id}/").status_code, 409)
