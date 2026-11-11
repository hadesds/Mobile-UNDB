"""T0 (faixas/justificativa) e T2 (modelo de currículo por vaga)."""

from datetime import timedelta

from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone

from backend.management import seed_dados as D
from backend.models import (
    Analise,
    CampoModelo,
    Candidatura,
    CompetenciaDoPerfil,
    Empresa,
    Experiencia,
    ModeloCurriculo,
    RequisitoCompetencia,
    RespostaCandidatura,
    Vaga,
)

from .test_api import BaseAPITest


class FaixaTests(BaseAPITest):
    def test_faixas_alta_75_media_50(self):
        def faixa(score):
            return Analise(score=score).faixa

        self.assertEqual(faixa(100), "alta")
        self.assertEqual(faixa(75), "alta")
        self.assertEqual(faixa(74), "media")
        self.assertEqual(faixa(50), "media")
        self.assertEqual(faixa(49), "baixa")
        self.assertEqual(faixa(0), "baixa")

    def test_justificativa_conta_requisitos_e_lista_obrigatorios(self):
        a = Analise(
            score=50,
            requisitos_atendidos=[{"requisito": "Python", "obrigatorio": True}],
            requisitos_faltantes=[{"requisito": "SQL", "obrigatorio": True}],
        )
        self.assertIn("1 de 2 requisitos", a.justificativa)
        self.assertIn("faixa média", a.justificativa)
        self.assertIn("Obrigatórios sem evidência: SQL", a.justificativa)

    def test_justificativa_sem_requisitos(self):
        self.assertIn("não tem requisitos", Analise(score=0).justificativa)


