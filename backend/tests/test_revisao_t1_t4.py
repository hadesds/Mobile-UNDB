"""Revisão da T1 (certificados) e da T4 (painel admin) antes do release v0.4.0.

Complementa test_certificados, test_admin*, test_grupos e test_triagem_admin com
testes unitários dos módulos novos (decisao, importacao_certificados, regra de
compatibilidade) e casos de borda dos endpoints e do painel.
"""

import shutil
import tempfile
from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from backend.compatibilidade import _cita_termo, _evidencia_certificado, analisar
from backend.decisao import decidir
from backend.importacao_certificados import (
    LIMITE_BYTES,
    CertificadoInvalido,
    CertificadoNovo,
    cadastrar,
    importar_lote,
    tipo_de_conteudo,
    tipo_pelo_nome,
)
from backend.models import (
    Candidatura,
    CandidaturaCertificado,
    Certificado,
    Empresa,
    Encaminhamento,
    Gestor,
    RequisitoCompetencia,
    Usuario,
    Vaga,
    normalizar_termo,
)

from .test_api import SENHA, BaseAPITest

PDF = b"%PDF-1.4\n%teste\n"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
_MEDIA = tempfile.mkdtemp(prefix="teia-revisao-")


class MediaTemporaria(BaseAPITest):
    """Arquivos de teste numa pasta temporária, apagada no fim."""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    def nova_vaga(self, titulo="Estágio Python", **extra):
        dados = dict(
            empresa=Empresa.objects.create(nome=f"Empresa {titulo}"), gestor=self.gestor, titulo=titulo,
            tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta",
            prazo=timezone.localdate() + timedelta(days=10),
        )
        dados.update(extra)
        vaga = Vaga.objects.create(**dados)
        RequisitoCompetencia.objects.create(vaga=vaga, competencia=self.python)
        return vaga

    def cert(self, aluno, titulo="Curso de Python", **extra):
        return cadastrar(aluno, CertificadoNovo(titulo=titulo, conteudo=PDF, nome_arquivo="a.pdf", **extra))


# ---------------------------------------------------------------------------
# backend/decisao.py
# ---------------------------------------------------------------------------


class DecisaoTests(BaseAPITest):
    """A regra única usada pela API e pelo admin."""

    def setUp(self):
        self.vaga = Vaga.objects.create(
            empresa=Empresa.objects.create(nome="X"), gestor=self.gestor, titulo="Vaga",
            tipo="estagio_nao_obrigatorio", modalidade="remoto", status="aberta",
        )
        self.c = Candidatura.objects.create(aluno=self.novo_aluno().aluno, vaga=self.vaga)
        u2 = Usuario.objects.create_user(email="g2@undb.edu.br", password=SENHA, nome="Outra", perfil="gestor")
        self.gestor2 = Gestor.objects.create(usuario=u2, nucleo=self.nucleo)

    def recarregar(self):
        return Candidatura.objects.get(pk=self.c.pk)

    def test_encaminhar_registra_quem_decidiu_e_a_observacao(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor, "Bom perfil")
        c = self.recarregar()
        self.assertEqual(c.status, "encaminhada")
        self.assertEqual(c.encaminhamento.gestor, self.gestor)
        self.assertEqual(c.encaminhamento.observacao, "Bom perfil")

    def test_encaminhar_sem_observacao_grava_texto_vazio(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor)
        self.assertEqual(self.recarregar().encaminhamento.observacao, "")

    def test_avancar_mantem_o_gestor_original(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor, "primeira")
        decidir(self.recarregar(), Candidatura.Status.EM_PROCESSO, self.gestor2)
        c = self.recarregar()
        self.assertEqual(c.status, "em_processo")
        self.assertEqual(c.encaminhamento.gestor, self.gestor)  # quem encaminhou continua registrado
        self.assertEqual(c.encaminhamento.observacao, "primeira")  # None não apaga a observação
        self.assertEqual(Encaminhamento.objects.count(), 1)

    def test_observacao_nova_substitui_a_antiga(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor, "primeira")
        decidir(self.recarregar(), Candidatura.Status.EM_PROCESSO, self.gestor, "")
        self.assertEqual(self.recarregar().encaminhamento.observacao, "")

    def test_voltar_para_a_fila_apaga_o_encaminhamento(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor)
        decidir(self.recarregar(), Candidatura.Status.ANALISADA, self.gestor)
        self.assertEqual(self.recarregar().status, "analisada")
        self.assertFalse(Encaminhamento.objects.exists())

    def test_nao_selecionar_sem_encaminhamento_nao_cria_um(self):
        decidir(self.c, Candidatura.Status.NAO_SELECIONADA, self.gestor, "Sem vaga para o perfil")
        self.assertEqual(self.recarregar().status, "nao_selecionada")
        self.assertFalse(Encaminhamento.objects.exists())

    def test_nao_selecionar_depois_de_encaminhar_atualiza_a_observacao(self):
        decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor, "ok")
        decidir(self.recarregar(), Candidatura.Status.NAO_SELECIONADA, self.gestor, "Empresa recusou")
        self.assertEqual(Encaminhamento.objects.get().observacao, "Empresa recusou")

    def test_falha_desfaz_tudo(self):
        antes = self.recarregar().status
        with mock.patch.object(Candidatura, "save", side_effect=RuntimeError("banco fora")):
            with self.assertRaises(RuntimeError):
                decidir(self.c, Candidatura.Status.ENCAMINHADA, self.gestor)
        self.assertFalse(Encaminhamento.objects.exists())
        self.assertEqual(self.recarregar().status, antes)


