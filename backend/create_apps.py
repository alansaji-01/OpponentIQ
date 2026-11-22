import os, pathlib, sys

apps = ['users','teams','matches','analytics','ml_engine','intelligence','vision']
base = pathlib.Path('apps')
base.mkdir(exist_ok=True)
(base / '__init__.py').touch()

for app in apps:
    p = base / app
    p.mkdir(exist_ok=True)
    (p / '__init__.py').touch()
    (p / 'models.py').write_text('from django.db import models\n# Models defined in Phase 2\n')
    (p / 'views.py').write_text('from rest_framework.views import APIView\n')
    (p / 'urls.py').write_text('from django.urls import path\nurlpatterns = []\n')
    (p / 'serializers.py').write_text('from rest_framework import serializers\n')
    (p / 'admin.py').write_text('from django.contrib import admin\n')
    class_name = ''.join(w.title() for w in app.split('_')) + 'Config'
    (p / 'apps.py').write_text(
        f'from django.apps import AppConfig\n'
        f'class {class_name}(AppConfig):\n'
        f'    default_auto_field = "django.db.models.BigAutoField"\n'
        f'    name = "apps.{app}"\n'
    )

print('All app stubs created OK')
