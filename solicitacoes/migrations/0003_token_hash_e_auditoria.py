"""Token passa a ser guardado só como hash; o link registra quem criou e quem revogou.

Links existentes continuam válidos: o hash é calculado a partir do token salvo.
"""
import hashlib

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def preencher(apps, schema_editor):
    LinkEmpresa = apps.get_model("solicitacoes", "LinkEmpresa")
    for link in LinkEmpresa.objects.select_related("gestor"):
        link.token_hash = hashlib.sha256(link.token.encode()).hexdigest()
        link.token_prefixo = link.token[:6]
        link.criado_por_id = link.gestor.usuario_id
        link.save(update_fields=["token_hash", "token_prefixo", "criado_por"])


class Migration(migrations.Migration):

    dependencies = [
        ("solicitacoes", "0002_status_recusada"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="linkempresa", name="token_hash",
            field=models.CharField(editable=False, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="linkempresa", name="token_prefixo",
            field=models.CharField(default="", editable=False, max_length=8, verbose_name="início do token",
                                   help_text="Só para identificar o link; o token completo não é guardado."),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="linkempresa", name="criado_por",
            field=models.ForeignKey(editable=False, null=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="links_empresa_criados", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(preencher, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="linkempresa", name="token_hash",
            field=models.CharField(editable=False, max_length=64, unique=True),
        ),
        migrations.AlterField(
            model_name="linkempresa", name="criado_por",
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="links_empresa_criados", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RemoveField(model_name="linkempresa", name="token"),
        migrations.RemoveField(model_name="linkempresa", name="gestor"),
        migrations.AlterField(
            model_name="linkempresa", name="revogado",
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name="linkempresa", name="revogado_em",
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="linkempresa", name="revogado_por",
            field=models.ForeignKey(blank=True, editable=False, null=True,
                                    on_delete=django.db.models.deletion.PROTECT,
                                    related_name="links_empresa_revogados", to=settings.AUTH_USER_MODEL),
        ),
    ]
