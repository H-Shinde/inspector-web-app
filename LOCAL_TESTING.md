# Test admin and inspector together

Branch: `integration/admin-inspector` merges `admin-frontend-changes` and `inspector-frontend`.

Open this folder in VS Code. In three terminals at the project root, run:

- `npm run dev:backend` - Django at http://127.0.0.1:8000.
- `npm run dev:admin` - Admin at http://localhost:3000.
- `npm run dev:inspector` - Inspector at http://localhost:5173.

Keep all three running. Both frontends proxy `/api` to the same backend.
Use localhost for both frontend URLs. Admin and inspector use separate session and CSRF cookies, so both roles can stay logged in in the same browser. Job lists and job details receive live server events (normally within about one second). While editing an inspection sheet, updates are deferred to avoid overwriting unsaved input.

An isolated Python environment is already prepared in `.venv` for this checkout.
On another Windows checkout, install prerequisites using:

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm install
npm --prefix admin-frontend install
.venv\Scripts\python.exe backend/manage.py migrate
```

Use the existing local admin account (admin@email.com). Invite an inspector from the admin app, then register using the inspector app. With the default console email backend, invitation and password-reset emails print to the backend terminal.

Test: create and accept a bid, assign the job to a registered inspector, then confirm the inspector can see it and save inspection details.

This separate Git worktree has its own SQLite database from the admin branch. It does not share the original checkout's database. The original checkout and local changes are unchanged.

## Messaging and item quantities

The Messaging tab on each app uses persisted conversations and live server events. Admins choose an inspector; inspectors can message only their administrator. Images and videos are private to that conversation. A retry uses the same delivery ID to avoid duplicate messages.

New bids default Request Date to the local date and leave Value Date blank. Accepted bids seed one job row per appraised and non-appraised item. Item quantities must match the original bid before inspector submission. CSV import fills unused seeded rows instead of appending duplicate placeholders.

## Unread updates

Unread counts are stored per user and app on the backend. Both apps show live message badges and an Updates panel; jobs and records also show New or Updated indicators. Own saves do not create unread alerts for the author.

Open a conversation to clear its loaded messages. Open a job to acknowledge changes only once the displayed revision includes them; editing sheets and hidden tabs do not clear unseen updates. The Updates panel also supports Mark read and Mark all read. Acknowledgements use a snapshot cutoff so a newer arrival remains unread.

## Typography

Both apps use the same locally bundled Inter variable font, defined in `src/typography.css` and `admin-frontend/src/typography.css`. Vite fingerprints the WOFF2 asset; each HTML entry preloads the same font used by its CSS. No runtime font request goes to Google Fonts. Inter's SIL Open Font License is included in each app's public/fonts directory.

Source: https://github.com/rsms/inter (InterVariable.woff2, LICENSE.txt). Keep the two typography files and font assets identical when updating branding. UI text uses weights 400, 500, 600 and 700; tables and numeric fields use aligned tabular figures.

## Invite-only inspector registration

In the admin Inspector directory, choose Invite Inspector and enter their email. Every invitation has a randomly generated, signed, email-bound link. Links expire after seven days and are consumed by registration. Resend invite replaces the previous link without creating a second inspector. Registered or inactive inspectors cannot receive a new signup invite.

The inspector app validates the invitation before displaying registration and uses the email returned by the server; query-string name/email values are not trusted. Existing registered inspectors use Log in.

For delivery to real inboxes, copy backend/email_config.example.json to backend/email_config.json and replace the placeholders with your provider's SMTP details, verified sender, and deployed inspector-app URL. The private config is gitignored. Environment variables override this file. Never commit real mail credentials. With the default console backend, the email is printed in the backend terminal and the admin UI explicitly says it has not been emailed. Restart Django after configuring email.

### Gmail setup

Enable 2-Step Verification on the sending Google account and create an app password at https://myaccount.google.com/apppasswords. From the project root run `.venv\Scripts\python.exe backend\configure_gmail.py`. It prompts for the sender address, a hidden app password, and the inspector app URL; it verifies SMTP authentication over TLS before saving the gitignored configuration. It sends no test email. Restart Django and use Resend invite.


### Item photos

Inspectors can use the camera button on an item to take a photo on supported mobile devices, or Attach photos to select existing images. Save the item to upload its photos. Each item supports up to 10 JPEG, PNG, GIF or WebP images, up to 10 MB each. The admin can open the same item in Items to view the gallery and open full-size images. Photos remain available after submission and completion; submitted items are read-only until changes are requested.

Photo files are stored under the backend MEDIA_ROOT and served through authenticated, role-specific endpoints. Include this storage in deployment persistence and backups. Apply migrations with `.venv/Scripts/python.exe backend/manage.py migrate` on other checkouts.