# ---------------------------------------------------------------------------
# backend/importacao_certificados.py
# ---------------------------------------------------------------------------


class TipoDeConteudoTests(SimpleTestCase):
    def test_limite_de_5_mb_e_inclusivo(self):
        self.assertEqual(tipo_de_conteudo("a.pdf", PDF + b"0" * (LIMITE_BYTES - len(PDF))), "application/pdf")
        with self.assertRaisesMessage(CertificadoInvalido, "5 MB"):
            tipo_de_conteudo("a.pdf", PDF + b"0" * (LIMITE_BYTES - len(PDF) + 1))

    def test_extensao_ignora_caixa(self):
        self.assertEqual(tipo_de_conteudo("CERT.PDF", PDF), "application/pdf")
        self.assertEqual(tipo_de_conteudo("foto.JPEG", JPG), "image/jpeg")
        self.assertEqual(tipo_de_conteudo("foto.jpg", JPG), "image/jpeg")
        self.assertEqual(tipo_de_conteudo("foto.Png", PNG), "image/png")

    def test_recusa_sem_extensao_ou_formato_fora_da_lista(self):
        for nome in ("certificado", "", None, "a.gif", "a.svg", "a.pdf.exe", "a.docx"):
            with self.subTest(nome=nome), self.assertRaisesMessage(CertificadoInvalido, "Formato"):
                tipo_de_conteudo(nome, PDF)

    def test_assinatura_precisa_bater_com_a_extensao(self):
        for nome, conteudo in (("a.jpg", PNG), ("a.png", JPG), ("a.pdf", PNG), ("a.png", b"")):
            with self.subTest(nome=nome), self.assertRaisesMessage(CertificadoInvalido, "corrompido"):
                tipo_de_conteudo(nome, conteudo)

    def test_tipo_pelo_nome(self):
        self.assertEqual(tipo_pelo_nome("certificados/abc.pdf"), "application/pdf")
        self.assertEqual(tipo_pelo_nome("certificados/abc.JPG"), "image/jpeg")
        self.assertEqual(tipo_pelo_nome("x.bin"), "application/octet-stream")
        self.assertEqual(tipo_pelo_nome(""), "application/octet-stream")


