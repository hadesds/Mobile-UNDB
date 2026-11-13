"""Cria (ou sincroniza) os grupos de permissão do painel admin.

    python manage.py criar_grupos

Idempotente: rodar de novo deixa cada grupo exatamente com as permissões abaixo
(o que sobrar é retirado). NÃO mexe em usuários: marcar `is_staff` e colocar cada
pessoa no grupo certo é feito à mão, no próprio admin (Usuários > editar).

- "Gestor TEIA": vagas, empresas, candidaturas e alunos (+ o que essas telas usam).
- "Admin": todas as permissões do sistema.
"""

from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction

GESTOR_TEIA = "Gestor TEIA"
ADMIN = "Admin"

VER = ("view",)
EDITAR = ("view", "add", "change")
TUDO = ("view", "add", "change", "delete")

# modelo (app_label.model_name) -> ações permitidas ao Gestor TEIA
PERMISSOES_GESTOR = {
    # Vagas, com o que a tela da vaga edita junto
    "backend.vaga": EDITAR,
    "backend.requisitocompetencia": TUDO,  # inline: remover um requisito é "delete"
    "backend.requisitoidioma": TUDO,
    "backend.modelocurriculo": EDITAR,
    "backend.campomodelo": TUDO,
    # Empresas
    "backend.empresa": EDITAR,
    # Candidaturas (status muda pela triagem; análise e respostas são registro)
    "backend.candidatura": ("view", "change"),
    "backend.analise": VER,
    "backend.respostacandidatura": VER,
    "backend.encaminhamento": VER,
    "backend.certificado": VER,  # existe a partir da T1 (migração 0005)
    "backend.candidaturacertificado": VER,
    # Alunos e o currículo deles (somente leitura)
    "backend.aluno": VER,
    "backend.perfilcompetencias": VER,
    "backend.formacao": VER,
    "backend.experiencia": VER,
    "backend.competenciadoperfil": VER,
    "backend.idiomaperfil": VER,
    "backend.cursocomplementar": VER,
    # Catálogos que as telas acima consultam (autocomplete de competência, cursos da vaga)
    "backend.competencia": VER,
    "backend.sinonimocompetencia": VER,
    "backend.curso": VER,
}


def permissoes_do_gestor():
    """Devolve (permissões encontradas, códigos que não existem neste banco)."""
    encontradas, faltando = [], []
    for modelo, acoes in PERMISSOES_GESTOR.items():
        app_label, model_name = modelo.split(".")
        for acao in acoes:
            codigo = f"{acao}_{model_name}"
            perm = Permission.objects.filter(
                content_type__app_label=app_label, codename=codigo
            ).first()
            if perm:
                encontradas.append(perm)
            else:
                faltando.append(f"{app_label}.{codigo}")
    return encontradas, faltando


class Command(BaseCommand):
    help = 'Cria/sincroniza os grupos "Gestor TEIA" e "Admin". Não altera usuários.'

    @transaction.atomic
    def handle(self, *args, **options):
        gestor, criado_g = Group.objects.get_or_create(name=GESTOR_TEIA)
        perms, faltando = permissoes_do_gestor()
        gestor.permissions.set(perms)

        admin, criado_a = Group.objects.get_or_create(name=ADMIN)
        todas = Permission.objects.all()
        admin.permissions.set(todas)

        def estado(criado):
            return "criado" if criado else "atualizado"

        self.stdout.write(
            self.style.SUCCESS(f'Grupo "{GESTOR_TEIA}" {estado(criado_g)}: {len(perms)} permissões.')
        )
        self.stdout.write(
            self.style.SUCCESS(f'Grupo "{ADMIN}" {estado(criado_a)}: {todas.count()} permissões (todas).')
        )
        if faltando:
            # Ex.: rodando antes da migração dos certificados. Rode de novo depois do migrate.
            self.stdout.write(
                self.style.WARNING("Permissões ainda inexistentes (ignoradas): " + ", ".join(faltando))
            )
        self.stdout.write(
            "Usuários não foram alterados. Para dar acesso: no admin, marque "
            '"is_staff" e coloque a pessoa no grupo.'
        )
