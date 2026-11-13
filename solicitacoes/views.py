from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import render, redirect
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods
from .forms import SolicitacaoForm, CompetenciasFormSet, IdiomasFormSet, PerguntasFormSet
from .models import LinkEmpresa, SolicitacaoVaga
from .services import links_disponiveis, validar, validar_perguntas


@never_cache
@require_http_methods(["GET", "POST"])
def enviar(request, token):
    with transaction.atomic():
        links = links_disponiveis()
        if request.method == "POST":
            links = links.select_for_update(of=("self",))
        link = LinkEmpresa.com_token(token, links.select_related("empresa")).first()
        if not link:
            response = render(request, "solicitacoes/indisponivel.html", status=404)
        else:
            solicitacao = SolicitacaoVaga(link=link)
            data = request.POST if request.method == "POST" else None
            form = SolicitacaoForm(data, instance=solicitacao)
            comps = CompetenciasFormSet(data, instance=solicitacao, prefix="competencias")
            idiomas = IdiomasFormSet(data, instance=solicitacao, prefix="idiomas")
            perguntas = PerguntasFormSet(data, instance=solicitacao, prefix="perguntas")
            if request.method == "POST" and all(
                    [form.is_valid(), comps.is_valid(), idiomas.is_valid(), perguntas.is_valid()]):
                def itens(formset, campos):
                    return [{k: getattr(f.cleaned_data[k], "pk", f.cleaned_data[k]) for k in campos}
                            for f in formset if f.cleaned_data and not f.cleaned_data.get("DELETE")]
                try:
                    validar_perguntas([f.cleaned_data for f in perguntas if f.cleaned_data])
                    validar(solicitacao, itens(comps, ["competencia", "obrigatorio"]),
                            itens(idiomas, ["idioma", "nivel_minimo", "obrigatorio"]),
                            form.cleaned_data["cursos"].values_list("pk", flat=True))
                except ValidationError as exc:
                    form.add_error(None, exc.messages)
                else:
                    form.save()
                    comps.save()
                    idiomas.save()
                    for ordem, pergunta in enumerate(perguntas.save(commit=False)):
                        pergunta.ordem = ordem
                        pergunta.save()
                    return redirect("solicitacoes:sucesso")
            response = render(request, "solicitacoes/formulario.html", {
                "empresa": link.empresa, "form": form, "competencias": comps, "idiomas": idiomas,
                "perguntas": perguntas})
    response["Referrer-Policy"] = "no-referrer"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


@never_cache
@require_http_methods(["GET"])
def sucesso(request):
    return render(request, "solicitacoes/sucesso.html")
