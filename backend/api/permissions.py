from rest_framework.permissions import SAFE_METHODS, BasePermission


def _eh_aluno(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.perfil == user.Perfil.ALUNO
        and hasattr(user, "aluno")
    )


def _eh_gestor(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.perfil == user.Perfil.GESTOR
        and hasattr(user, "gestor")
    )


class IsAluno(BasePermission):
    message = "Acesso restrito a alunos."

    def has_permission(self, request, view):
        return _eh_aluno(request.user)


class IsAlunoComConsentimento(BasePermission):
    """Aluno com termo LGPD vigente aceito (necessário para tratar o currículo)."""

    message = "Acesso restrito a alunos."

    def has_permission(self, request, view):
        if not _eh_aluno(request.user):
            return False
        if not request.user.aluno.consentimento_vigente:
            self.message = (
                "É necessário aceitar o termo LGPD vigente para usar esta função."
            )
            return False
        return True


class IsGestor(BasePermission):
    message = "Acesso restrito a gestores do TEIA."

    def has_permission(self, request, view):
        return _eh_gestor(request.user)


class GestorEscreveAlunoLe(BasePermission):
    """Leitura para aluno ou gestor; escrita somente para gestor."""

    message = "Somente gestores do TEIA podem alterar este recurso."

    def has_permission(self, request, view):
        user = request.user
        if request.method in SAFE_METHODS:
            return _eh_aluno(user) or _eh_gestor(user)
        return _eh_gestor(user)