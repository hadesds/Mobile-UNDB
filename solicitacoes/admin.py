from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from .forms import SolicitacaoForm, CompetenciaForm
from .models import LinkEmpresa, SolicitacaoVaga, CompetenciaSolicitada, IdiomaSolicitado
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
class LinkEmpresaAdmin(GestorAdminMixin, admin.ModelAdmin):
    list_display = ["empresa", "gestor", "expira_em", "revogado"]
    readonly_fields = ["gestor", "criado_em"]
    fields = ["empresa", "expira_em", "revogado", *readonly_fields]

    def get_readonly_fields(self, request, obj=None):
        @admin.display(description="Link (copie e envie manualmente)")
        def endereco(instance):
            if not instance.pk:
                return "Salve para gerar o link."
            return request.build_absolute_uri(reverse("solicitacoes:enviar", args=[instance.token]))
        if not hasattr(request, "_link_empresa_endereco"):
            request._link_empresa_endereco = endereco
        return ["gestor", "criado_em", request._link_empresa_endereco, *(["empresa"] if obj else [])]

    def get_fields(self, request, obj=None):
        return ["empresa", "expira_em", "revogado", *[f for f in self.get_readonly_fields(request, obj) if f != "empresa"]]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "empresa":
            kwargs["queryset"] = db_field.remote_field.model.objects.filter(ativa=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.gestor = request.user.gestor
        super().save_model(request, obj, form, change)



class RequisitoInlineMixin:
    def has_add_permission(self, request, obj=None):
        return (not obj or not obj.vaga_id) and gestor_autorizado(request.user)

    def has_change_permission(self, request, obj=None):
        return self.has_add_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self.has_add_permission(request, obj)

    def has_view_permission(self, request, obj=None):
        return gestor_autorizado(request.user)


class CompetenciaInline(RequisitoInlineMixin, admin.TabularInline):
    model = CompetenciaSolicitada
    form = CompetenciaForm
    extra = 1


class IdiomaInline(RequisitoInlineMixin, admin.TabularInline):
    model = IdiomaSolicitado
    extra = 1


@admin.register(SolicitacaoVaga)
class SolicitacaoVagaAdmin(GestorAdminMixin, admin.ModelAdmin):
    form = SolicitacaoForm
    list_display = ["titulo", "link", "status", "criada_em", "revisado_por"]
    list_filter = ["status"]
    inlines = [CompetenciaInline, IdiomaInline]
    readonly_fields = ["link", "status", "vaga", "revisado_por", "criada_em", "publicada_em", "confirmar_publicacao"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return (not obj or not obj.vaga_id) and super().has_change_permission(request, obj)

    def get_object(self, request, object_id, from_field=None):
        if request.method == "POST":
            # O changeform do Admin já envolve o POST em transaction.atomic.
            return self.get_queryset(request).select_for_update().filter(pk=object_id).first()
        return super().get_object(request, object_id, from_field)

    @admin.display(description="Publicação")
    def confirmar_publicacao(self, obj):
        if obj.vaga_id:
            return "Já publicada."
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
                self.message_user(request, str(exc), messages.ERROR)
            else:
                self.message_user(request, "Vaga publicada.", messages.SUCCESS)
            return redirect("admin:solicitacoes_solicitacaovaga_change", pk)
        return render(request, "admin/solicitacoes/confirmar.html", {
            **self.admin_site.each_context(request), "solicitacao": obj,
            "opts": self.model._meta, "title": "Confirmar publicação"})