@override_settings(MEDIA_ROOT=_MEDIA)
class CadastrarTests(MediaTemporaria):
    def setUp(self):
        self.aluno = self.novo_aluno().aluno

    def test_limpa_espacos_e_guarda_metadados(self):
        c = cadastrar(self.aluno, CertificadoNovo(
            titulo="  Curso de SQL  ", instituicao=" Alura ", carga_horaria=20,
            conteudo=PDF, nome_arquivo="Meu Certificado.PDF",
        ))
        self.assertEqual((c.titulo, c.instituicao, c.carga_horaria), ("Curso de SQL", "Alura", 20))
        self.assertEqual(c.origem, "upload")
        self.assertTrue(c.arquivo.name.endswith(".pdf"))  # extensão normalizada no storage
        self.assertEqual(c.nome_original, "Meu Certificado.PDF")

    def test_nome_original_longo_e_cortado_mantendo_a_extensao(self):
        nome = "x" * 300 + ".pdf"
        c = cadastrar(self.aluno, CertificadoNovo(titulo="T", conteudo=PDF, nome_arquivo=nome))
        self.assertEqual(len(c.nome_original), 255)
        self.assertTrue(c.nome_original.endswith(".pdf"))

    def test_invalido_nao_grava_nada(self):
        with self.assertRaises(CertificadoInvalido):
            cadastrar(self.aluno, CertificadoNovo(titulo="T", conteudo=b"oi", nome_arquivo="a.pdf"))
        self.assertFalse(Certificado.objects.exists())

    def test_importar_lote_e_tudo_ou_nada_inclusive_no_storage(self):
        bom = CertificadoNovo(titulo="Bom", conteudo=PDF, nome_arquivo="a.pdf")
        ruim = CertificadoNovo(titulo="Ruim", conteudo=b"oi", nome_arquivo="b.pdf")
        with mock.patch("django.core.files.storage.FileSystemStorage.save", wraps=None) as salvar:
            salvar.side_effect = lambda nome, *a, **k: nome
            with self.assertRaises(CertificadoInvalido):
                importar_lote(self.aluno, [bom, ruim], Certificado.Origem.UNDB)
        self.assertFalse(Certificado.objects.exists())
        # o lote é conferido inteiro antes de gravar: nenhum arquivo fica órfão no storage
        salvar.assert_not_called()

    def test_apagar_aluno_apaga_certificados_e_arquivos(self):
        c = cadastrar(self.aluno, CertificadoNovo(titulo="T", conteudo=PDF, nome_arquivo="a.pdf"))
        storage, nome = c.arquivo.storage, c.arquivo.name
        self.assertTrue(storage.exists(nome))
        self.aluno.usuario.delete()
        self.assertFalse(Certificado.objects.exists())
        self.assertFalse(storage.exists(nome))


# ---------------------------------------------------------------------------
# Regra de compatibilidade dos certificados (regras-0.3)
# ---------------------------------------------------------------------------


class CitaTermoTests(SimpleTestCase):
    def cita(self, titulo, termo):
        return _cita_termo(normalizar_termo(titulo), normalizar_termo(termo))

    def test_palavra_inteira_sem_acento_e_sem_caixa(self):
        casos = [
            ("Curso de PYTHON", "python", True),
            ("Inglês Instrumental", "ingles", True),
            ("Java-Spring Boot", "java", True),
            ("Excel/VBA", "excel", True),
            ("Machine   Learning na prática", "machine learning", True),
            ("Node.js do zero", "node.js", True),
            ("Curso de JavaScript", "java", False),
            ("Pythonista", "python", False),
            ("Python3 básico", "python", False),  # dígito colado faz parte da palavra
        ]
        for titulo, termo, esperado in casos:
            with self.subTest(titulo=titulo, termo=termo):
                self.assertEqual(self.cita(titulo, termo), esperado)

    def test_linguagens_com_simbolo(self):
        self.assertTrue(self.cita("Curso de C# Avançado", "c#"))
        self.assertFalse(self.cita("Curso de C# Avançado", "c"))  # C# não comprova C
        self.assertTrue(self.cita("Fundamentos de C++", "c++"))
        self.assertFalse(self.cita("Fundamentos de C++", "c"))
        self.assertTrue(self.cita("Linguagem C e ponteiros", "c"))

    def test_termo_com_caractere_de_regex_e_escapado(self):
        self.assertFalse(self.cita("nodexjs", "node.js"))  # "." não vira curinga


