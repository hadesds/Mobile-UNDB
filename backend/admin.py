from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import (
    Aluno,
    Analise,
    CampoModelo,
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
    ModeloCurriculo,
    NucleoCarreiras,
    PerfilCompetencias,
    RequisitoCompetencia,
    RequisitoIdioma,
    RespostaCandidatura,
    SinonimoCompetencia,
    Usuario,
    Vaga,
)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
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
class AlunoAdmin(ModelAdmin):
    list_display = ["usuario", "matricula", "curso", "periodo", "consentimento_lgpd"]
    list_filter = ["curso", "consentimento_lgpd"]
    search_fields = ["usuario__nome", "usuario__email", "matricula"]


@admin.register(Gestor)
class GestorAdmin(ModelAdmin):
    list_display = ["usuario", "nucleo", "cargo"]


# --- Currículo -------------------------------------------------------------


class SinonimoInline(TabularInline):
    model = SinonimoCompetencia
    extra = 1


@admin.register(Competencia)
class CompetenciaAdmin(ModelAdmin):
    list_display = ["nome", "categoria", "ativa"]
    list_filter = ["categoria", "ativa"]
    search_fields = ["nome", "sinonimos__termo"]
    inlines = [SinonimoInline]


class FormacaoInline(TabularInline):
    model = Formacao
    extra = 0


class ExperienciaInline(StackedInline):
    model = Experiencia
    extra = 0


class CompetenciaDoPerfilInline(TabularInline):
    model = CompetenciaDoPerfil
    extra = 0


class IdiomaPerfilInline(TabularInline):
    model = IdiomaPerfil
    extra = 0


class CursoComplementarInline(TabularInline):
    model = CursoComplementar
    extra = 0


@admin.register(PerfilCompetencias)
class PerfilCompetenciasAdmin(ModelAdmin):
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


class RequisitoCompetenciaInline(TabularInline):
    model = RequisitoCompetencia
    extra = 1


class RequisitoIdiomaInline(TabularInline):
    model = RequisitoIdioma
    extra = 0


@admin.register(Empresa)
class EmpresaAdmin(ModelAdmin):
    list_display = ["__str__", "contato_nome", "convenio_status", "ativa"]
    list_filter = ["convenio_status", "ativa"]
    search_fields = ["nome", "nome_fantasia", "contato_nome"]


@admin.register(Vaga)
class VagaAdmin(ModelAdmin):
    list_display = ["titulo", "empresa", "tipo", "modalidade", "status", "prazo"]
    list_filter = ["status", "tipo", "modalidade", "cursos"]
    search_fields = ["titulo", "empresa__nome", "empresa__nome_fantasia"]
    filter_horizontal = ["cursos"]
    inlines = [RequisitoCompetenciaInline, RequisitoIdiomaInline]
    readonly_fields = ["modelo_de_curriculo"]

    @admin.display(description="modelo de currículo")
    def modelo_de_curriculo(self, vaga):
        """Atalho para o formulário de candidatura desta vaga (perguntas ao aluno)."""
        if not vaga or not vaga.pk:
            return "Salve a vaga para criar o modelo de currículo."
        modelo = getattr(vaga, "modelo_curriculo", None)
        if modelo is None:
            url = reverse("admin:backend_modelocurriculo_add") + f"?vaga={vaga.pk}"
            return format_html('<a href="{}">Criar modelo de currículo</a>', url)
        url = reverse("admin:backend_modelocurriculo_change", args=[modelo.pk])
        return format_html('<a href="{}">Editar modelo de currículo ({} campos)</a>', url, modelo.campos.count())


class AnaliseInline(TabularInline):
    model = Analise
    extra = 0
    fields = ["score", "versao_motor", "criada_em"]
    readonly_fields = ["criada_em"]


class RespostaCandidaturaInline(TabularInline):
    """O que o aluno enviou. Somente leitura: é o registro da candidatura."""

    model = RespostaCandidatura
    extra = 0
    can_delete = False
    fields = ["rotulo", "origem", "valor", "editado"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Candidatura)
class CandidaturaAdmin(ModelAdmin):
    list_display = ["aluno", "vaga", "status", "criada_em"]
    list_filter = ["status"]
    search_fields = ["aluno__usuario__nome", "vaga__titulo"]
    inlines = [AnaliseInline, RespostaCandidaturaInline]


@admin.register(Analise)
class AnaliseAdmin(ModelAdmin):
    list_display = ["candidatura", "score", "versao_motor", "criada_em"]
    readonly_fields = ["criada_em"]


@admin.register(Encaminhamento)
class EncaminhamentoAdmin(ModelAdmin):
    list_display = ["candidatura", "gestor", "criado_em"]
    

for _modelo in (Faculdade, Curso, NucleoCarreiras):
    admin.site.register(_modelo, ModelAdmin)

# Grupos com o visual do unfold (o cadastro padrão do Django usa o admin antigo).
admin.site.unregister(Group)


@admin.register(Group)
class GrupoAdmin(BaseGroupAdmin, ModelAdmin):
    pass


# ---------------------------------------------------------------------------
# Modelo de currículo por vaga (T2)
# Na tela da vaga, o campo "modelo de currículo" leva direto para cá.
# ---------------------------------------------------------------------------


class CampoModeloInline(TabularInline):
    model = CampoModelo
    extra = 1
    fields = ["ordem", "chave", "rotulo", "origem", "fonte_perfil", "formato", "obrigatorio", "ajuda"]
    prepopulated_fields = {"chave": ["rotulo"]}


@admin.register(ModeloCurriculo)
class ModeloCurriculoAdmin(ModelAdmin):
    list_display = ["vaga", "n_campos", "atualizado_em"]
    search_fields = ["vaga__titulo", "vaga__empresa__nome"]
    autocomplete_fields = ["vaga"]
    inlines = [CampoModeloInline]

    @admin.display(description="campos")
    def n_campos(self, obj):
        return obj.campos.count()

