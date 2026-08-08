# Dear Kolkata Frontend

React + Vite frontend for the Dear Kolkata marketplace.

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000` through `vite.config.js`.

## API Configuration

By default, the app calls `/api`, which works when the frontend and backend are served from the same origin or through the Vite dev proxy.

For a separate production API host, set:

```bash
VITE_API_BASE_URL=https://your-api-domain.com/api
```

Keep `FRONTEND_URL` on the backend set to the deployed frontend origin so CORS and cookies work correctly.

## Verification

```bash
npm run build
```

`npm run lint` currently reports existing project-wide ESLint issues, mostly unused `React` imports from the automatic JSX runtime and strict React hooks rules. The production build is the current release gate until those lint rules are cleaned up.