class EvidenciaCertificadoTests(SimpleTestCase):
    def competencia(self, nome, *sinonimos):
        sins = [SimpleNamespace(termo_normalizado=normalizar_termo(s)) for s in sinonimos]
        return SimpleNamespace(nome=nome, sinonimos=SimpleNamespace(all=lambda: sins))

    def test_sem_certificados_nao_ha_evidencia(self):
        self.assertIsNone(_evidencia_certificado(self.competencia("Python"), []))

    def test_primeiro_certificado_que_cita_e_o_usado(self):
        certs = [
            SimpleNamespace(titulo="Git e GitHub", instituicao=""),
            SimpleNamespace(titulo="Oficina de PY", instituicao="Alura"),
            SimpleNamespace(titulo="Python avançado", instituicao=""),
        ]
        self.assertEqual(
            _evidencia_certificado(self.competencia("Python", "py"), certs), "Certificado: Oficina de PY · Alura"
        )

    def test_sem_instituicao_nao_deixa_separador_solto(self):
        certs = [SimpleNamespace(titulo="SQL básico", instituicao="")]
        self.assertEqual(_evidencia_certificado(self.competencia("SQL"), certs), "Certificado: SQL básico")


@override_settings(MEDIA_ROOT=_MEDIA)
class AnaliseComCertificadosTests(MediaTemporaria):
    def test_snapshot_guarda_os_titulos_apresentados(self):
        aluno = self.novo_aluno().aluno
        c = Candidatura.objects.create(aluno=aluno, vaga=self.nova_vaga())
        CandidaturaCertificado.objects.create(candidatura=c, certificado=self.cert(aluno, "Curso de Python"))
        analise = analisar(c)
        self.assertEqual(analise.perfil_snapshot["certificados"], ["Curso de Python"])
        self.assertEqual(analise.score, 100)
        self.assertEqual(analise.versao_motor, "regras-0.3")

    def test_certificado_vale_tambem_para_requisito_desejavel(self):
        aluno = self.novo_aluno().aluno
        vaga = self.nova_vaga()
        RequisitoCompetencia.objects.create(vaga=vaga, competencia=self.sql, obrigatorio=False)
        c = Candidatura.objects.create(aluno=aluno, vaga=vaga)
        CandidaturaCertificado.objects.create(candidatura=c, certificado=self.cert(aluno, "Banco de dados SQL"))
        analise = analisar(c)
        sql = next(i for i in analise.requisitos_atendidos if i["requisito"] == "SQL")
        self.assertFalse(sql["obrigatorio"])


# ---------------------------------------------------------------------------
# API: bordas dos endpoints novos
# ---------------------------------------------------------------------------


