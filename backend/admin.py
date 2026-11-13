from django.contrib import admin, messages
from django.db.models import Count, OuterRef, Subquery
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from backend.compatibilidade import analisar
from backend.admin_triagem import TriagemAdminMixin, faixa_de
from backend.decisao import decidir
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
    list_filter = ["curso", "periodo", "consentimento_lgpd"]
    search_fields = ["usuario__nome", "usuario__email", "matricula", "curso__nome"]
    list_select_related = ["usuario", "curso"]


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
    actions = ["ativar", "desativar"]

    @admin.action(description="Ativar empresas selecionadas", permissions=["change"])
    def ativar(self, request, queryset):
        n = queryset.update(ativa=True)
        self.message_user(request, f"{n} empresa(s) ativada(s).", messages.SUCCESS)

    @admin.action(description="Desativar empresas selecionadas", permissions=["change"])
    def desativar(self, request, queryset):
        n = queryset.update(ativa=False)
        self.message_user(request, f"{n} empresa(s) desativada(s).", messages.SUCCESS)


@admin.register(Vaga)
class VagaAdmin(TriagemAdminMixin, ModelAdmin):
    list_display = ["titulo", "empresa", "tipo", "modalidade", "status", "prazo", "n_candidaturas", "triagem_link"]
    list_filter = ["status", "tipo", "modalidade", "cursos", "empresa"]
    search_fields = ["titulo", "empresa__nome", "empresa__nome_fantasia", "cursos__nome"]
    list_select_related = ["empresa"]
    actions = ["abrir", "encerrar"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_n_candidaturas=Count("candidaturas", distinct=True))

    @admin.display(description="candidaturas", ordering="_n_candidaturas")
    def n_candidaturas(self, vaga):
        return vaga._n_candidaturas

    @admin.action(description="Abrir vagas selecionadas", permissions=["change"])
    def abrir(self, request, queryset):
        n = queryset.update(status=Vaga.Status.ABERTA)
        self.message_user(request, f"{n} vaga(s) aberta(s).", messages.SUCCESS)

    @admin.action(description="Encerrar vagas selecionadas", permissions=["change"])
    def encerrar(self, request, queryset):
        n = queryset.update(status=Vaga.Status.ENCERRADA)
        self.message_user(request, f"{n} vaga(s) encerrada(s).", messages.SUCCESS)
    filter_horizontal = ["cursos"]
    inlines = [RequisitoCompetenciaInline, RequisitoIdiomaInline]
    readonly_fields = ["modelo_de_curriculo", "triagem_link"]

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
    """Status muda só por decisão humana: as ações abaixo são o gestor decidindo em lote."""

    list_display = ["aluno", "curso", "vaga", "compatibilidade", "status", "criada_em"]
    list_filter = ["status", "vaga", "aluno__curso", "vaga__empresa"]
    search_fields = [
        "aluno__usuario__nome", "aluno__usuario__email", "aluno__matricula",
        "vaga__titulo", "vaga__empresa__nome", "aluno__curso__nome",
    ]
    list_select_related = ["aluno__usuario", "aluno__curso", "vaga__empresa"]
    inlines = [AnaliseInline, RespostaCandidaturaInline]
    actions = ["encaminhar", "nao_selecionar", "voltar_para_fila", "reanalisar"]

    def get_queryset(self, request):
        ultima = Analise.objects.filter(candidatura=OuterRef("pk")).order_by("-criada_em")
        return super().get_queryset(request).annotate(_score=Subquery(ultima.values("score")[:1]))

    @admin.display(description="curso", ordering="aluno__curso__nome")
    def curso(self, c):
        return c.aluno.curso

    @admin.display(description="compatibilidade", ordering="_score")
    def compatibilidade(self, c):
        if c._score is None:
            return "—"
        return f"{c._score}% · {faixa_de(c._score).lower()}"

    def _decidir_em_lote(self, request, queryset, novo, texto):
        gestor = getattr(request.user, "gestor", None)
        if gestor is None:
            self.message_user(
                request, "Só quem tem perfil de gestor do TEIA registra decisões.", messages.ERROR
            )
            return
        n = 0
        for candidatura in queryset:
            decidir(candidatura, novo, gestor)
            n += 1
        self.message_user(request, f"{n} candidatura(s) {texto}.", messages.SUCCESS)

    @admin.action(description="Encaminhar à empresa", permissions=["change"])
    def encaminhar(self, request, queryset):
        self._decidir_em_lote(request, queryset, Candidatura.Status.ENCAMINHADA, "encaminhada(s)")

    @admin.action(description="Marcar como não selecionada", permissions=["change"])
    def nao_selecionar(self, request, queryset):
        self._decidir_em_lote(request, queryset, Candidatura.Status.NAO_SELECIONADA, "marcada(s) como não selecionada(s)")

    @admin.action(description="Voltar para a fila (desfaz a decisão)", permissions=["change"])
    def voltar_para_fila(self, request, queryset):
        self._decidir_em_lote(request, queryset, Candidatura.Status.ANALISADA, "de volta para a fila")

    @admin.action(description="Refazer a análise com o currículo atual", permissions=["change"])
    def reanalisar(self, request, queryset):
        n, puladas = 0, 0
        for candidatura in queryset.select_related("aluno", "vaga"):
            if not candidatura.aluno.consentimento_vigente:
                puladas += 1  # LGPD: sem termo vigente o currículo não é analisado
                continue
            analisar(candidatura)
            n += 1
        self.message_user(request, f"{n} análise(s) refeita(s). As anteriores ficam no histórico.", messages.SUCCESS)
        if puladas:
            self.message_user(request, f"{puladas} ignorada(s): o aluno revogou o termo LGPD.", messages.WARNING)


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

