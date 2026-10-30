from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from backend.models import (
    Candidatura,
    CompetenciaDoPerfil,
    Empresa,
    Experiencia,
    IdiomaPerfil,
    RequisitoCompetencia,
    RequisitoIdioma,
    Vaga,
)

from .test_api import BaseAPITest


class CandidaturaTests(BaseAPITest):
    def setUp(self):
        self.aluno_user = self.novo_aluno()
        self.perfil = self.aluno_user.aluno.perfil_competencias
        self.empresa = Empresa.objects.create(nome="Empresa X")
        self.vaga = Vaga.objects.create(
            empresa=self.empresa,
            gestor=self.gestor,
            titulo="Estágio Python",
            tipo="estagio_nao_obrigatorio",
            modalidade="remoto",
            status="aberta",
            periodo_minimo=5,
            prazo=timezone.localdate() + timedelta(days=10),
        )
        self.vaga.cursos.add(self.curso)
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.python)
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.sql, obrigatorio=False)
        RequisitoIdioma.objects.create(vaga=self.vaga, idioma="ingles", nivel_minimo=2)
        self.como(self.aluno_user)

    def candidatar(self, vaga=None):
        return self.client.post(
            reverse("candidatura-list"), {"vaga": (vaga or self.vaga).id}, format="json"
        )

    def test_candidatura_gera_analise_por_requisito(self):
        CompetenciaDoPerfil.objects.create(perfil=self.perfil, competencia=self.python, nivel=2)
        IdiomaPerfil.objects.create(perfil=self.perfil, idioma="ingles", nivel=1)

        r = self.candidatar()
        self.assertEqual(r.status_code, 201, r.content)
        itens = {i["requisito"]: i["status"] for i in r.data["analise"]["itens"]}
        self.assertEqual(itens["Curso"], "encontrado")
        self.assertEqual(itens["Semestre mínimo"], "diferente")  # aluno no 3º, pede 5º
        self.assertEqual(itens["Python"], "encontrado")
        self.assertEqual(itens["SQL"], "nao_identificado")
        self.assertEqual(itens["Inglês"], "diferente")
        self.assertEqual(r.data["analise"]["score"], 40)  # 2 de 5
        self.assertEqual(r.data["status"], "analisada")

    def test_evidencia_vem_de_experiencia(self):
        Experiencia.objects.create(
            perfil=self.perfil, tipo="projeto", organizacao="UNDB",
            funcao="Dev", descricao="Scripts em SQL para relatórios",
        )
        r = self.candidatar()
        sql = next(i for i in r.data["analise"]["itens"] if i["requisito"] == "SQL")
        self.assertEqual(sql["status"], "encontrado")
        self.assertIn("Dev · UNDB", sql["detalhe"])

    def test_nao_repete_candidatura(self):
        self.candidatar()
        r = self.candidatar()
        self.assertEqual(r.status_code, 400)
        self.assertIn("vaga", r.data)

    def test_vaga_fechada_nao_aceita(self):
        self.vaga.status = "encerrada"
        self.vaga.save()
        r = self.candidatar()
        self.assertEqual(r.status_code, 400)

    def test_reanalisar_guarda_historico(self):
        cid = self.candidatar().data["id"]
        CompetenciaDoPerfil.objects.create(perfil=self.perfil, competencia=self.sql)
        r = self.client.post(reverse("candidatura-reanalisar", args=[cid]))
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(r.data["historico"]), 2)
        self.assertGreater(r.data["historico"][0]["score"], r.data["historico"][1]["score"])

    def test_lista_so_do_proprio_aluno_e_filtra_por_vaga(self):
        self.candidatar()
        outro = self.novo_aluno(email="bia@aluno.undb.edu.br", matricula="2026002")
        self.como(outro)
        self.assertEqual(self.client.get(reverse("candidatura-list")).data, [])

        self.como(self.aluno_user)
        r = self.client.get(reverse("candidatura-list"), {"vaga": self.vaga.id})
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["vaga"]["empresa"], "Empresa X")
        self.assertIsNotNone(r.data[0]["analise"]["score"])

    def test_sem_consentimento_bloqueia(self):
        self.aluno_user.aluno.registrar_consentimento(False)
        r = self.candidatar()
        self.assertEqual(r.status_code, 403)
        self.assertFalse(Candidatura.objects.exists())

    def test_gestor_nao_usa_endpoint_do_aluno(self):
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get(reverse("candidatura-list")).status_code, 403)
