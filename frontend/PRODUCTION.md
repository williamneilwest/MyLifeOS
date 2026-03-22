# Life OS Production Guide

## 1) Build and validate

```bash
npm ci
npm run typecheck
npm run build
npm run preview
```

## 2) Environment configuration

Create `.env` from `.env.example`.

Required values:
- `VITE_API_BASE_URL`: API origin for backend integration.

## 3) Hosting options

This app is static-build friendly and can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Nginx static hosting

Build output directory:
- `dist/`

## 4) SPA routing fallback

Ensure all unknown routes resolve to `index.html`.

Nginx example:

```nginx
location / {
  try_files $uri /index.html;
}
```

## 5) Security checklist

- Serve over HTTPS only.
- Set `Content-Security-Policy` to allow only required origins.
- Set `X-Content-Type-Options: nosniff`.
- Set `Referrer-Policy: strict-origin-when-cross-origin`.
- Configure CORS on backend for the deployed frontend origin.

## 6) Performance checklist

- Enable gzip or brotli compression.
- Use long cache headers for hashed assets in `dist/assets`.
- Keep source maps off in production unless needed.

## 7) Observability and reliability

Recommended next integrations:
- Error tracking (Sentry or equivalent)
- Analytics (privacy-friendly if desired)
- Uptime checks for deployed frontend and backend API

## 8) Data and persistence notes

Current persistence is browser local storage for module data.

For multi-device sync in production:
1. Implement authenticated backend endpoints.
2. Replace local storage reads/writes with API service calls.
3. Add optimistic updates and retry handling.

## 9) Release process

1. Merge to main branch.
2. Run CI (`typecheck`, `build`).
3. Deploy static bundle.
4. Smoke test critical flows:
   - Dashboard loads
   - Add/update finance entry
   - Create/update project
   - Add/update task
   - Add/update planning goal
   - Add/update homelab service
   - Tools links/snippets and sidebar module toggles

