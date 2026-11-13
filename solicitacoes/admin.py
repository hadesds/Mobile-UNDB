from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from unfold.admin import ModelAdmin, TabularInline

from .forms import SolicitacaoForm, CompetenciaForm
from .models import LinkEmpresa, SolicitacaoVaga, CompetenciaSolicitada, IdiomaSolicitado, PerguntaSolicitada
from .services import gestor_autorizado, publicar


class GestorAdminMixin:
    def has_module_permission(self, request):
        return gestor_autorizado(request.user)

    def has_view_permission(self, request, obj=None):
        return gestor_autorizado(request.user)

    def has_add_permission(self, request):
        return gestor_autorizado(request.user)

    def has_change_permission(self, request, obj=None):
        return gestor_autorizado(request.user)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LinkEmpresa)
class LinkEmpresaAdmin(GestorAdminMixin, ModelAdmin):
    """Somente consulta: links são gerados e revogados pelo app (o token aparece uma única vez)."""

    list_display = ["empresa", "token_prefixo", "criado_por", "expira_em", "revogado", "criado_em"]
    list_filter = ["revogado"]
    fields = readonly_fields = ["empresa", "token_prefixo", "criado_por", "expira_em", "revogado",
                                "revogado_em", "revogado_por", "criado_em"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


def editavel(obj):
    return not obj or obj.status == SolicitacaoVaga.Status.PENDENTE


class RequisitoInlineMixin:
    def has_add_permission(self, request, obj=None):
        return editavel(obj) and gestor_autorizado(request.user)

    def has_change_permission(self, request, obj=None):
        return self.has_add_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self.has_add_permission(request, obj)

    def has_view_permission(self, request, obj=None):
        return gestor_autorizado(request.user)


class CompetenciaInline(RequisitoInlineMixin, TabularInline):
    model = CompetenciaSolicitada
    form = CompetenciaForm
    extra = 1


class IdiomaInline(RequisitoInlineMixin, TabularInline):
    model = IdiomaSolicitado
    extra = 1


class PerguntaInline(RequisitoInlineMixin, TabularInline):
    model = PerguntaSolicitada
    extra = 1
    max_num = 10


@admin.register(SolicitacaoVaga)
class SolicitacaoVagaAdmin(GestorAdminMixin, ModelAdmin):
    form = SolicitacaoForm
    list_display = ["titulo", "link", "status", "criada_em", "revisado_por"]
    list_filter = ["status"]
    inlines = [CompetenciaInline, IdiomaInline, PerguntaInline]
    readonly_fields = ["link", "status", "vaga", "revisado_por", "criada_em", "publicada_em", "confirmar_publicacao"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return editavel(obj) and super().has_change_permission(request, obj)

    def get_object(self, request, object_id, from_field=None):
        if request.method == "POST":
            # O changeform do Admin já envolve o POST em transaction.atomic.
            return self.get_queryset(request).select_for_update().filter(pk=object_id).first()
        return super().get_object(request, object_id, from_field)

    @admin.display(description="Publicação")
    def confirmar_publicacao(self, obj):
        if obj.vaga_id:
            return "Já publicada."
        if obj.status == SolicitacaoVaga.Status.RECUSADA:
            return "Recusada."
        return format_html('<a href="{}">Revisar confirmação de publicação</a>',
                           reverse("admin:solicitacoes_publicar", args=[obj.pk]))

    def get_urls(self):
        return [path("<int:pk>/publicar/", self.admin_site.admin_view(self.confirmar),
                     name="solicitacoes_publicar"), *super().get_urls()]

    @method_decorator(require_http_methods(["GET", "POST"]))
    def confirmar(self, request, pk):
        if not gestor_autorizado(request.user):
            raise PermissionDenied
        obj = get_object_or_404(SolicitacaoVaga, pk=pk)
        if request.method == "POST":
            try:
                publicar(pk, request.user)
            except ValidationError as exc:
                self.message_user(request, " ".join(exc.messages), messages.ERROR)
            else:
                self.message_user(request, "Vaga publicada.", messages.SUCCESS)
            return redirect("admin:solicitacoes_solicitacaovaga_change", pk)
        return render(request, "admin/solicitacoes/confirmar.html", {
            **self.admin_site.each_context(request), "solicitacao": obj,
            "opts": self.model._meta, "title": "Confirmar publicação"})
