import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse

from backend.importacao_certificados import CertificadoNovo, cadastrar, importar_lote
from backend.models import Certificado

from .test_api import BaseAPITest

PDF = b"%PDF-1.4\n%conteudo de teste\n"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
_MEDIA = tempfile.mkdtemp(prefix="teia-testes-")


def arquivo(nome="cert.pdf", conteudo=PDF):
    return SimpleUploadedFile(nome, conteudo)


@override_settings(MEDIA_ROOT=_MEDIA)
class CertificadoBase(BaseAPITest):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    def enviar(self, **extra):
        dados = {"titulo": "Curso de JS Avançado", "instituicao": "Alura", "carga_horaria": 20,
                 "data": "2026-08-10", "arquivo": arquivo()}
        dados.update(extra)
        return self.client.post(reverse("certificado-list"), dados, format="multipart")


class UploadTests(CertificadoBase):
    def setUp(self):
        self.user = self.novo_aluno()
        self.como(self.user)

    def test_aluno_envia_e_lista(self):
        r = self.enviar()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["origem"], "upload")
        self.assertEqual(r.data["titulo"], "Curso de JS Avançado")
        self.assertNotIn("arquivo", r.data)  # arquivo só sai pelo endpoint próprio

        lista = self.client.get(reverse("certificado-list"))
        self.assertEqual(lista.status_code, 200)
        self.assertEqual([c["id"] for c in lista.data], [r.data["id"]])

    def test_arquivo_vai_com_nome_aleatorio_e_original_fica_no_banco(self):
        self.enviar(arquivo=arquivo("Marina Costa - certificado.pdf"))
        c = Certificado.objects.get()
        self.assertEqual(c.nome_original, "Marina Costa - certificado.pdf")
        self.assertNotIn("Marina", c.arquivo.name)
        self.assertTrue(c.arquivo.name.startswith("certificados/"))

    def test_so_ve_os_proprios_certificados(self):
        self.enviar()
        outro = self.novo_aluno("bia@aluno.undb.edu.br", "2026002")
        self.como(outro)
        self.assertEqual(self.client.get(reverse("certificado-list")).data, [])
        c = Certificado.objects.get()
        self.assertEqual(self.client.get(reverse("certificado-detail", args=[c.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("certificado-arquivo", args=[c.id])).status_code, 404)
        self.assertEqual(self.client.delete(reverse("certificado-detail", args=[c.id])).status_code, 404)

    def test_rejeita_formato_tamanho_e_arquivo_falso(self):
        r = self.enviar(arquivo=arquivo("virus.exe", b"MZ"))
        self.assertEqual(r.status_code, 400)
        self.assertIn("arquivo", r.data)
        # extensão diz pdf, mas o conteúdo não é
        self.assertEqual(self.enviar(arquivo=arquivo("falso.pdf", b"texto qualquer")).status_code, 400)
        grande = arquivo("grande.pdf", PDF + b"0" * (5 * 1024 * 1024))
        self.assertEqual(self.enviar(arquivo=grande).status_code, 400)
        self.assertEqual(Certificado.objects.count(), 0)

    def test_aceita_png(self):
        self.assertEqual(self.enviar(arquivo=arquivo("foto.png", PNG)).status_code, 201)

    def test_titulo_e_arquivo_sao_obrigatorios(self):
        r = self.client.post(reverse("certificado-list"), {"titulo": "  "}, format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("titulo", r.data)
        self.assertIn("arquivo", r.data)

    def test_baixar_arquivo(self):
        cid = self.enviar().data["id"]
        r = self.client.get(reverse("certificado-arquivo", args=[cid]), {"baixar": "1"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")
        self.assertIn("attachment", r["Content-Disposition"])
        self.assertEqual(b"".join(r.streaming_content), PDF)

    def test_apagar_remove_registro_e_arquivo(self):
        cid = self.enviar().data["id"]
        c = Certificado.objects.get(pk=cid)
        storage, nome = c.arquivo.storage, c.arquivo.name
        self.assertTrue(storage.exists(nome))
        self.assertEqual(self.client.delete(reverse("certificado-detail", args=[cid])).status_code, 204)
        self.assertFalse(Certificado.objects.exists())
        self.assertFalse(storage.exists(nome))

    def test_exige_login_e_consentimento(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("certificado-list")).status_code, 401)
        self.user.aluno.registrar_consentimento(False)
        self.como(self.user)
        self.assertEqual(self.client.get(reverse("certificado-list")).status_code, 403)
        self.assertEqual(self.enviar().status_code, 403)

    def test_gestor_nao_usa_o_endpoint_do_aluno(self):
        self.como(self.gestor.usuario)
        self.assertEqual(self.client.get(reverse("certificado-list")).status_code, 403)


class CamadaDeImportacaoTests(CertificadoBase):
    def test_origem_vem_da_camada_e_nao_do_endpoint(self):
        aluno = self.novo_aluno().aluno
        novo = CertificadoNovo(titulo="Python", conteudo=PDF, nome_arquivo="a.pdf")
        c = importar_lote(aluno, [novo, novo], Certificado.Origem.UNDB)
        self.assertEqual([x.origem for x in c], ["undb", "undb"])
        self.assertEqual(cadastrar(aluno, novo).origem, "upload")
