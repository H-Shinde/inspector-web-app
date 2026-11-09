"""Enable private SMTP configuration in an existing hosted Django settings file."""
from pathlib import Path
import shutil


def main():
    backend = Path.home() / 'backend'
    credentials = backend / 'email_config.json'
    if not credentials.exists():
        raise SystemExit(f'Create {credentials} with your SMTP settings first.')
    import json
    data = json.loads(credentials.read_text())
    if not data.get('EMAIL_HOST_USER') or not data.get('EMAIL_HOST_PASSWORD'):
        raise SystemExit('Fill in EMAIL_HOST_USER and EMAIL_HOST_PASSWORD first.')
    settings = backend / 'config' / 'settings.py'
    marker = '# Hosted private SMTP configuration loader'
    text = settings.read_text()
    if marker not in text:
        backup = settings.with_name('settings.before-smtp.py')
        if not backup.exists():
            shutil.copy2(settings, backup)
        loader = '''# Hosted private SMTP configuration loader
import os as _smtp_os
import json as _smtp_json
from pathlib import Path as _smtp_Path
with (_smtp_Path(__file__).resolve().parent.parent / "email_config.json").open() as _smtp_file:
    for _smtp_key, _smtp_value in _smtp_json.load(_smtp_file).items():
        if _smtp_key.startswith("EMAIL_") or _smtp_key in {"DEFAULT_FROM_EMAIL", "FRONTEND_URL"}:
            if _smtp_value:
                _smtp_os.environ[_smtp_key] = str(_smtp_value).replace(" ", "") if _smtp_key == "EMAIL_HOST_PASSWORD" else str(_smtp_value)

'''
        settings.write_text(loader + text)
    credentials.chmod(0o600)
    print('SMTP configuration loader enabled. Reload the web app, then send a new invitation.')


if __name__ == '__main__':
    main()
