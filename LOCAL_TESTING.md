# Test admin and inspector together

Branch: `integration/admin-inspector` merges `admin-frontend-changes` and `inspector-frontend`.

Open this folder in VS Code. In three terminals at the project root, run:

- `npm run dev:backend` - Django at http://127.0.0.1:8000.
- `npm run dev:admin` - Admin at http://localhost:3000.
- `npm run dev:inspector` - Inspector at http://localhost:5173.

Keep all three running. Both frontends proxy `/api` to the same backend.
Use localhost for both frontend URLs. They share a Django session: use separate browser profiles or a private window to test both roles simultaneously.

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
