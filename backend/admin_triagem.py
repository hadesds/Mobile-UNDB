"""Tela de triagem do painel admin: candidaturas de uma vaga, da maior para a menor
compatibilidade, com respostas e certificados. O gestor marca quem encaminhar.

Princípios (README): a decisão é sempre humana, ninguém é eliminado pela nota (ela só
ordena; todos aparecem) e, se o aluno revogou o termo LGPD, respostas e certificados
somem da tela. Acesso: ver = permissão `view_candidatura`; decidir = `change_candidatura`
e perfil de gestor (o encaminhamento registra quem decidiu).
"""

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db.models import F, OuterRef, Prefetch, Subquery
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from backend.decisao import ENCAMINHAR, decidir
from backend.importacao_certificados import tipo_pelo_nome
from backend.models import Analise, Candidatura, Vaga

LIMITE_OBSERVACAO = 2000  # igual ao `observacao` de gestor/candidaturas/{id}/decidir/


def faixa_de(score: int | None) -> str:
    if score is None:
        return ""
    return Analise.Faixa(Analise(score=score).faixa).label


def candidaturas_da_vaga(vaga: Vaga):
    """Todas as candidaturas, ordenadas pela última nota (sem análise vai para o fim)."""
    ultima = Analise.objects.filter(candidatura=OuterRef("pk")).order_by("-criada_em")
    return (
        Candidatura.objects.filter(vaga=vaga)
        .select_related("aluno__usuario", "aluno__curso", "encaminhamento")
        .prefetch_related(
            Prefetch("analises", queryset=Analise.objects.order_by("-criada_em")),
            "respostas",
            "certificados_escolhidos__certificado",
        )
        .annotate(_score=Subquery(ultima.values("score")[:1]))
        .order_by(F("_score").desc(nulls_last=True), "criada_em")
    )


def _linha(c: Candidatura) -> dict:
    analise = c.analises.all()[0] if c.analises.all() else None
    consentiu = c.aluno.consentimento_vigente
    itens = (list(analise.requisitos_atendidos) + list(analise.requisitos_faltantes)) if analise else []
    return {
        "c": c,
        "analise": analise,
        "faixa": faixa_de(analise.score if analise else None),
        "itens": itens,
        "consentiu": consentiu,
        # LGPD: sem termo vigente o TEIA não vê respostas nem certificados.
        "respostas": list(c.respostas.all()) if consentiu else None,
        "certificados": [e.certificado for e in c.certificados_escolhidos.all()] if consentiu else None,
        "pode_marcar": c.status not in ENCAMINHAR,
    }


class TriagemAdminMixin:
    """Acrescenta ao VagaAdmin a tela de triagem e o download dos certificados."""

    def get_urls(self):
        extra = [
            path(
                "<int:vaga_id>/triagem/",
                self.admin_site.admin_view(self.triagem_view),
                name="backend_vaga_triagem",
            ),
            path(
                "<int:vaga_id>/triagem/<int:candidatura_id>/certificados/<int:certificado_id>/",
                self.admin_site.admin_view(self.triagem_certificado_view),
                name="backend_vaga_triagem_certificado",
            ),
        ]
        return extra + super().get_urls()

    @staticmethod
    def _pode_ver(user) -> bool:
        return user.has_perm("backend.view_candidatura")

    @staticmethod
    def _gestor_que_decide(user):
        """O gestor que assina a decisão, ou None se esta pessoa só pode olhar."""
        if not user.has_perm("backend.change_candidatura"):
            return None
        return getattr(user, "gestor", None)

    def triagem_link(self, vaga):
        if not vaga or not vaga.pk:
            return "Salve a vaga para abrir a triagem."
        return format_html('<a href="{}">Abrir triagem</a>', reverse("admin:backend_vaga_triagem", args=[vaga.pk]))

    triagem_link.short_description = "triagem"

    def triagem_view(self, request, vaga_id):
        if not self._pode_ver(request.user):
            raise PermissionDenied
        vaga = get_object_or_404(Vaga.objects.select_related("empresa"), pk=vaga_id)
        gestor = self._gestor_que_decide(request.user)

        if request.method == "POST":
            if gestor is None:
                raise PermissionDenied
            ids = [int(i) for i in request.POST.getlist("encaminhar") if i.isdigit()]
            observacao = request.POST.get("observacao", "").strip() or None
            if observacao and len(observacao) > LIMITE_OBSERVACAO:
                # Mesmo limite da API (DecisaoSerializer); o maxlength do HTML não basta.
                messages.error(
                    request, f"A observação passa de {LIMITE_OBSERVACAO} caracteres. Nada foi alterado."
                )
                return redirect("admin:backend_vaga_triagem", vaga.pk)
            n = 0
            for c in Candidatura.objects.filter(vaga=vaga, pk__in=ids).exclude(status__in=ENCAMINHAR):
                decidir(c, Candidatura.Status.ENCAMINHADA, gestor, observacao)
                n += 1
            if n:
                messages.success(request, f"{n} candidatura(s) encaminhada(s) à empresa.")
            else:
                messages.warning(request, "Nenhuma candidatura marcada. Nada foi alterado.")
            return redirect("admin:backend_vaga_triagem", vaga.pk)

        linhas = [_linha(c) for c in candidaturas_da_vaga(vaga)]
        contagem = {s.label: sum(1 for l in linhas if l["c"].status == s.value) for s in Candidatura.Status}
        return render(
            request,
            "admin/backend/vaga/triagem.html",
            {
                **self.admin_site.each_context(request),
                "opts": self.model._meta,
                "title": f"Triagem · {vaga.titulo}",
                "vaga": vaga,
                "linhas": linhas,
                "contagem": contagem,
                "pode_decidir": gestor is not None,
            },
        )

    def triagem_certificado_view(self, request, vaga_id, candidatura_id, certificado_id):
        """Só certificados que o aluno apresentou NESTA candidatura, e só com o termo vigente."""
        if not self._pode_ver(request.user):
            raise PermissionDenied
        c = get_object_or_404(Candidatura.objects.select_related("aluno"), pk=candidatura_id, vaga_id=vaga_id)
        if not c.aluno.consentimento_vigente:
            raise Http404("O aluno revogou o consentimento.")
        escolhido = (
            c.certificados_escolhidos.filter(certificado_id=certificado_id).select_related("certificado").first()
        )
        if escolhido is None:
            raise Http404("Certificado não apresentado nesta candidatura.")
        cert = escolhido.certificado
        try:
            conteudo = cert.arquivo.open("rb")
        except (FileNotFoundError, ValueError):
            raise Http404("O arquivo não está mais disponível.")
        return FileResponse(
            conteudo,
            filename=cert.nome_original or "certificado",
            content_type=tipo_pelo_nome(cert.arquivo.name),
        )
