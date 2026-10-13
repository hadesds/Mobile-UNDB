from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Aluno, Curso, Faculdade, Gestor, NucleoCarreiras, Usuario


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


admin.site.register([Faculdade, Curso, NucleoCarreiras])