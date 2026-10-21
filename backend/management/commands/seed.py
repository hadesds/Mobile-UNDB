"""Popula o banco com dados fictícios de demonstração.

    python manage.py seed               # cria/atualiza tudo
    python manage.py seed --sem-usuarios

Idempotente: pode rodar várias vezes. Registros são encontrados pelo nome ou
e-mail e atualizados; senhas de usuários que já existem não são alteradas.
"""

import os
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from backend.management import seed_dados as D
from backend.models import (
    Aluno,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Experiencia,
    Faculdade,
    Formacao,
    Gestor,
    IdiomaPerfil,
    NucleoCarreiras,
    PerfilCompetencias,
    RequisitoCompetencia,
    RequisitoIdioma,
    SinonimoCompetencia,
    Usuario,
    Vaga,
    normalizar_termo,
)


class Command(BaseCommand):
    help = "Popula o banco com dados fictícios de demonstração (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--sem-usuarios",
            action="store_true",
            help="Não cria admin, gestor nem alunos de demonstração.",
        )

    @transaction.atomic
    def handle(self, *args, sem_usuarios=False, **opts):
        self.senha = os.getenv("SEED_SENHA", "Teia@Demo2026")

        faculdade = self._faculdade()
        cursos = self._cursos(faculdade)
        nucleo = self._nucleo(faculdade)
        competencias = self._competencias()
        empresas = self._empresas()

        if sem_usuarios:
            self.stdout.write(self.style.SUCCESS("Seed concluído (sem usuários e sem vagas)."))
            return

        self._admin()
        gestor = self._gestor(nucleo)
        self._vagas(gestor, empresas, cursos, competencias)
        self._alunos(cursos, competencias)

        self.stdout.write(self.style.SUCCESS("Seed concluído."))
        self.stdout.write(
            f"  Logins (senha: {self.senha}): {D.ADMIN['email']} (admin), "
            f"{D.GESTOR['email']} (gestor), {D.ALUNOS[0]['email']} (aluno)"
        )

    # --- Estrutura -----------------------------------------------------------

    def _faculdade(self):
        fac, _ = Faculdade.objects.update_or_create(sigla=D.FACULDADE["sigla"], defaults=D.FACULDADE)
        return fac

    def _cursos(self, faculdade):
        cursos = {}
        for nome, periodos in D.CURSOS:
            cursos[nome], _ = Curso.objects.update_or_create(
                faculdade=faculdade, nome=nome, defaults={"total_periodos": periodos, "ativo": True}
            )
        self._log("cursos", len(cursos))
        return cursos

    def _nucleo(self, faculdade):
        nucleo, _ = NucleoCarreiras.objects.update_or_create(
            faculdade=faculdade,
            nome=D.NUCLEO["nome"],
            defaults={"email_contato": D.NUCLEO["email_contato"]},
        )
        return nucleo

    def _competencias(self):
        resultado = {}
        for nome, categoria, sinonimos in D.COMPETENCIAS:
            comp = Competencia.objects.filter(nome_normalizado=normalizar_termo(nome)).first()
            if comp is None:
                comp = Competencia(nome=nome)
            comp.categoria = categoria
            comp.ativa = True
            comp.save()
            for termo in sinonimos:
                SinonimoCompetencia.objects.get_or_create(
                    termo_normalizado=normalizar_termo(termo),
                    defaults={"competencia": comp, "termo": termo},
                )
            resultado[nome] = comp
        self._log("competências", len(resultado))
        return resultado

    def _empresas(self):
        empresas = {}
        for nome, fantasia, contato, email, convenio in D.EMPRESAS:
            empresas[nome], _ = Empresa.objects.update_or_create(
                nome=nome,
                defaults={
                    "nome_fantasia": fantasia,
                    "contato_nome": contato,
                    "contato_email": email,
                    "convenio_status": convenio,
                    "ativa": True,
                },
            )
        self._log("empresas", len(empresas))
        return empresas

    # --- Usuários ------------------------------------------------------------

    def _usuario(self, email, nome, perfil, **extra):
        """Cria o usuário com a senha do seed; se já existe, só atualiza o nome."""
        usuario = Usuario.objects.filter(email__iexact=email).first()
        if usuario is None:
            criar = (
                Usuario.objects.create_superuser
                if perfil == Usuario.Perfil.ADMIN
                else Usuario.objects.create_user
            )
            return criar(email=email, password=self.senha, nome=nome, perfil=perfil, **extra)
        if usuario.nome != nome:
            usuario.nome = nome
            usuario.save(update_fields=["nome"])
        return usuario

    def _admin(self):
        self._usuario(D.ADMIN["email"], D.ADMIN["nome"], Usuario.Perfil.ADMIN)

    def _gestor(self, nucleo):
        usuario = self._usuario(D.GESTOR["email"], D.GESTOR["nome"], Usuario.Perfil.GESTOR)
        gestor, _ = Gestor.objects.update_or_create(
            usuario=usuario, defaults={"nucleo": nucleo, "cargo": D.GESTOR["cargo"]}
        )
        return gestor

    def _alunos(self, cursos, competencias):
        for dados in D.ALUNOS:
            usuario = self._usuario(dados["email"], dados["nome"], Usuario.Perfil.ALUNO)
            aluno, _ = Aluno.objects.update_or_create(
                usuario=usuario,
                defaults={
                    "matricula": dados["matricula"],
                    "curso": cursos[dados["curso"]],
                    "periodo": dados["periodo"],
                },
            )
            if not aluno.consentimento_vigente:
                aluno.registrar_consentimento(True)

            perfil, _ = PerfilCompetencias.objects.get_or_create(aluno=aluno)
            # Só preenche o currículo se ainda estiver vazio: não sobrescreve edições feitas no app.
            if any(perfil.secoes_preenchidas().values()):
                continue
            for f in dados.get("formacoes", []):
                Formacao.objects.create(perfil=perfil, **f)
            for e in dados.get("experiencias", []):
                Experiencia.objects.create(perfil=perfil, **e)
            for nome, nivel in dados.get("competencias", []):
                CompetenciaDoPerfil.objects.create(perfil=perfil, competencia=competencias[nome], nivel=nivel)
            for idioma, nivel in dados.get("idiomas", []):
                IdiomaPerfil.objects.create(perfil=perfil, idioma=idioma, nivel=nivel)
            for c in dados.get("cursos", []):
                CursoComplementar.objects.create(perfil=perfil, **c)
        self._log("alunos", len(D.ALUNOS))

    # --- Vagas ---------------------------------------------------------------

    def _vagas(self, gestor, empresas, cursos, competencias):
        hoje = date.today()
        for v in D.VAGAS:
            prazo = hoje + timedelta(days=v["prazo_dias"]) if v["prazo_dias"] is not None else None
            vaga, _ = Vaga.objects.update_or_create(
                empresa=empresas[v["empresa"]],
                titulo=v["titulo"],
                defaults={
                    "gestor": gestor,
                    "tipo": v["tipo"],
                    "modalidade": v["modalidade"],
                    "descricao": v["descricao"],
                    "prazo": prazo,  # renovado a cada seed, para as vagas continuarem abertas
                    "status": Vaga.Status.ABERTA,
                    "periodo_minimo": v["periodo_minimo"],
                    "disponibilidade_horario": v["disponibilidade_horario"],
                },
            )
            vaga.cursos.set([cursos[n] for n in v["cursos"]])
            # Requisitos são substituídos para refletir exatamente o arquivo de dados.
            vaga.requisitos_competencia.all().delete()
            RequisitoCompetencia.objects.bulk_create(
                [
                    RequisitoCompetencia(vaga=vaga, competencia=competencias[n], obrigatorio=o)
                    for n, o in v["competencias"]
                ]
            )
            vaga.requisitos_idioma.all().delete()
            RequisitoIdioma.objects.bulk_create(
                [
                    RequisitoIdioma(vaga=vaga, idioma=i, nivel_minimo=n, obrigatorio=o)
                    for i, n, o in v["idiomas"]
                ]
            )
        self._log("vagas", len(D.VAGAS))

    def _log(self, nome, qtd):
        self.stdout.write(f"  {nome}: {qtd}")