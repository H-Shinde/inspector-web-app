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
