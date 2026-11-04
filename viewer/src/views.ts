export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const css = `
@font-face{font-family:Departure Mono;src:url('/assets/fonts/departure-mono-1.500.woff2') format('woff2');font-style:normal;font-weight:400;font-display:swap}
:root{--background:#000;--foreground:#eee;--card:#0a0a0a;--muted:#a3a3a3;--border:#282828;--primary:#eee;--primary-foreground:#111;--ring:#fff;--radius:10px;--font-mono:'Departure Mono',ui-monospace,SFMono-Regular,Menlo,monospace;--font-sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color-scheme:dark;font-family:var(--font-mono);font-size:14px;font-weight:400;color:var(--foreground);background:var(--background);-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:5px}a:hover{color:#fff}button,input,textarea{font:inherit}button,.button{min-height:44px;border-radius:5px;padding:10px 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #5b5b5b;background:transparent;color:var(--foreground);text-decoration:none;font-size:12px;font-weight:400;text-transform:uppercase;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s}button:hover,.button:hover{background:#191919;border-color:#999}.primary{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.primary:hover{background:#fff;border-color:#fff;color:#000}:focus-visible{outline:2px solid var(--ring);outline-offset:5px}button:disabled{opacity:.65;cursor:wait}.workspace{display:grid;grid-template-columns:176px minmax(0,1fr);gap:48px;max-width:1560px;margin-inline:auto;padding:36px 48px 0}.rail{position:sticky;top:36px;align-self:start;display:flex;flex-direction:column;gap:44px;min-width:0}.brand{display:flex;gap:12px;align-items:center;text-decoration:none;text-transform:uppercase;font-size:13px;min-height:44px}.avatar{width:28px;height:28px;flex-shrink:0;display:grid;place-items:center;border:1px solid #555;font-size:11px;color:#fff}.tree{border-left:1px solid var(--border);margin-left:13px;padding:0 0 0 19px;display:grid;gap:8px}.tree a{min-height:44px;display:flex;align-items:center;text-decoration:none;font-size:12px;text-transform:uppercase;color:var(--muted);position:relative}.tree a:before{content:'';position:absolute;left:-20px;width:10px;height:1px;background:var(--border)}.tree a:hover,.tree a[aria-current=page]{color:#fff}.rail-credit{color:var(--muted);font-size:11px;line-height:1.8;padding-left:33px;text-transform:uppercase;overflow-wrap:anywhere}.content{min-width:0}.page-header{min-height:44px;display:flex;align-items:center;margin-bottom:30px}.path{display:flex;align-items:center;flex-wrap:wrap;gap:12px;color:var(--muted);font-size:11px;text-transform:uppercase;line-height:1.8;overflow-wrap:anywhere}.path a{text-decoration:none;display:inline-flex;align-items:center;min-height:44px}.path .current{color:var(--foreground)}.path .separator{color:#666}.stage{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--card)}.player{position:relative;background:#090909;overflow:hidden}video{width:100%;max-height:740px;display:block;aspect-ratio:16/9;background:#090909}.below{padding:30px 0 32px;display:flex;justify-content:space-between;gap:32px}.details{min-width:0;max-width:720px}h1{font-size:22px;line-height:1.5;font-weight:400;text-transform:uppercase;letter-spacing:0;margin:0 0 18px;overflow-wrap:anywhere;text-wrap:pretty}.meta{font-size:11px;color:var(--muted);display:flex;gap:12px;align-items:center;flex-wrap:wrap;line-height:1.8;text-transform:uppercase;font-variant-numeric:tabular-nums}.dot{color:#666}.description{font-family:var(--font-sans);font-size:16px;line-height:1.75;color:#bcbcbc;white-space:pre-wrap;overflow-wrap:anywhere;margin:24px 0 0;max-width:65ch;text-wrap:pretty}.actions{display:flex;gap:10px;align-items:flex-start;flex-shrink:0}.status{min-height:20px;color:var(--foreground);font-size:11px;line-height:1.8}.note{margin-top:20px;color:var(--muted);font-family:var(--font-sans);font-size:14px;line-height:1.7}.note:empty{display:none}.note a{color:var(--foreground)}footer{padding:26px 0 32px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.8;display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;text-transform:uppercase}footer a{display:inline-flex;min-height:32px;align-items:center}footer span{display:inline-flex;align-items:center}.panel{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px}.narrow{max-width:460px;margin:56px auto 100px}.narrow h1{margin-bottom:12px}.narrow .note{margin:0 0 32px}.form{display:grid;gap:24px}label{display:block;font-size:12px;text-transform:uppercase;line-height:1.8;margin-bottom:10px}input,textarea{display:block;width:100%;padding:13px 14px;border:1px solid #606060;border-radius:4px;background:#111;color:var(--foreground);font-family:var(--font-sans);font-size:16px;line-height:1.5}textarea{resize:vertical;min-height:160px}input:hover,textarea:hover{border-color:#888}.error{color:#ffb4a9;font-family:var(--font-sans);font-size:14px;line-height:1.6;margin:0}.library-head{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:32px}.library-head h1{margin:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 28px;margin-bottom:48px}.tile{min-width:0}.tile>a{display:block;text-decoration:none}.tile img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#111;display:block;border:1px solid var(--border);border-radius:8px;transition:border-color .15s}.tile>a:hover img{border-color:#777}.tile-body{padding:18px 0 0}.tile h2{font-size:14px;line-height:1.7;font-weight:400;text-transform:uppercase;margin:0 0 8px;overflow-wrap:anywhere}.tile .meta{font-size:11px;gap:8px}.tile-actions{display:flex;gap:24px;font-size:11px;text-transform:uppercase;margin-top:10px}.tile-actions a{display:inline-flex;min-height:44px;align-items:center;color:var(--muted)}.tile-actions a:hover{color:#fff}.edit-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:28px;margin:28px 0 48px}.edit-grid>section{min-width:0}.edit-grid img{width:100%;border:1px solid var(--border);border-radius:8px}.edit-grid>.panel h1{font-size:18px}.edit-grid details{margin-top:24px}.edit-grid summary{cursor:pointer;line-height:1.8;font-size:12px;text-transform:uppercase;padding:4px 0}.edit-grid details h2{font-size:16px;font-weight:400;line-height:1.7}.edit-grid details .description{font-size:15px}.saved{background:#151515;color:#eee;border-left:2px solid #aaa;padding:12px 14px;margin:0 0 24px;font-family:var(--font-sans);line-height:1.6}.skip{position:absolute;left:16px;top:-80px}.skip:focus{top:16px;z-index:10;background:var(--foreground);color:var(--background);padding:12px}.empty{padding:40px 0 90px}.empty h2{font-size:16px;font-weight:400;line-height:1.7;text-transform:uppercase}.empty p{color:var(--muted);font-family:var(--font-sans);line-height:1.7}::selection{background:#eee;color:#111}
@media(min-width:1440px){.workspace{gap:64px;padding-inline:64px}}
@media(max-width:1100px){.workspace{grid-template-columns:148px minmax(0,1fr);gap:32px;padding-inline:28px}.below{flex-direction:column;gap:24px}.actions{flex-wrap:wrap}.status:empty{display:none}.edit-grid{grid-template-columns:1fr}}
@media(max-width:760px){.workspace{display:block;padding:20px 20px 0}.rail{position:static;flex-direction:row;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}.brand{font-size:12px}.tree{border:0;margin:0;padding:0}.tree a{font-size:11px}.tree a:before,.rail-credit{display:none}.page-header{margin-bottom:20px;padding-top:16px;border-top:1px solid var(--border)}.path{font-size:11px;gap:10px}.path a{min-height:32px}h1{font-size:22px}.below{padding-top:24px}.grid{gap:28px 20px}.library-head{align-items:flex-start}.library-head h1{font-size:18px;line-height:1.7}.panel{padding:24px}.narrow{margin:24px auto 64px}.description{font-size:16px}.edit-grid{margin-top:24px}}
@media(max-width:480px){.grid{grid-template-columns:1fr}.library-head{gap:16px}.library-head button{padding-inline:12px}.meta{gap:8px}.path .current{max-width:100%}footer{font-size:10px}.panel{padding:22px}.narrow h1{font-size:20px}.brand{gap:9px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
@media(forced-colors:active){button,.button,input,textarea,.avatar,.stage,.panel,.tile img{border:1px solid CanvasText}:focus-visible{outline-color:Highlight}}
`;
export function shell(
  title: string,
  content: string,
  owner: string,
  nonce: string,
  head = "",
  script = "",
) {
  const breadcrumb =
    title === "My video library"
      ? '<span class="current">Recordings</span>'
      : `<a href="/library">Recordings</a><span class="separator" aria-hidden="true">/</span><span class="current">${escape(title)}</span>`;
  const libraryCurrent =
    title === "My video library" ? ' aria-current="page"' : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#000000">${head}<style nonce="${nonce}">${css}</style></head><body><a class="skip" href="#main">Skip to content</a><div class="workspace"><aside class="rail"><a class="brand" href="/library"><span class="avatar" aria-hidden="true">EF</span>${escape(owner)}</a><nav class="tree" aria-label="Main navigation"><a href="/library"${libraryCurrent}>My library</a></nav><div class="rail-credit">Shared by<br>${escape(owner)}</div></aside><div class="content"><header class="page-header"><nav class="path" aria-label="Breadcrumb">${breadcrumb}</nav></header><main id="main">${content}</main><footer><span>Shared by ${escape(owner)}</span><a href="/library">My library</a></footer></div></div>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`;
}
export interface Video {
  id: string;
  key: string;
  title: string;
  description: string;
  created: string;
  size: number;
  duration?: number;
  poster: string;
  playback: string;
  revision: string;
  processingStatus?: string;
  transcriptKey?: string;
  generatedTitle?: string;
  generatedDescription?: string;
}
export function videoView(
  v: Video,
  owner: string,
  origin: string,
  nonce: string,
) {
  const url = origin + "/v/" + v.id,
    poster = origin + v.poster;
  const description =
    v.description || `Watch this recording shared by ${owner}.`;
  const head = `<link rel="canonical" href="${escape(url)}"><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(v.title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="video.other"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(poster)}?v=${escape(v.revision)}"><meta property="og:image:alt" content="${escape(v.title)}"><meta property="og:image:type" content="image/jpeg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(v.title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(poster)}?v=${escape(v.revision)}">`;
  const body = `<div class="stage"><div class="player"><video controls playsinline preload="metadata" poster="${escape(v.poster)}" aria-label="${escape(v.title)}"><source src="${escape(v.playback)}" type="video/mp4"><a href="/${escape(v.key)}">Download the video</a></video></div></div><div class="below"><div class="details"><h1 id="video-title">${escape(v.title)}</h1><div class="meta"><span>${escape(owner)}</span><span class="dot" aria-hidden="true">·</span><time datetime="${escape(v.created)}">${date(v.created)}</time><span class="dot" aria-hidden="true">·</span><span id="duration">${v.duration ? duration(v.duration) : "Video"}</span></div><p class="description" id="video-description" ${v.description ? "" : "hidden"}>${escape(v.description)}</p><p class="note" id="processing-status" role="status">${["queued", "transcribing", "summarizing"].includes(v.processingStatus ?? "") ? "Preparing the title and description…" : ""}</p><p class="note" id="playback-help" hidden>Playback did not start. <a href="/${escape(v.key)}?download=1">Download the original video</a>.</p></div><div><div class="actions"><button class="primary" id="copy">Copy link</button><a class="button" href="/${escape(v.key)}?download=1" download>Download</a></div><p class="status" role="status" id="copy-status"></p></div></div>`;
  const script = `const video=document.querySelector('video');video.addEventListener('loadedmetadata',()=>{const s=Math.round(video.duration);if(Number.isFinite(s))document.getElementById('duration').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')});video.addEventListener('error',()=>document.getElementById('playback-help').hidden=false);document.querySelector('#copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(${JSON.stringify(url)});document.querySelector('#copy-status').textContent='Link copied.'}catch{document.querySelector('#copy-status').textContent='Copy the page address from your browser.'}});`;
  const polling = ["queued", "transcribing", "summarizing"].includes(
    v.processingStatus ?? "",
  )
    ? `let polls=0;async function refreshDetails(){if(polls++>=60)return;try{const response=await fetch('/v/${v.id}/details',{cache:'no-store'});if(response.ok){const value=await response.json();document.getElementById('video-title').textContent=value.title;document.title=value.title;const description=document.getElementById('video-description');description.textContent=value.description;description.hidden=!value.description;if(!['queued','transcribing','summarizing'].includes(value.status)){document.getElementById('processing-status').textContent='';return;}}}catch{}setTimeout(refreshDetails,10000)}setTimeout(refreshDetails,10000);`
    : "";
  return shell(v.title, body, owner, nonce, head, script + polling);
}
export function date(s: string) {
  return escape(
    new Date(s).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    }),
  );
}
export function duration(n: number) {
  const s = Math.round(n);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
export function loginView(owner: string, nonce: string, error = "") {
  return shell(
    "Sign in",
    `<section class="narrow panel"><h1>My video library</h1><p class="note">Sign in to edit your recordings.</p><form method="post" action="/login" class="form"><div><label for="password">Library password</label><input type="password" id="password" name="password" autocomplete="current-password" required maxlength="256" ${error ? 'aria-describedby="login-error" aria-invalid="true"' : ""}></div>${error ? `<p class="error" id="login-error" role="alert">${escape(error)}</p>` : ""}<button class="primary" type="submit">Sign in</button></form></section>`,
    owner,
    nonce,
  );
}
export function libraryView(
  videos: Video[],
  owner: string,
  nonce: string,
  cursor: string,
) {
  return shell(
    "My video library",
    `<div class="library-head"><h1>My video library</h1><form method="post" action="/logout"><button>Sign out</button></form></div>${videos.length ? `<div class="grid">${videos.map((v) => `<article class="tile"><a href="/v/${v.id}"><img src="${escape(v.poster)}" alt="" loading="lazy"><div class="tile-body"><h2>${escape(v.title)}</h2><p class="meta">${date(v.created)}<span>·</span>${(v.size / 1e6).toFixed(1)} MB</p></div></a><div class="tile-actions"><a href="/library/edit/${v.id}">Edit details</a><a href="/v/${v.id}">Open video</a></div></article>`).join("")}</div>` : `<section class="empty"><h2>Your recordings will appear here</h2><p>Share a video from Capso to add it to your library.</p></section>`}${cursor ? `<a class="button" href="/library?cursor=${encodeURIComponent(cursor)}">Next page</a>` : ""}`,
    owner,
    nonce,
  );
}
export function editView(
  v: Video,
  owner: string,
  nonce: string,
  saved: boolean,
  transcript = "",
) {
  return shell(
    "Edit " + v.title,
    `<a href="/library">← My library</a><div class="edit-grid"><section class="panel"><h1>Edit video details</h1>${saved ? '<p class="saved" role="status">Changes saved.</p>' : ""}<form class="form" method="post"><input type="hidden" name="revision" value="${escape(v.revision)}"><div><label for="title">Title</label><input id="title" name="title" value="${escape(v.title)}" maxlength="160" required></div><div><label for="description">Description</label><textarea id="description" name="description" maxlength="3000">${escape(v.description)}</textarea></div><button class="primary">Save changes</button></form></section><section><a href="/v/${v.id}"><img src="${escape(v.poster)}" alt="Open ${escape(v.title)}"></a>${v.processingStatus ? `<p class="note" role="status">${escape(({ queued: "Waiting to create automatic details.", transcribing: "Transcribing the recording…", summarizing: "Writing the title and description…", ready: "Automatic details are ready.", no_speech: "No usable speech was found. You can add details manually.", failed: "Automatic details could not be created. You can still edit this video." } as Record<string, string>)[v.processingStatus] ?? "")}</p>` : ""}${transcript ? `<details class="panel"><summary>Transcript</summary><p class="description">${escape(transcript)}</p></details>` : ""}${v.generatedTitle ? `<details class="panel"><summary>Generated draft</summary><h2>${escape(v.generatedTitle)}</h2><p class="description">${escape(v.generatedDescription ?? "")}</p></details>` : ""}<p class="note">The title and description also appear in link previews. Messaging apps may cache an earlier preview.</p><a class="button" href="/v/${v.id}">Open video</a></section></div>`,
    owner,
    nonce,
  );
}
