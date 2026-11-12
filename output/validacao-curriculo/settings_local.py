"""Ambiente isolado de validação: somente SQLite e arquivos locais fictícios."""
from config.settings import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "output/validacao-curriculo/db.sqlite3"}}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
MEDIA_ROOT = BASE_DIR / "output/validacao-curriculo/media"
CORS_ALLOWED_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081"]
