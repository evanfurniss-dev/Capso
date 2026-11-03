# Video pages

Cloudflare Worker for the owner's Capso video bucket. Public pages are unlisted;
the library and text editor require a password. Media stays in R2. The Worker
streams video and handles byte ranges so seeking does not buffer entire files.

## Routes

- `/v/:id`: viewer with server-rendered Open Graph and Twitter metadata.
- `/library`: private video library; `/library/edit/:id`: title and description.
- `/login`, `/logout`: rate-limited password sign-in and a signed, secure session.
- `/assets/:id/poster.jpg` and `/assets/:id/playback.mp4`: derived media.
- Existing root media paths continue to serve original files.

The R2 object layout is `:id.mp4`, `assets/:id/poster.jpg`,
`assets/:id/playback.mp4`, and `metadata/:id.json`. Metadata contains only public
video details. There is no public listing endpoint. The underlying R2 public
endpoint remains accessible with known object keys.

## Development

Run `npm ci`, `npx wrangler types worker-configuration.d.ts`, `npm run check`, and
`npx wrangler deploy --dry-run --outdir dist` before `npm test`. Tests exercise
Worker requests against local R2 through Miniflare. Local secrets belong in an
ignored `.dev.vars` file. Use `wrangler secret put ADMIN_PASSWORD` for deployment.
Use a password of 16 to 256 characters; rotating it expires existing sessions.

## Design sources

Native HTML components adapt the tokens, button states, and spacing from
https://ui.shadcn.com/docs/components/button. COSS UI's React/Base UI components
were considered at https://coss.com/ui/docs/components/button; this small
server-rendered app uses native forms and controls without a client framework.

## Operations

R2 is bound as `VIDEOS`. Preserve the configured account when deploying. Deploy
the Worker without production routes first, test it on its workers.dev URL, then
attach the checked-in production routes. To roll back routing, remove only the
routes owned by this Worker; the existing R2 custom domain remains the origin.

Capso enables video page links through the local `cloudShareVideoPagesEnabled`
preference. When enabled, the app creates the poster and a 1080p playback copy
before returning the viewer URL. Existing original videos remain downloadable.