class FormularioTests(BaseAPITest):
    def setUp(self):
        self.aluno_user = self.novo_aluno()
        self.perfil = self.aluno_user.aluno.perfil_competencias
        CompetenciaDoPerfil.objects.create(perfil=self.perfil, competencia=self.python, nivel=2)
        Experiencia.objects.create(
            perfil=self.perfil, tipo="projeto", organizacao="UNDB", funcao="Dev", descricao="API em Python"
        )
        self.vaga = Vaga.objects.create(
            empresa=Empresa.objects.create(nome="Empresa X"),
            gestor=self.gestor,
            titulo="Estágio Python",
            tipo="estagio_nao_obrigatorio",
            modalidade="remoto",
            status="aberta",
            prazo=timezone.localdate() + timedelta(days=10),
        )
        RequisitoCompetencia.objects.create(vaga=self.vaga, competencia=self.python)
        self.modelo = ModeloCurriculo.objects.create(vaga=self.vaga, instrucoes="Responda tudo.")
        CampoModelo.objects.create(
            modelo=self.modelo, chave="nome", rotulo="Nome", origem="perfil", fonte_perfil="nome", ordem=0
        )
        CampoModelo.objects.create(
            modelo=self.modelo, chave="competencias", rotulo="Competências", origem="perfil",
            fonte_perfil="competencias", formato="texto_longo", obrigatorio=False, ordem=1,
        )
        CampoModelo.objects.create(
            modelo=self.modelo, chave="motivacao", rotulo="Por que esta vaga?", origem="vaga",
            formato="texto_longo", ordem=2,
        )
        CampoModelo.objects.create(
            modelo=self.modelo, chave="github", rotulo="GitHub", origem="vaga", formato="url",
            obrigatorio=False, ordem=3,
        )
        self.como(self.aluno_user)

    def formulario(self, vaga=None):
        return self.client.get(reverse("vaga-formulario", args=[(vaga or self.vaga).id]))

    def candidatar(self, respostas=None, vaga=None):
        corpo = {"vaga": (vaga or self.vaga).id}
        if respostas is not None:
            corpo["respostas"] = respostas
        return self.client.post(reverse("candidatura-list"), corpo, format="json")

    # --- GET formulário ------------------------------------------------------

    def test_formulario_preenche_perfil_e_deixa_vaga_em_branco(self):
        r = self.formulario()
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["instrucoes"], "Responda tudo.")
        self.assertIsNone(r.data["candidatura"])
        campos = {c["chave"]: c for c in r.data["campos"]}
        self.assertEqual(list(campos), ["nome", "competencias", "motivacao", "github"])
        self.assertEqual(campos["nome"]["valor"], "Ana")
        self.assertTrue(campos["nome"]["autopreenchido"])
        self.assertEqual(campos["competencias"]["valor"], "Python (intermediário)")
        self.assertEqual(campos["motivacao"]["valor"], "")
        self.assertFalse(campos["motivacao"]["autopreenchido"])
        self.assertEqual(campos["github"]["formato"], "url")

    def test_vaga_sem_modelo_ganha_modelo_padrao_de_perfil(self):
        self.modelo.delete()
        r = self.formulario()
        self.assertEqual(r.status_code, 200)
        self.assertTrue(all(c["origem"] == "perfil" for c in r.data["campos"]))
        self.assertEqual(r.data["campos"][0]["valor"], "Ana")
        self.assertTrue(ModeloCurriculo.objects.filter(vaga=self.vaga).exists())

    def test_formulario_exige_aluno_com_consentimento(self):
        self.aluno_user.aluno.registrar_consentimento(False)
        self.assertEqual(self.formulario().status_code, 403)
        self.como(self.gestor.usuario)
        self.assertEqual(self.formulario().status_code, 403)

    def test_formulario_de_vaga_fechada_404(self):
        self.vaga.status = "encerrada"
        self.vaga.save()
        self.assertEqual(self.formulario().status_code, 404)

    # --- POST candidatura com respostas -------------------------------------

    def test_candidatura_grava_respostas_e_marca_edicao(self):
        r = self.candidatar({"nome": "Ana Souza", "motivacao": "Gosto de Python."})
        self.assertEqual(r.status_code, 201, r.content)
        respostas = {x["chave"]: x for x in r.data["respostas"]}
        self.assertEqual(respostas["nome"]["valor"], "Ana Souza")
        self.assertTrue(respostas["nome"]["editado"])
        # Campo de perfil não enviado usa o valor do perfil.
        self.assertEqual(respostas["competencias"]["valor"], "Python (intermediário)")
        self.assertFalse(respostas["competencias"]["editado"])
        self.assertEqual(respostas["motivacao"]["valor"], "Gosto de Python.")
        self.assertEqual(respostas["github"]["valor"], "")
        self.assertIn("justificativa", r.data["analise"])
        self.assertEqual(r.data["analise"]["faixa"], "alta")

    def test_campo_obrigatorio_em_branco_400_por_chave(self):
        r = self.candidatar({"motivacao": "  "})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["respostas"], {"motivacao": "Campo obrigatório."})
        self.assertFalse(Candidatura.objects.exists())

    def test_formato_e_chave_desconhecida(self):
        r = self.candidatar({"motivacao": "x", "github": "nao-e-link", "inventado": "y"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("github", r.data["respostas"])
        self.assertIn("inventado", r.data["respostas"])

    def test_app_antigo_sem_respostas_continua_funcionando(self):
        r = self.candidatar()
        self.assertEqual(r.status_code, 201, r.content)
        respostas = {x["chave"]: x["valor"] for x in r.data["respostas"]}
        self.assertEqual(respostas["nome"], "Ana")
        self.assertEqual(respostas["motivacao"], "")

    def test_formulario_depois_de_candidatar_devolve_o_enviado(self):
        self.candidatar({"motivacao": "Gosto de Python."})
        r = self.formulario()
        self.assertIsNotNone(r.data["candidatura"])
        campos = {c["chave"]: c["valor"] for c in r.data["campos"]}
        self.assertEqual(campos["motivacao"], "Gosto de Python.")

    def test_resposta_sobrevive_a_campo_apagado(self):
        self.candidatar({"motivacao": "Gosto de Python."})
        self.modelo.campos.filter(chave="motivacao").delete()
        resp = RespostaCandidatura.objects.get(chave="motivacao")
        self.assertIsNone(resp.campo)
        self.assertEqual(resp.rotulo, "Por que esta vaga?")

    def test_gestor_ve_respostas_so_com_consentimento(self):
        self.candidatar({"motivacao": "Gosto de Python."})
        c = Candidatura.objects.get()
        self.como(self.gestor.usuario)
        url = reverse("gestor-candidatura-detail", args=[c.id])
        self.assertEqual(len(self.client.get(url).data["respostas"]), 4)
        self.aluno_user.aluno.registrar_consentimento(False)
        self.assertIsNone(self.client.get(url).data["respostas"])


class SeedModelosTests(BaseAPITest):
    def test_seed_cria_modelo_para_as_6_vagas_e_e_idempotente(self):
        call_command("seed", stdout=open("/dev/null", "w"))
        call_command("seed", stdout=open("/dev/null", "w"))
        self.assertEqual(ModeloCurriculo.objects.count(), len(D.VAGAS))
        for v in D.VAGAS:
            modelo = ModeloCurriculo.objects.get(vaga__titulo=v["titulo"])
            origens = set(modelo.campos.values_list("origem", flat=True))
            self.assertEqual(origens, {"perfil", "vaga"}, v["titulo"])
