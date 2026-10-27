# Authentication backend

Activate the project environment and run the server from this directory:

```bash
python3.13 -m venv .venv-django
source .venv-django/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Start the React app separately on `http://localhost:3000`. Its Vite proxy forwards `/api` requests to Django on port 8000.

## Forgot password

The following JSON endpoints match the React forms:

- `POST /api/auth/password-reset/` with `{ "email": "user@example.com" }`.
- `POST /api/auth/password-reset-confirm/` with `{ "uid": "...", "token": "...", "new_password1": "...", "new_password2": "..." }`.

Fetch `/api/auth/csrf/` first and send the returned `csrfToken` as `X-CSRFToken` on POST requests. Both endpoints retain Django CSRF protection. Errors return an `error` string with HTTP 400. Reset requests return the same success message for known and unknown accounts. Only active users with usable passwords receive reset emails.

During local development, reset emails are **printed in the Django terminal**, not delivered to an inbox. Click Forgot password in React, enter an existing account's email, copy the `/UpdatePass?uid=...&token=...` link from the Django terminal, and open it in your browser. Enter the new password twice, then sign in with it. Links expire after one hour, cannot be reused after a successful reset, and password changes invalidate existing login sessions.

No user accounts or existing passwords are changed by installing this feature. If you need a test account, create one interactively with `python manage.py createsuperuser`.

## Real email delivery

Set these environment variables in the shell that runs Django, or in your hosting configuration:

```text
FRONTEND_URL=https://your-frontend-domain.example
DEFAULT_FROM_EMAIL=Bison Valuation <your-verified-sender@example.com>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=true
```

Django must be restarted after changing these values. This project does not automatically read `.env` files. Keep SMTP credentials outside source control. `FRONTEND_URL` is controlled by server configuration, not the incoming Host header. Settings support both Django 5.2's `EMAIL_*` configuration and Django 6.1's `MAILERS` configuration. The default frontend URL is `http://localhost:3000`.

Production also needs its normal HTTPS/host/secret configuration and rate limiting for authentication/reset endpoints. The current project settings remain configured for local development.

## Verification

```bash
python manage.py test accounts --noinput
python manage.py check
```

The tests use a separate test database and an in-memory email backend. They do not modify existing accounts or send real email.

Django reference: https://docs.djangoproject.com/en/5.2/topics/auth/default/#built-in-auth-forms


## Connect this copy of the frontend

The frontend is connected to these endpoints. Run `npm run dev` in `admin-frontend` and open `http://localhost:3000`. Its Vite `/api` proxy targets `http://127.0.0.1:8000`. Login uses your Django email/password, private pages check the Django session, logout ends that session, and password-reset links open the React reset screen. POST requests include the CSRF token and session cookies. Restart Vite after proxy configuration changes.

The installer creates a fresh database; existing accounts and passwords from the original project are not copied. Create a user with `python manage.py createsuperuser` before testing login or password reset.


## Bid backend

The `bids` application stores bids and inspectors in Django. Each record belongs to its creating user. All bid API requests require a valid login; all writes require the CSRF token from `/api/auth/csrf/`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/bids/inspectors/` | List your active inspectors |
| POST | `/api/bids/inspectors/` | Create your inspector using `{ "name": "Name", "email": "inspector@example.com" }`; works for regular users |
| GET | `/api/bids/` | List your pending bids |
| POST | `/api/bids/` | Create a bid with `inspectorId`, `appraisalType`, `businessName`, `name`, and the remaining Add Bid fields |
| GET/PATCH | `/api/bids/<id>/` | View/edit your pending bid |
| PATCH | `/api/bids/<id>/` | Send `{ "status": "Accepted" }` or `{ "status": "Declined" }` separately from edits |
| DELETE | `/api/bids/<id>/` | Archive your bid with Deleted status |
| GET | `/api/bids/?history=1` | List your accepted, declined, and deleted bids |
| POST | `/api/bids/<id>/agreement/` | Upload multipart `agreement` PDF (maximum 10 MB) |
| GET | `/api/bids/<id>/agreement/` | Download your agreement with authentication |

Appraisal types are `Business Valuation (BV)` and `Machinery & Equipment (M&E)`. M&E report format must be `Onsite` or `Desktop`. Inspector assignment is required and must use an active inspector belonging to the signed-in user. Django sets the owner, Pending status, database ID/reference, and final total rather than trusting values supplied by the browser. References use `BID-000001` format. Money uses decimal fields. The M&E total is its bid amount; hidden BV pricing is excluded.

Example creation body (replace inspectorId with one returned by your inspector endpoint):

```json
{
  "appraisalType": "Machinery & Equipment (M&E)",
  "reportFormat": "Desktop",
  "businessName": "Example Machinery",
  "name": "Subject Contact",
  "inspectorId": 1,
  "bidAmount": "1500.00"
}
```

The Downloads frontend is now connected to `/api/bids/`. Add Bid loads and creates database inspectors, saves bids, and uploads the generated agreement. The bids table and Bid Information use the API; History loads archived server bids and preserves the existing read-only details view. No browser-only bids or inspectors are automatically imported. Create your real inspectors via the authenticated API or Django Admin before creating database-backed bids.

Agreements are private files under `media/`, accessed only through the agreement API. Do not expose that folder as unauthenticated static media. PDF generation still uses the existing frontend template: create the bid first, generate the PDF using its returned reference, then upload it.

Run `python manage.py test bids accounts --noinput` to verify bid ownership, validation, uploads, archival, and authentication/reset behavior. Run `python manage.py migrate` if installing these source files on another machine.

## Bid calculation settings

Open **Settings** in the app navigation to configure a separate formula for Business Valuation, Calculation Valuation, and Machinery and Equipment. Settings belong to the signed-in account. Each included field adds or subtracts its value multiplied by a configurable rate; checkbox fields use 1 when checked and 0 otherwise. Contributions can depend on Rush/PDF Only being checked or unchecked. Each contribution rounds to cents before summing. Defaults retain the original calculation, including the fee-only Machinery and Equipment total.

`GET /api/bid-settings/` returns saved rules, defaults, and available fields. `PUT /api/bid-settings/` saves `{ "rules": ... }` with session authentication and CSRF. New bids snapshot the account's rules on the server; editing an existing bid uses its saved rules, and changing settings does not reprice existing bids. Bids created before this feature keep the original default formula. Agreements and email amounts use the same calculation as the total preview.

Apply the database migration with `python manage.py migrate`. Run `python manage.py test bids.test_settings --noinput` to check formula validation, ownership, CSRF, rounding, and existing-bid preservation.
