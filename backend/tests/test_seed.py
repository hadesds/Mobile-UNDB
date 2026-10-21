from io import StringIO

from django.core.management import call_command
from rest_framework.test import APITestCase

from backend.management import seed_dados as D
from backend.models import (
    Aluno,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    Empresa,
    RequisitoCompetencia,
    Usuario,
    Vaga,
)


def seed(*args):
    call_command("seed", *args, stdout=StringIO())


class SeedTests(APITestCase):
    def contagens(self):
        return [
            m.objects.count()
            for m in (Curso, Competencia, Empresa, Usuario, Aluno, Vaga, RequisitoCompetencia, CompetenciaDoPerfil)
        ]

    def test_seed_cria_dados(self):
        seed()
        self.assertEqual(Vaga.objects.filter(status="aberta").count(), len(D.VAGAS))
        self.assertEqual(Aluno.objects.count(), len(D.ALUNOS))
        self.assertTrue(Usuario.objects.get(email=D.ADMIN["email"]).is_superuser)

    def test_seed_e_idempotente(self):
        seed()
        antes = self.contagens()
        seed()
        self.assertEqual(self.contagens(), antes)

    def test_nao_sobrescreve_senha_nem_curriculo_editado(self):
        seed()
        marina = Usuario.objects.get(email=D.ALUNOS[0]["email"])
        marina.set_password("Outra-Senha-123")
        marina.save()
        perfil = marina.aluno.perfil_competencias
        perfil.competencias.all().delete()
        perfil.idiomas.all().delete()  # mantém só formação/experiência/cursos
        seed()
        marina.refresh_from_db()
        self.assertTrue(marina.check_password("Outra-Senha-123"))
        self.assertEqual(perfil.competencias.count(), 0)

    def test_sem_usuarios(self):
        seed("--sem-usuarios")
        self.assertEqual(Usuario.objects.count(), 0)
        self.assertEqual(Vaga.objects.count(), 0)
        self.assertGreater(Empresa.objects.count(), 0)

    def test_aluno_do_seed_loga_e_ve_vagas(self):
        seed()
        r = self.client.post(
            "/api/v1/auth/login/",
            {"email": D.ALUNOS[0]["email"], "password": "Teia@Demo2026"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        vagas = self.client.get("/api/v1/vagas/")
        self.assertEqual(vagas.data["count"], len(D.VAGAS))
        perfil = self.client.get("/api/v1/me/perfil/")
        self.assertEqual(perfil.data["completude"], 100)