from django import forms
from django.forms import inlineformset_factory
from backend.models import Curso, Competencia
from .models import (CAMPOS_VAGA, SolicitacaoVaga, CompetenciaSolicitada, IdiomaSolicitado,
                     PerguntaSolicitada)


class SolicitacaoForm(forms.ModelForm):
    class Meta:
        model = SolicitacaoVaga
        fields = [*CAMPOS_VAGA, "cursos"]
        widgets = {"prazo": forms.DateInput(format="%Y-%m-%d", attrs={"type": "date"})}

    ROTULOS = {"titulo": "Título da vaga", "descricao": "Descrição", "prazo": "Prazo para candidaturas",
               "periodo_minimo": "Semestre mínimo", "disponibilidade_horario": "Disponibilidade de horário",
               "cursos": "Cursos"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for nome, rotulo in self.ROTULOS.items():
            if nome in self.fields:
                self.fields[nome].label = rotulo
        if "cursos" not in self.fields:
            return
        self.fields["cursos"].queryset = Curso.objects.filter(ativo=True)
        self.fields["cursos"].help_text = "Selecione os cursos; vazio permite qualquer curso."


class CompetenciaForm(forms.ModelForm):
    class Meta:
        model = CompetenciaSolicitada
        fields = ["competencia", "obrigatorio"]
        labels = {"competencia": "Competência", "obrigatorio": "Obrigatória"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "competencia" not in self.fields:
            return
        self.fields["competencia"].queryset = Competencia.objects.filter(ativa=True)


CompetenciasFormSet = inlineformset_factory(
    SolicitacaoVaga, CompetenciaSolicitada, form=CompetenciaForm,
    extra=5, max_num=20, validate_max=True, absolute_max=40, can_delete=True)
IdiomasFormSet = inlineformset_factory(
    SolicitacaoVaga, IdiomaSolicitado, fields=["idioma", "nivel_minimo", "obrigatorio"],
    labels={"nivel_minimo": "Nível mínimo", "obrigatorio": "Obrigatório"},
    extra=3, max_num=10, validate_max=True, absolute_max=20, can_delete=True)


class PerguntaForm(forms.ModelForm):
    class Meta:
        model = PerguntaSolicitada
        fields = ["rotulo", "ajuda", "formato", "obrigatorio"]
        widgets = {
            "rotulo": forms.TextInput(attrs={"placeholder": "Ex.: Por que você quer fazer parte do nosso time?"}),
            "ajuda": forms.TextInput(attrs={"placeholder": "Dica opcional para quem vai responder"}),
        }


PerguntasFormSet = inlineformset_factory(
    SolicitacaoVaga, PerguntaSolicitada, form=PerguntaForm,
    extra=5, max_num=10, validate_max=True, absolute_max=20, can_delete=False)
