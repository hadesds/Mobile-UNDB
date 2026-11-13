import shutil
import tempfile
from datetime import timedelta
from io import StringIO

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from backend.compatibilidade import analisar
from backend.importacao_certificados import CertificadoNovo, cadastrar
from backend.models import (
    Candidatura, CandidaturaCertificado, CompetenciaDoPerfil, Empresa, RequisitoCompetencia,
    RespostaCandidatura, Usuario, Vaga,
)

from .test_api import SENHA, BaseAPITest

_MEDIA = tempfile.mkdtemp(prefix="teia-triagem-")
PDF = b"%PDF-1.4 teste"


@override_settings(MEDIA_ROOT=_MEDIA)
class TriagemAdminTests(BaseAPITest):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    def setUp(self):
        call_command("criar_grupos", stdout=StringIO())
        u = self.gestor.usuario
        u.is_staff = True
        u.save(update_fields=["is_staff"])
        u.groups.add(Group.objects.get(name="Gestor TEIA"))
        self.client.force_login(u)

        self.vaga = Vaga.objects.create(
            empresa=Empresa.objects.create(nome="Empresa X"), gestor=self.gestor, titulo="Estágio Python",
            tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta",
            prazo=timezone.localdate() + timedelta(days=10),
        )
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.python)
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.sql)
        # Baixa (0%), alta (100%) e média (50%), criadas fora de ordem
        self.baixa = self.cand("baixa@aluno.undb.edu.br", "1", [])
        self.alta = self.cand("alta@aluno.undb.edu.br", "2", [self.python, self.sql])
        self.media = self.cand("media@aluno.undb.edu.br", "3", [self.python])
        RespostaCandidatura.objects.create(candidatura=self.alta, chave="motivacao", rotulo="Motivação",
                                           origem="vaga", valor="Quero aprender dados")
        self.cert = cadastrar(self.alta.aluno, CertificadoNovo(titulo="Curso de SQL", instituicao="Alura",
                                                               conteudo=PDF, nome_arquivo="sql.pdf"))
        CandidaturaCertificado.objects.create(candidatura=self.alta, certificado=self.cert)
        self.url = reverse("admin:backend_vaga_triagem", args=[self.vaga.pk])

    def cand(self, email, matricula, competencias):
        aluno = self.novo_aluno(email, matricula).aluno
        aluno.usuario.nome = email.split("@")[0]
        aluno.usuario.save()
        for comp in competencias:
            CompetenciaDoPerfil.objects.create(perfil=aluno.perfil_competencias, competencia=comp)
        c = Candidatura.objects.create(aluno=aluno, vaga=self.vaga)
        analisar(c)
        return c

    def test_ordena_por_compatibilidade_e_mostra_todos(self):
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        ordem = [l["c"].pk for l in r.context["linhas"]]
        self.assertEqual(ordem, [self.alta.pk, self.media.pk, self.baixa.pk])  # ninguém some
        self.assertContains(r, "Motivação")
        self.assertContains(r, "Quero aprender dados")
        self.assertContains(r, "Curso de SQL")
        self.assertContains(r, "A nota só ordena")

    def test_encaminha_so_os_marcados(self):
        r = self.client.post(self.url, {"encaminhar": [self.alta.pk, self.baixa.pk], "observacao": "Bons perfis"}, follow=True)
        self.assertContains(r, "2 candidatura(s) encaminhada(s)")
        for c, esperado in ((self.alta, "encaminhada"), (self.baixa, "encaminhada"), (self.media, "analisada")):
            c.refresh_from_db()
            self.assertEqual(c.status, esperado)
        self.alta.refresh_from_db()
        self.assertEqual(self.alta.encaminhamento.gestor, self.gestor)
        self.assertEqual(self.alta.encaminhamento.observacao, "Bons perfis")

    def test_sem_marcar_nada_nada_muda(self):
        r = self.client.post(self.url, {}, follow=True)
        self.assertContains(r, "Nenhuma candidatura marcada")
        self.assertFalse(Candidatura.objects.exclude(status="analisada").exists())

    def test_nao_encaminha_candidatura_de_outra_vaga(self):
        outra = Vaga.objects.create(empresa=self.vaga.empresa, gestor=self.gestor, titulo="Outra",
                                    tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta")
        c = Candidatura.objects.create(aluno=self.novo_aluno("z@aluno.undb.edu.br", "9").aluno, vaga=outra)
        self.client.post(self.url, {"encaminhar": [c.pk]})
        c.refresh_from_db()
        self.assertEqual(c.status, "analisada")

    def test_baixa_so_certificado_apresentado(self):
        ok = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, self.cert.pk])
        r = self.client.get(ok)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(b"".join(r.streaming_content), PDF)
        outro = cadastrar(self.alta.aluno, CertificadoNovo(titulo="Nao apresentado", conteudo=PDF, nome_arquivo="x.pdf"))
        fora = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, outro.pk])
        self.assertEqual(self.client.get(fora).status_code, 404)

    def test_consentimento_revogado_oculta_respostas_e_certificados(self):
        self.alta.aluno.registrar_consentimento(False)
        r = self.client.get(self.url)
        self.assertNotContains(r, "Quero aprender dados")
        self.assertNotContains(r, "Curso de SQL")
        self.assertContains(r, "revogou o termo LGPD")
        ok = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, self.cert.pk])
        self.assertEqual(self.client.get(ok).status_code, 404)

    def test_sem_perfil_de_gestor_so_consulta(self):
        root = Usuario.objects.create_superuser(email="root@undb.edu.br", password=SENHA, nome="Root")
        self.client.force_login(root)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertNotContains(r, 'name="encaminhar"')
        self.assertEqual(self.client.post(self.url, {"encaminhar": [self.alta.pk]}).status_code, 403)

    def test_quem_nao_tem_permissao_nao_ve(self):
        u = Usuario.objects.create_user(email="s@undb.edu.br", password=SENHA, nome="S", perfil="gestor", is_staff=True)
        self.client.force_login(u)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_link_na_lista_de_vagas(self):
        r = self.client.get(reverse("admin:backend_vaga_changelist"))
        self.assertContains(r, self.url)
