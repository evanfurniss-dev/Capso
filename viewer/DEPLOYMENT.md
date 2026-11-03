# Deployment record

The Worker targets the Dancescribe account and the existing `evan-screencap`
bucket. It uses a rate limit binding for sign-in. Library sessions last seven
days and expire when the password is rotated. No credentials are stored here.

The initial release backfills a poster and a 1080p H.264 playback copy for the
two existing MP4s. Originals remain in place. New Capso uploads create those
assets before returning a viewer link when video pages are enabled locally.

Validation before deployment: Debug app build, 55 ShareKit tests, 21 Worker
integration tests, TypeScript check, Wrangler deployment dry run, and desktop
and 390px visual checks. Native controls are used for playback, forms, and
buttons. All pages use visible keyboard focus and no autoplay.

The previous Dia playback failure has not been reproduced in Dia. Playback
copies are H.264 level 4.0 at 1920x1080 and retain the original audio. The
original failure must remain an open compatibility question until Dia is tested.

Automatic details add an R2 queue trigger and the `VideoEnrichment` Workflow.
The analysis bucket has public access disabled. Generated titles and descriptions
are validated before they update the public metadata. Transcripts are not added
to public pages. Model outputs and transcript bodies are excluded from logs.

Live validation on November 3, 2026 uploaded a disposable recording with speech
through the native R2 uploader. The R2 manifest notification created a Workflow
without an HTTP request starting inference. Whisper produced a private transcript
and GPT-OSS generated the title "Adjusting Video Export Quality in CAPSO" and a
matching description. The public details response, page heading, and Open Graph
tags matched. A separate silent recording completed with `no_speech`. Both
existing recordings were processed, preserving custom text when present.

The deployed event rules cover completed `metadata/*.json` manifests and `.mp4`
deletions. The analysis bucket has public access disabled. The local Capso build
was relaunched, and its R2 configuration and automatic upload setting were
checked in the app.

The library accepts passwords from 12 to 256 characters. The form and server use
the same minimum. The login tests cover an exactly 12-character password.
