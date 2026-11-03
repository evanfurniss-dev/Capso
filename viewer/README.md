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
Sign-in checks the configured password directly, without a minimum length gate.
Choose a strong password during setup. Rotating it expires existing sessions.

## Design sources

Native HTML components adapt the tokens, button states, and spacing from
https://ui.shadcn.com/docs/components/button. COSS UI's React/Base UI components
were considered at https://coss.com/ui/docs/components/button; this small
server-rendered app uses native forms and controls without a client framework.

## Operations

R2 is bound as `VIDEOS`. Preserve the configured account when deploying. Deploy
the Worker without production routes first, test it on its workers.dev URL, then
attach the checked-in production routes. Production routes cover only viewer
pages and library screens; original media continues to use the R2 custom domain. To roll back routing, remove only the
routes owned by this Worker; the existing R2 custom domain remains the origin.

Capso enables video page links through the local `cloudShareVideoPagesEnabled`
preference. When enabled, the app creates the poster and a 1080p playback copy
before returning the viewer URL. Existing original videos remain downloadable.

## Automatic video details

R2 notifications for `metadata/*.json` feed a queue which starts a durable
Workflow for each original video version. Capso writes this manifest after all
audio parts have uploaded. This avoids processing an incomplete upload. Existing
videos can be backfilled by triggering the Workflow with their ID and source
ETag. Whisper Large v3 Turbo transcribes the audio; GPT-OSS
20B produces a title and description from that transcript. Inference runs on
Cloudflare and incurs usage charges. Public page visits cannot start inference.
Duplicate notifications reuse the same Workflow instance and completed audio
parts are reused after a retry.

Capso prepares one-minute M4A audio parts during upload, supporting up to two
hours of audio. Older uploads without prepared audio can use the Media binding
when the source is under 100 MB and ten minutes; longer or larger legacy videos
need audio preparation first. The processor never silently transcribes just the
first minute. Failed processing leaves the video and existing text available.

Transcripts and intermediate model results are stored in `evan-video-analysis`,
a separate private bucket. Only a signed-in library session can view the full
transcript. Public pages and preview tags contain the generated title and
description. Manual edits are marked and preserved across delayed results and
retries. A recording with no usable speech keeps its existing details.

Removing an original video queues cleanup of its derived assets and analysis.
Configure a second R2 rule for object deletion with suffix `.mp4`. Both rules
use `evan-video-uploads`; failures after queue retries go to
`evan-video-uploads-dlq`. Do not add an original `.mp4` creation rule for Capso
uploads, because that event arrives before their audio manifest is ready.
