"""Decisão humana do gestor sobre uma candidatura.

Um lugar só para a regra, usado pela API (`gestor/candidaturas/{id}/decidir/`) e pelo
painel admin (ações em lote e tela de triagem). O sistema nunca chama isto sozinho:
toda mudança de status parte de um gestor.
"""

from django.db import transaction

from backend.models import Candidatura, Encaminhamento, Gestor

ENCAMINHAR = (Candidatura.Status.ENCAMINHADA, Candidatura.Status.EM_PROCESSO)


@transaction.atomic
def decidir(candidatura: Candidatura, novo: str, gestor: Gestor, observacao: str | None = None) -> Candidatura:
    """Muda o status e mantém o Encaminhamento coerente com ele.

    - encaminhada / em_processo: cria o encaminhamento (feito por `gestor`).
    - analisada: desfaz, volta para a fila sem encaminhamento.
    - nao_selecionada: só muda o status (e a observação, se houver encaminhamento).
    """
    if novo in ENCAMINHAR:
        enc, criado = Encaminhamento.objects.get_or_create(
            candidatura=candidatura,
            defaults={"gestor": gestor, "observacao": observacao or ""},
        )
        if not criado and observacao is not None:
            enc.observacao = observacao
            enc.save(update_fields=["observacao"])
    elif novo == Candidatura.Status.ANALISADA:
        Encaminhamento.objects.filter(candidatura=candidatura).delete()
    elif observacao is not None and hasattr(candidatura, "encaminhamento"):
        candidatura.encaminhamento.observacao = observacao
        candidatura.encaminhamento.save(update_fields=["observacao"])
    candidatura.status = novo
    candidatura.save(update_fields=["status", "atualizada_em"])
    return candidatura
