from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Aluno,
    Analise,
    Candidatura,
    Competencia,
    CompetenciaDoPerfil,
    Curso,
    CursoComplementar,
    Empresa,
    Encaminhamento,
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
)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    ordering = ["nome"]
    list_display = ["nome", "email", "perfil", "is_active"]
    list_filter = ["perfil", "is_active", "is_staff"]
    search_fields = ["nome", "email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dados", {"fields": ("nome", "perfil")}),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "nome", "perfil", "password1", "password2"),
            },
        ),
    )


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ["usuario", "matricula", "curso", "periodo", "consentimento_lgpd"]
    list_filter = ["curso", "consentimento_lgpd"]
    search_fields = ["usuario__nome", "usuario__email", "matricula"]


@admin.register(Gestor)
class GestorAdmin(admin.ModelAdmin):
    list_display = ["usuario", "nucleo", "cargo"]


# --- Currículo -------------------------------------------------------------


class SinonimoInline(admin.TabularInline):
    model = SinonimoCompetencia
    extra = 1


@admin.register(Competencia)
class CompetenciaAdmin(admin.ModelAdmin):
    list_display = ["nome", "categoria", "ativa"]
    list_filter = ["categoria", "ativa"]
    search_fields = ["nome", "sinonimos__termo"]
    inlines = [SinonimoInline]


class FormacaoInline(admin.TabularInline):
    model = Formacao
    extra = 0


class ExperienciaInline(admin.StackedInline):
    model = Experiencia
    extra = 0


class CompetenciaDoPerfilInline(admin.TabularInline):
    model = CompetenciaDoPerfil
    extra = 0


class IdiomaPerfilInline(admin.TabularInline):
    model = IdiomaPerfil
    extra = 0


class CursoComplementarInline(admin.TabularInline):
    model = CursoComplementar
    extra = 0


@admin.register(PerfilCompetencias)
class PerfilCompetenciasAdmin(admin.ModelAdmin):
    list_display = ["aluno", "completude", "atualizado_em"]
    search_fields = ["aluno__usuario__nome", "aluno__matricula"]
    inlines = [
        FormacaoInline,
        ExperienciaInline,
        CompetenciaDoPerfilInline,
        IdiomaPerfilInline,
        CursoComplementarInline,
    ]


# --- Vagas -----------------------------------------------------------------


class RequisitoCompetenciaInline(admin.TabularInline):
    model = RequisitoCompetencia
    extra = 1


class RequisitoIdiomaInline(admin.TabularInline):
    model = RequisitoIdioma
    extra = 0


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ["__str__", "contato_nome", "convenio_status", "ativa"]
    list_filter = ["convenio_status", "ativa"]
    search_fields = ["nome", "nome_fantasia", "contato_nome"]


@admin.register(Vaga)
class VagaAdmin(admin.ModelAdmin):
    list_display = ["titulo", "empresa", "tipo", "modalidade", "status", "prazo"]
    list_filter = ["status", "tipo", "modalidade", "cursos"]
    search_fields = ["titulo", "empresa__nome", "empresa__nome_fantasia"]
    filter_horizontal = ["cursos"]
    inlines = [RequisitoCompetenciaInline, RequisitoIdiomaInline]


class AnaliseInline(admin.TabularInline):
    model = Analise
    extra = 0
    fields = ["score", "versao_motor", "criada_em"]
    readonly_fields = ["criada_em"]


@admin.register(Candidatura)
class CandidaturaAdmin(admin.ModelAdmin):
    list_display = ["aluno", "vaga", "status", "criada_em"]
    list_filter = ["status"]
    search_fields = ["aluno__usuario__nome", "vaga__titulo"]
    inlines = [AnaliseInline]


@admin.register(Analise)
class AnaliseAdmin(admin.ModelAdmin):
    list_display = ["candidatura", "score", "versao_motor", "criada_em"]
    readonly_fields = ["criada_em"]


@admin.register(Encaminhamento)
class EncaminhamentoAdmin(admin.ModelAdmin):
    list_display = ["candidatura", "gestor", "criado_em"]
    

admin.site.register([Faculdade, Curso, NucleoCarreiras])