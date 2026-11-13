from io import StringIO

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse

from backend.models import Usuario

from .test_api import SENHA, BaseAPITest


def criar_grupos():
    saida = StringIO()
    call_command("criar_grupos", stdout=saida)
    return saida.getvalue()


class CriarGruposTests(BaseAPITest):
    def test_cria_os_dois_grupos_e_e_idempotente(self):
        criar_grupos()
        primeira = {g.name: set(g.permissions.values_list("codename", flat=True)) for g in Group.objects.all()}
        saida = criar_grupos()
        segunda = {g.name: set(g.permissions.values_list("codename", flat=True)) for g in Group.objects.all()}
        self.assertEqual(set(primeira), {"Gestor TEIA", "Admin"})
        self.assertEqual(primeira, segunda)
        self.assertIn("atualizado", saida)

    def test_permissao_extra_dada_a_mao_e_retirada_ao_sincronizar(self):
        criar_grupos()
        gestor = Group.objects.get(name="Gestor TEIA")
        from django.contrib.auth.models import Permission

        gestor.permissions.add(Permission.objects.get(codename="delete_usuario"))
        criar_grupos()
        self.assertFalse(gestor.permissions.filter(codename="delete_usuario").exists())

    def test_gestor_teia_tem_o_combinado(self):
        criar_grupos()
        cods = set(Group.objects.get(name="Gestor TEIA").permissions.values_list("codename", flat=True))
        for c in ["view_vaga", "change_vaga", "view_empresa", "view_candidatura",
                  "change_candidatura", "view_aluno"]:
            self.assertIn(c, cods)
        for c in ["view_usuario", "delete_vaga", "delete_candidatura", "change_aluno", "change_competencia"]:
            self.assertNotIn(c, cods)

    def test_nao_mexe_em_usuarios(self):
        u = Usuario.objects.create_user(email="x@undb.edu.br", password=SENHA, nome="X", perfil="gestor")
        criar_grupos()
        u.refresh_from_db()
        self.assertFalse(u.is_staff)
        self.assertFalse(u.groups.exists())
        self.assertFalse(self.gestor.usuario.groups.exists())


class AcessoPorGrupoNoAdminTests(BaseAPITest):
    def setUp(self):
        criar_grupos()

    def pessoa(self, grupo, email):
        u = Usuario.objects.create_user(email=email, password=SENHA, nome=email, perfil="gestor", is_staff=True)
        u.groups.add(Group.objects.get(name=grupo))
        self.client.force_login(u)
        return u

    def abre(self, nome):
        return self.client.get(reverse(f"admin:{nome}")).status_code

    def test_gestor_teia_ve_vagas_empresas_candidaturas_e_alunos(self):
        self.pessoa("Gestor TEIA", "g@undb.edu.br")
        for nome in ["backend_vaga_changelist", "backend_empresa_changelist",
                     "backend_candidatura_changelist", "backend_aluno_changelist", "backend_vaga_add"]:
            with self.subTest(nome):
                self.assertEqual(self.abre(nome), 200)
        for nome in ["backend_usuario_changelist", "auth_group_changelist",
                     "backend_faculdade_changelist", "backend_aluno_add"]:
            with self.subTest(nome):
                self.assertEqual(self.abre(nome), 403)

    def test_admin_ve_tudo(self):
        self.pessoa("Admin", "a@undb.edu.br")
        for nome in ["backend_usuario_changelist", "auth_group_changelist", "backend_faculdade_changelist",
                     "backend_vaga_changelist", "backend_aluno_add"]:
            with self.subTest(nome):
                self.assertEqual(self.abre(nome), 200)
