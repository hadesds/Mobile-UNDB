from datetime import date
from io import BytesIO

from pypdf import PdfReader

from backend.models import CompetenciaDoPerfil, Formacao, Experiencia
from .test_api import BaseAPITest


class ExportacaoPDFTests(BaseAPITest):
    url = "/api/v1/me/curriculo/pdf/"

    def setUp(self):
        self.ana = self.novo_aluno()
        self.como(self.ana)
        self.perfil = self.ana.aluno.perfil_competencias
        self.formacao = Formacao.objects.create(perfil=self.perfil, nivel="graduacao",
            curso="Engenharia de Software", instituicao="UNDB", inicio=date(2023, 2, 1))
        CompetenciaDoPerfil.objects.create(perfil=self.perfil, competencia=self.python)

    def pdf(self, query=""):
        resposta = self.client.get(self.url + query)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta["Content-Type"], "application/pdf")
        self.assertIn("attachment", resposta["Content-Disposition"])
        self.assertIn("no-store", resposta["Cache-Control"])
        conteudo = b"".join(resposta.streaming_content)
        self.assertTrue(conteudo.startswith(b"%PDF"))
        leitor = PdfReader(BytesIO(conteudo))
        return "\n".join(p.extract_text() for p in leitor.pages), len(leitor.pages)

    def test_pdf_atualiza_apos_editar_perfil_pela_api(self):
        texto, _ = self.pdf()
        self.assertIn("UNDB", texto)
        r = self.client.patch(f"/api/v1/me/perfil/formacoes/{self.formacao.id}/",
                              {"instituicao": "Instituição Atualizada"}, format="json")
        self.assertEqual(r.status_code, 200)
        texto, _ = self.pdf()
        self.assertIn("Instituição Atualizada", texto)
        self.assertNotIn("UNDB", texto)

    def test_selecao_omite_secoes_e_dados_de_outro_aluno(self):
        outro = self.novo_aluno("outra@aluno.undb.edu.br", "2026002")
        Formacao.objects.create(perfil=outro.aluno.perfil_competencias, nivel="medio",
                                 curso="Informação Privada", instituicao="Privada")
        texto, _ = self.pdf("?secoes=competencias")
        self.assertIn("Python", texto)
        self.assertNotIn("Formação acadêmica", texto)
        self.assertNotIn("Idiomas", texto)
        self.assertNotIn("Informação Privada", texto)

    def test_rejeita_secoes_invalidas(self):
        for query in ["?secoes=", "?secoes=segredo", "?secoes=formacoes,segredo"]:
            self.assertEqual(self.client.get(self.url + query).status_code, 400)

    def test_exige_login_perfil_aluno_e_consentimento(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.ana.aluno.registrar_consentimento(False)
        self.como(self.ana)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_texto_longo_marcacao_e_multiplas_paginas(self):
        Experiencia.objects.create(perfil=self.perfil, tipo="projeto", funcao="Pesquisa <b> & dados",
            organizacao="Laboratório", descricao=("Desenvolvimento e análise de sistemas. " * 700))
        texto, paginas = self.pdf()
        self.assertIn("Pesquisa <b> & dados", texto)
        self.assertGreater(paginas, 1)

    def test_perfil_vazio_ainda_gera_pdf(self):
        self.perfil.formacoes.all().delete()
        self.perfil.competencias.all().delete()
        texto, paginas = self.pdf()
        self.assertIn("Ana", texto)
        self.assertNotIn("Formação acadêmica", texto)
        self.assertEqual(paginas, 1)