@override_settings(MEDIA_ROOT=_MEDIA)
class CertificadoEndpointBordasTests(MediaTemporaria):
    def setUp(self):
        self.user = self.novo_aluno()
        self.aluno = self.user.aluno
        self.como(self.user)

    def enviar(self, formato="multipart", **campos):
        dados = {"titulo": "Curso de SQL", "arquivo": SimpleUploadedFile("sql.pdf", PDF)}
        dados.update(campos)
        return self.client.post(reverse("certificado-list"), dados, format=formato)

    def test_validacoes_dos_campos(self):
        casos = {
            "titulo": ["   ", "x" * 151],
            "carga_horaria": [0, -5, 10001, "abc"],
            "data": ["10/08/2026", "2026-13-01"],
        }
        for campo, valores in casos.items():
            for valor in valores:
                with self.subTest(campo=campo, valor=valor):
                    r = self.enviar(**{campo: valor})
                    self.assertEqual(r.status_code, 400, r.content)
                    self.assertIn(campo, r.data)
        self.assertFalse(Certificado.objects.exists())

    def test_opcionais_vazios_no_multipart_viram_nulos(self):
        r = self.enviar(instituicao="", carga_horaria="", data="")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.data["instituicao"], r.data["carga_horaria"], r.data["data"]), ("", None, None))

    def test_json_nao_e_aceito_no_envio(self):
        r = self.client.post(reverse("certificado-list"), {"titulo": "X"}, format="json")
        self.assertEqual(r.status_code, 415)

    def test_arquivo_grande_e_recusado_sem_ler_o_conteudo(self):
        grande = SimpleUploadedFile("g.pdf", PDF + b"0" * LIMITE_BYTES)
        with mock.patch("backend.api.serializers.tipo_de_conteudo", wraps=tipo_de_conteudo) as conferir:
            r = self.enviar(arquivo=grande)
        self.assertEqual(r.status_code, 400)
        self.assertIn("5 MB", str(r.data["arquivo"]))
        conferir.assert_not_called()  # parou pelo tamanho informado, antes de carregar na memória

    def test_download_com_tipo_e_nome_corretos(self):
        cid = self.enviar(arquivo=SimpleUploadedFile("Diploma Ana.png", PNG)).data["id"]
        url = reverse("certificado-arquivo", args=[cid])
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "image/png")
        self.assertTrue(r["Content-Disposition"].startswith("inline"))
        self.assertEqual(b"".join(r.streaming_content), PNG)
        r = self.client.get(url, {"baixar": "1"})
        self.assertTrue(r["Content-Disposition"].startswith("attachment"))
        self.assertIn("Diploma", r["Content-Disposition"])

    def test_arquivo_que_sumiu_do_storage_da_404_e_nao_500(self):
        cid = self.enviar().data["id"]
        c = Certificado.objects.get(pk=cid)
        c.arquivo.storage.delete(c.arquivo.name)
        self.assertEqual(self.client.get(reverse("certificado-arquivo", args=[cid])).status_code, 404)

    def test_termo_revogado_bloqueia_todas_as_rotas(self):
        cid = self.enviar().data["id"]
        self.aluno.registrar_consentimento(False)
        for metodo, url in [
            ("get", reverse("certificado-list")),
            ("get", reverse("certificado-detail", args=[cid])),
            ("get", reverse("certificado-arquivo", args=[cid])),
            ("delete", reverse("certificado-detail", args=[cid])),
        ]:
            with self.subTest(metodo=metodo, url=url):
                self.assertEqual(getattr(self.client, metodo)(url).status_code, 403)
        self.assertEqual(self.enviar().status_code, 403)

    def test_metodos_nao_suportados(self):
        cid = self.enviar().data["id"]
        url = reverse("certificado-detail", args=[cid])
        self.assertEqual(self.client.put(url, {"titulo": "X"}, format="multipart").status_code, 405)
        self.assertEqual(self.client.patch(url, {"titulo": "X"}, format="multipart").status_code, 405)


