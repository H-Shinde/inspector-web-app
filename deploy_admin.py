"""Run from the extracted admin deployment folder on PythonAnywhere."""
import getpass
import ast
import pathlib
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime


def main():
    source = pathlib.Path(__file__).resolve().parent
    home = pathlib.Path.home()
    backend = home / 'backend'
    frontend = home / 'frontend' / 'dist'
    database = backend / 'db.sqlite3'
    if database.exists():
        backup = home / ('admin-db-backup-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.sqlite3')
        with sqlite3.connect(database) as current, sqlite3.connect(backup) as destination:
            current.backup(destination)
        print('Database backup:', backup)
    shutil.copytree(source / 'backend', backend, dirs_exist_ok=True)
    shutil.copytree(source / 'dist', frontend, dirs_exist_ok=True)
    settings = backend / 'config' / 'settings.py'
    if not settings.exists():
        shutil.copy2(source / 'settings_template.py', settings)
    username = getpass.getuser()
    hostname = username + '.pythonanywhere.com'
    marker = '# BEGIN AUTOMATIC PYTHONANYWHERE SETTINGS'
    existing = settings.read_text()
    existing = existing.split(marker)[0].rstrip()
    settings.write_text(existing + '\n\n' + marker + '\n' +
        'DEBUG = False\n' +
        f'ALLOWED_HOSTS = [{hostname!r}, { (username + ".eu.pythonanywhere.com")!r}]\n' +
        f'CSRF_TRUSTED_ORIGINS = ["https://{hostname}", "https://{username}.eu.pythonanywhere.com"]\n' +
        f'TEMPLATES[0]["DIRS"] = [{str(frontend)!r}]\n' +
        'STATIC_ROOT = BASE_DIR / "staticfiles"\n' +
        'if "accounts.access.AdminAppAccessMiddleware" not in MIDDLEWARE:\n' +
        '    MIDDLEWARE.insert(MIDDLEWARE.index("django.contrib.auth.middleware.AuthenticationMiddleware") + 1, "accounts.access.AdminAppAccessMiddleware")\n' +
        'INSPECTOR_FRONTEND_URL = os.environ.get("INSPECTOR_FRONTEND_URL", globals().get("INSPECTOR_FRONTEND_URL", "http://localhost:5173"))\n')
    # Keep the existing production settings and secrets; install current URL routes.
    urls = backend / 'config' / 'urls.py'
    urls.write_text(urls.read_text() + '\nfrom django.urls import re_path\nfrom django.views.generic import TemplateView\nurlpatterns += [re_path(r"^(?!api(?:/|$)|admin(?:/|$)).*$", TemplateView.as_view(template_name="index.html"))]\n')
    if (frontend / 'inspector' / 'index.html').exists():
        with urls.open('a') as handle:
            handle.write('\nurlpatterns.insert(0, re_path(r"^inspector(?:/.*)?$", TemplateView.as_view(template_name="inspector/index.html")))\n')
        with settings.open('a') as handle:
            handle.write(f'\nINSPECTOR_FRONTEND_URL = "https://{hostname}/inspector"\n')
    for command in [('migrate', '--noinput'), ('collectstatic', '--noinput'), ('check',)]:
        subprocess.run([sys.executable, 'manage.py', *command], cwd=backend, check=True)
    print('Update complete. Click Reload on the PythonAnywhere Web tab.')


if __name__ == '__main__':
    main()
