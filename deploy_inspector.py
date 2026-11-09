"""Install the inspector frontend alongside the existing PythonAnywhere admin app."""
import pathlib
import shutil
import subprocess
import sys
import getpass


def main():
    source = pathlib.Path(__file__).resolve().parent
    home = pathlib.Path.home()
    backend = home / 'backend'
    frontend = home / 'frontend' / 'dist'
    if not (backend / 'manage.py').exists():
        raise SystemExit('Deploy the admin/backend package first.')
    destination = frontend / 'inspector'
    shutil.copytree(source / 'dist', destination, dirs_exist_ok=True)
    # Both apps use the existing /assets/ mapping and content-hashed filenames.
    shutil.copytree(source / 'dist' / 'assets', frontend / 'assets', dirs_exist_ok=True)
    urls = backend / 'config' / 'urls.py'
    marker = '# BEGIN INSPECTOR FRONTEND ROUTE'
    text = urls.read_text().split(marker)[0].rstrip()
    urls.write_text(text + '\n\n' + marker + '\nfrom django.urls import re_path\nfrom django.views.generic import TemplateView\nurlpatterns.insert(0, re_path(r"^inspector(?:/.*)?$", TemplateView.as_view(template_name="inspector/index.html")))\n')
    settings = backend / 'config' / 'settings.py'
    marker = '# BEGIN INSPECTOR FRONTEND SETTINGS'
    text = settings.read_text().split(marker)[0].rstrip()
    hostname = getpass.getuser() + '.pythonanywhere.com'
    settings.write_text(text + '\n\n' + marker + f'\nINSPECTOR_FRONTEND_URL = "https://{hostname}/inspector"\n')
    subprocess.run([sys.executable, 'manage.py', 'check'], cwd=backend, check=True)
    print(f'Inspector app: https://{hostname}/inspector/')
    print('Click Reload on the PythonAnywhere Web tab.')


if __name__ == '__main__':
    main()
