# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)


## Connected Django authentication

Run the backend from a separate terminal:

```bash
cd ../backend
source .venv-django/bin/activate
python manage.py runserver
```

Run `npm run dev` in this frontend directory, then open `http://localhost:3000`. Restart Vite after changing proxy settings. The `/api` development proxy forwards authentication requests to Django on `127.0.0.1:8000`; port 3000 is fixed to match CSRF and reset-email settings.

Sign in with the email/password of your regular Django user. Account creation is not a public registration screen. If you still need an account, create one using the Django shell or `python manage.py createsuperuser` for an admin account.

Private pages wait for GET `/api/auth/me/`. Sign in and logout call Django using cookie sessions and CSRF-protected POST requests. Password reset uses `/api/auth/password-reset/` and `/api/auth/password-reset-confirm/`; reset links open `/UpdatePass?uid=...&token=...`. With the backend's development configuration, reset emails appear in the Django terminal rather than an inbox.

Authentication and bids are connected to Django. Jobs, clients, and item images retain their existing browser-backed implementation; frontend navigation checks do not replace authorization on future data APIs.

Tests: `CI=true npm test -- --watchAll=false --runInBand`. Build: `npm run build`. Production hosting must route `/api` to Django under the same HTTPS origin; Vite's development proxy is not a production reverse proxy.


## Connected bids

Add Bid fetches inspectors from `/api/bids/inspectors/`. Use **+ Add Inspector** next to the assignment dropdown to create an inspector for your regular Django account; no administrator privileges are needed. Inspector assignment remains required.

Confirm & Create sends the bid to `/api/bids/`; Django returns the saved reference and final total. The existing PDF template is filled using the returned bid and uploaded to `/api/bids/<id>/agreement/`. If PDF generation/upload fails after creation, retry reuses that bid. Before creation, a preview has no final reference number.

The bids table loads pending records from Django. Bid Information loads by URL ID, updates fields and assignment through PATCH, saves accept/decline decisions, and downloads agreements from the backend. Delete archives the server record. History loads declined/deleted server bids while preserving the current read-only record page and local completed jobs.

Existing browser-only bids/inspectors are not automatically imported. The existing acceptance-to-jobs handoff still uses browser storage for jobs. Real inspector email addresses are carried into that handoff.

Keep Django running on port 8000 and Vite on port 3000. Refresh after applying this integration. API errors stay visible with retry actions; failed saves are not reported as successful.