@override_settings(MEDIA_ROOT=_MEDIA)
class CandidaturaCertificadosBordasTests(MediaTemporaria):
    def setUp(self):
        self.user = self.novo_aluno()
        self.aluno = self.user.aluno
        self.vaga = self.nova_vaga()
        self.c1 = self.cert(self.aluno)
        self.como(self.user)

    def candidatar(self, **extra):
        return self.client.post(reverse("candidatura-list"), {"vaga": self.vaga.id, **extra}, format="json")

    def test_formatos_invalidos_de_certificados(self):
        for valor in (None, "3", {"id": 3}, ["abc"], [0], [-1]):
            with self.subTest(valor=valor):
                r = self.candidatar(certificados=valor)
                self.assertEqual(r.status_code, 400, r.content)
                self.assertIn("certificados", r.data)
        self.assertFalse(Candidatura.objects.exists())

    def test_lista_vazia_e_aceita(self):
        r = self.candidatar(certificados=[])
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["certificados"], [])

    def test_vaga_fechada_nao_grava_certificados(self):
        self.vaga.status = Vaga.Status.ENCERRADA
        self.vaga.save()
        self.assertEqual(self.candidatar(certificados=[self.c1.id]).status_code, 400)
        self.assertFalse(CandidaturaCertificado.objects.exists())

    def test_falha_na_analise_desfaz_candidatura_e_certificados(self):
        with mock.patch("backend.api.views.analisar", side_effect=RuntimeError("motor")):
            with self.assertRaises(RuntimeError):
                self.candidatar(certificados=[self.c1.id])
        self.assertFalse(Candidatura.objects.exists())
        self.assertFalse(CandidaturaCertificado.objects.exists())

    def test_gestor_nao_baixa_certificado_de_outra_candidatura_do_mesmo_aluno(self):
        outra_vaga = self.nova_vaga("Estágio Dados")
        c2 = self.cert(self.aluno, "Curso de SQL")
        cid_a = self.candidatar(certificados=[self.c1.id]).data["id"]
        cid_b = self.client.post(
            reverse("candidatura-list"), {"vaga": outra_vaga.id, "certificados": [c2.id]}, format="json"
        ).data["id"]
        self.como(self.gestor.usuario)
        ok = reverse("gestor-candidatura-certificado-arquivo", args=[cid_b, c2.id])
        cruzado = reverse("gestor-candidatura-certificado-arquivo", args=[cid_a, c2.id])
        self.assertEqual(self.client.get(ok).status_code, 200)
        self.assertEqual(self.client.get(cruzado).status_code, 404)

    def test_gestor_arquivo_sumido_e_candidatura_inexistente_dao_404(self):
        cid = self.candidatar(certificados=[self.c1.id]).data["id"]
        self.como(self.gestor.usuario)
        self.assertEqual(
            self.client.get(reverse("gestor-candidatura-certificado-arquivo", args=[999999, self.c1.id])).status_code,
            404,
        )
        self.c1.arquivo.storage.delete(self.c1.arquivo.name)
        url = reverse("gestor-candidatura-certificado-arquivo", args=[cid, self.c1.id])
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_decidir_pela_api_continua_igual_depois_do_refactor(self):
        cid = self.candidatar().data["id"]
        self.como(self.gestor.usuario)
        url = reverse("gestor-candidatura-decidir", args=[cid])
        r = self.client.post(url, {"status": "encaminhada", "observacao": "Bom perfil"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["status"], "encaminhada")
        self.assertEqual(r.data["certificados"], [])
        self.assertEqual(Encaminhamento.objects.get().gestor, self.gestor)
        r = self.client.post(url, {"status": "analisada"}, format="json")
        self.assertEqual(r.data["status"], "analisada")
        self.assertFalse(Encaminhamento.objects.exists())


# ---------------------------------------------------------------------------
# Painel admin: bordas
# ---------------------------------------------------------------------------


@override_settings(MEDIA_ROOT=_MEDIA)
class PainelAdminBordasTests(MediaTemporaria):
    def setUp(self):
        call_command("criar_grupos", stdout=StringIO())
        u = self.gestor.usuario
        u.is_staff = True
        u.save(update_fields=["is_staff"])
        u.groups.add(Group.objects.get(name="Gestor TEIA"))
        self.client.force_login(u)
        self.vaga = self.nova_vaga()
        self.alta = self.candidatura("alta@aluno.undb.edu.br", "1", "Curso de Python")
        self.baixa = self.candidatura("baixa@aluno.undb.edu.br", "2", None)
        self.triagem = reverse("admin:backend_vaga_triagem", args=[self.vaga.pk])

    def candidatura(self, email, matricula, titulo_cert):
        aluno = self.novo_aluno(email, matricula).aluno
        c = Candidatura.objects.create(aluno=aluno, vaga=self.vaga)
        if titulo_cert:
            CandidaturaCertificado.objects.create(candidatura=c, certificado=self.cert(aluno, titulo_cert))
        analisar(c)
        return c

    def test_triagem_de_vaga_inexistente_da_404(self):
        self.assertEqual(self.client.get(reverse("admin:backend_vaga_triagem", args=[999999])).status_code, 404)

    def test_candidatura_sem_analise_vai_para_o_fim(self):
        sem = Candidatura.objects.create(aluno=self.novo_aluno("sem@aluno.undb.edu.br", "3").aluno, vaga=self.vaga)
        r = self.client.get(self.triagem)
        self.assertEqual([l["c"].pk for l in r.context["linhas"]], [self.alta.pk, self.baixa.pk, sem.pk])
        self.assertContains(r, "sem análise")

    def test_post_sem_permissao_de_alterar_e_proibido(self):
        g = Group.objects.get(name="Gestor TEIA")
        g.permissions.remove(*g.permissions.filter(codename="change_candidatura"))
        r = self.client.post(self.triagem, {"encaminhar": [self.alta.pk]})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Candidatura.objects.get(pk=self.alta.pk).status, "analisada")

    def test_ids_invalidos_no_post_sao_ignorados(self):
        r = self.client.post(self.triagem, {"encaminhar": ["abc", "", "-1", str(self.alta.pk)]})
        self.assertEqual(r.status_code, 302)
        self.assertEqual(Candidatura.objects.get(pk=self.alta.pk).status, "encaminhada")

    def test_observacao_longa_demais_e_recusada(self):
        r = self.client.post(self.triagem, {"encaminhar": [self.alta.pk], "observacao": "x" * 2001}, follow=True)
        self.assertContains(r, "2000")
        self.assertEqual(Candidatura.objects.get(pk=self.alta.pk).status, "analisada")
        self.assertFalse(Encaminhamento.objects.exists())

    def test_observacao_vai_para_o_encaminhamento(self):
        self.client.post(self.triagem, {"encaminhar": [self.alta.pk], "observacao": "  Forte em Python  "})
        self.assertEqual(Encaminhamento.objects.get().observacao, "Forte em Python")

    def test_download_de_certificado_com_vaga_trocada_da_404(self):
        cert = self.alta.certificados_escolhidos.get().certificado
        outra = self.nova_vaga("Outra")
        url = reverse("admin:backend_vaga_triagem_certificado", args=[outra.pk, self.alta.pk, cert.pk])
        self.assertEqual(self.client.get(url).status_code, 404)
        certo = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, cert.pk])
        r = self.client.get(certo)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")

    def test_download_de_arquivo_sumido_da_404(self):
        cert = self.alta.certificados_escolhidos.get().certificado
        cert.arquivo.storage.delete(cert.arquivo.name)
        url = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, cert.pk])
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_staff_sem_grupo_nao_abre_triagem_nem_baixa(self):
        u = Usuario.objects.create_user(email="staff@undb.edu.br", password=SENHA, nome="Staff", perfil="gestor")
        u.is_staff = True
        u.save()
        self.client.force_login(u)
        cert = self.alta.certificados_escolhidos.get().certificado
        self.assertEqual(self.client.get(self.triagem).status_code, 403)
        url = reverse("admin:backend_vaga_triagem_certificado", args=[self.vaga.pk, self.alta.pk, cert.pk])
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_lista_de_candidaturas_ordena_por_compatibilidade(self):
        url = reverse("admin:backend_candidatura_changelist")
        # 4ª coluna = compatibilidade
        asc = self.client.get(url, {"o": "4"}).context["cl"].result_list
        desc = self.client.get(url, {"o": "-4"}).context["cl"].result_list
        self.assertEqual([c.pk for c in asc], [self.baixa.pk, self.alta.pk])
        self.assertEqual([c.pk for c in desc], [self.alta.pk, self.baixa.pk])

    def test_busca_de_candidaturas_por_matricula_e_empresa(self):
        url = reverse("admin:backend_candidatura_changelist")
        r = self.client.get(url, {"q": "2"})
        self.assertIn(self.baixa.pk, [c.pk for c in r.context["cl"].result_list])
        r = self.client.get(url, {"q": "Empresa Estágio Python"})
        self.assertEqual(r.context["cl"].result_count, 2)

    def test_lista_de_vagas_conta_sem_duplicar_ao_buscar_por_curso(self):
        self.vaga.cursos.add(self.curso, self.outro_curso)
        r = self.client.get(reverse("admin:backend_vaga_changelist"), {"q": "Engenharia"})
        vagas = list(r.context["cl"].result_list)
        self.assertEqual([v.pk for v in vagas], [self.vaga.pk])
        self.assertEqual(vagas[0]._n_candidaturas, 2)

    def test_abrir_vagas_em_lote(self):
        self.vaga.status = Vaga.Status.ENCERRADA
        self.vaga.save()
        self.client.post(
            reverse("admin:backend_vaga_changelist"),
            {"action": "abrir", "_selected_action": [self.vaga.pk]},
            follow=True,
        )
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.status, "aberta")

    def test_ativar_empresas_em_lote(self):
        e = Empresa.objects.create(nome="Inativa", ativa=False)
        self.client.post(
            reverse("admin:backend_empresa_changelist"), {"action": "ativar", "_selected_action": [e.pk]}, follow=True
        )
        e.refresh_from_db()
        self.assertTrue(e.ativa)

    def test_reanalisar_em_lote_cria_nova_analise(self):
        antes = self.alta.analises.count()
        self.client.post(
            reverse("admin:backend_candidatura_changelist"),
            {"action": "reanalisar", "_selected_action": [self.alta.pk]},
            follow=True,
        )
        self.assertEqual(self.alta.analises.count(), antes + 1)
