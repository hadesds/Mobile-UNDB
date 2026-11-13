from datetime import timedelta
from io import StringIO

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone

from backend.compatibilidade import analisar
from backend.models import Analise, Candidatura, Empresa, Encaminhamento, RequisitoCompetencia, Usuario, Vaga

from .test_api import BaseAPITest


class AcoesEmLoteTests(BaseAPITest):
    def setUp(self):
        call_command("criar_grupos", stdout=StringIO())
        u = self.gestor.usuario
        u.is_staff = True
        u.save(update_fields=["is_staff"])
        u.groups.add(Group.objects.get(name="Gestor TEIA"))
        self.client.force_login(u)

        self.empresa = Empresa.objects.create(nome="Empresa X")
        self.vaga = Vaga.objects.create(
            empresa=self.empresa, gestor=self.gestor, titulo="Estágio Python",
            tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta",
            prazo=timezone.localdate() + timedelta(days=10),
        )
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.python)
        self.c1 = self.candidatura("ana@aluno.undb.edu.br", "1")
        self.c2 = self.candidatura("bia@aluno.undb.edu.br", "2")

    def candidatura(self, email, matricula):
        c = Candidatura.objects.create(aluno=self.novo_aluno(email, matricula).aluno, vaga=self.vaga)
        analisar(c)
        return c

    def acao(self, url, acao, objetos):
        return self.client.post(
            reverse(url), {"action": acao, "_selected_action": [o.pk for o in objetos]}, follow=True
        )

    def test_encaminhar_em_lote_usa_a_mesma_regra_da_api(self):
        r = self.acao("admin:backend_candidatura_changelist", "encaminhar", [self.c1, self.c2])
        self.assertContains(r, "2 candidatura(s) encaminhada(s)")
        for c in (self.c1, self.c2):
            c.refresh_from_db()
            self.assertEqual(c.status, "encaminhada")
            self.assertEqual(c.encaminhamento.gestor, self.gestor)

    def test_voltar_para_fila_desfaz_o_encaminhamento(self):
        self.acao("admin:backend_candidatura_changelist", "encaminhar", [self.c1])
        self.acao("admin:backend_candidatura_changelist", "voltar_para_fila", [self.c1])
        self.c1.refresh_from_db()
        self.assertEqual(self.c1.status, "analisada")
        self.assertFalse(Encaminhamento.objects.exists())

    def test_nao_selecionar(self):
        self.acao("admin:backend_candidatura_changelist", "nao_selecionar", [self.c2])
        self.c2.refresh_from_db()
        self.assertEqual(self.c2.status, "nao_selecionada")

    def test_sem_perfil_de_gestor_nao_decide(self):
        root = Usuario.objects.create_superuser(email="root@undb.edu.br", password="x-Senha-123", nome="Root")
        self.client.force_login(root)
        r = self.acao("admin:backend_candidatura_changelist", "encaminhar", [self.c1])
        self.assertContains(r, "Só quem tem perfil de gestor")
        self.c1.refresh_from_db()
        self.assertEqual(self.c1.status, "analisada")

    def test_reanalisar_pula_quem_revogou_o_termo(self):
        self.c2.aluno.registrar_consentimento(False)
        r = self.acao("admin:backend_candidatura_changelist", "reanalisar", [self.c1, self.c2])
        self.assertContains(r, "1 análise(s) refeita(s)")
        self.assertContains(r, "1 ignorada(s)")
        self.assertEqual(Analise.objects.filter(candidatura=self.c1).count(), 2)
        self.assertEqual(Analise.objects.filter(candidatura=self.c2).count(), 1)

    def test_lista_mostra_compatibilidade_e_filtra_por_vaga_status_e_curso(self):
        url = reverse("admin:backend_candidatura_changelist")
        r = self.client.get(url, {"vaga__id__exact": self.vaga.pk, "status__exact": "analisada",
                                  "aluno__curso__id__exact": self.curso.pk, "o": "-4"})
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "0% · baixa")
        self.assertEqual(self.client.get(url, {"q": "bia@aluno"}).context["cl"].result_count, 1)
        self.assertEqual(self.client.get(url, {"q": "Engenharia"}).context["cl"].result_count, 2)

    def test_encerrar_vagas_em_lote(self):
        self.acao("admin:backend_vaga_changelist", "encerrar", [self.vaga])
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.status, "encerrada")
        r = self.client.get(reverse("admin:backend_vaga_changelist"), {"q": "Python"})
        self.assertEqual(r.context["cl"].result_count, 1)

    def test_desativar_empresas_em_lote(self):
        self.acao("admin:backend_empresa_changelist", "desativar", [self.empresa])
        self.empresa.refresh_from_db()
        self.assertFalse(self.empresa.ativa)
