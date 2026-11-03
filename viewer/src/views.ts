export const minimumPasswordLength = 12;
export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const css = `
:root{--background:#f8f9fb;--foreground:#182128;--card:#fff;--muted:#687581;--border:#e1e6e9;--primary:#164b44;--primary-foreground:#fff;--ring:#328578;--radius:12px;color-scheme:light;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--foreground);background:var(--background)}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-underline-offset:4px}button,input,textarea{font:inherit}button,.button{min-height:42px;border-radius:9px;padding:10px 17px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--border);background:var(--card);text-decoration:none;font-size:14px;font-weight:550;cursor:pointer;transition:background .15s}button:hover,.button:hover{background:#eef2f1}.primary{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.primary:hover{background:#0e3b35}:focus-visible{outline:3px solid var(--ring);outline-offset:4px}button:disabled{opacity:.5;cursor:wait}.wrap{max-width:1080px;margin:auto;padding:0 28px}header{height:92px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);margin-bottom:36px}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-size:15px;font-weight:650}.avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#dfece8;color:var(--primary);font-size:12px;letter-spacing:.04em}header .quiet{font-size:13px;color:var(--muted)}.stage{background:#e6eeeb;padding:24px;border:1px solid #d7e3df;border-radius:18px;box-shadow:0 12px 40px #1b3c3310}.player{position:relative;overflow:hidden;border-radius:9px;background:#111;box-shadow:0 8px 25px #1112}video{width:100%;max-height:640px;display:block;aspect-ratio:16/9;background:#111}.below{padding:28px 2px;display:flex;justify-content:space-between;gap:30px}.details{min-width:0;max-width:720px}h1{font-size:28px;line-height:1.25;letter-spacing:-.035em;font-weight:620;margin:0 0 12px;overflow-wrap:anywhere}.meta{font-size:13px;color:var(--muted);display:flex;gap:9px;align-items:center;flex-wrap:wrap}.dot{color:#abb4b9}.description{font-size:16px;line-height:1.65;color:#46545e;white-space:pre-wrap;overflow-wrap:anywhere;margin:24px 0 0}.actions{display:flex;gap:8px;align-items:flex-start;flex-shrink:0}.status{min-height:22px;color:var(--primary);font-size:13px}.note{margin-top:20px;color:var(--muted);font-size:14px}.note a{font-weight:500}footer{padding:28px 0 40px;border-top:1px solid var(--border);color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:15px}.panel{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px}.narrow{max-width:460px;margin:80px auto}.form{display:grid;gap:20px}label{display:block;font-size:14px;font-weight:550;margin-bottom:8px}input,textarea{display:block;width:100%;padding:11px 12px;border:1px solid #cbd3d9;border-radius:8px;background:var(--card);color:inherit;font-size:16px}textarea{resize:vertical;min-height:130px;line-height:1.5}.error{color:#a12929;font-size:14px}.library-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-bottom:40px}.tile{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}.tile>a{display:block;text-decoration:none}.tile img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#e6eeeb;display:block}.tile-body{padding:18px}.tile h2{font-size:16px;line-height:1.4;margin:0 0 8px;overflow-wrap:anywhere}.tile .meta{font-size:12px}.tile-actions{padding:0 18px 18px;display:flex;gap:16px;font-size:13px}.edit-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:28px;margin:28px 0 48px}.edit-grid img{width:100%;border-radius:9px}.saved{background:#e4f1eb;color:#205b3d;padding:12px;border-radius:8px;margin-bottom:18px}.skip{position:absolute;left:12px;top:-70px}.skip:focus{top:12px;z-index:10;background:white;padding:12px}.empty{padding:50px 0}.empty p{color:var(--muted)}@media(max-width:720px){.wrap{padding:0 18px}header{height:76px;margin-bottom:24px}.stage{padding:10px;border-radius:13px}.below{flex-direction:column;gap:22px}h1{font-size:25px}.actions{flex-wrap:wrap}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.edit-grid{grid-template-columns:1fr}.narrow{margin:35px auto}.panel{padding:22px}.quiet{display:none}}@media(max-width:420px){.grid{grid-template-columns:1fr}.tile-body{padding:16px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;
export function shell(
  title: string,
  content: string,
  owner: string,
  nonce: string,
  head = "",
  script = "",
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#164b44">${head}<style nonce="${nonce}">${css}</style></head><body><a class="skip" href="#main">Skip to content</a><div class="wrap"><header><a class="brand" href="/library"><span class="avatar" aria-hidden="true">EF</span>${escape(owner)}</a><span class="quiet">Videos, shared with you.</span></header><main id="main">${content}</main><footer><span>Shared by ${escape(owner)}</span><a href="/library">My library</a></footer></div>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`;
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
    `<section class="narrow panel"><h1>My video library</h1><p class="note">Sign in to edit your recordings.</p><form method="post" action="/login" class="form"><div><label for="password">Library password</label><input type="password" id="password" name="password" autocomplete="current-password" required minlength="${minimumPasswordLength}" maxlength="256" ${error ? 'aria-describedby="login-error" aria-invalid="true"' : ""}></div>${error ? `<p class="error" id="login-error" role="alert">${escape(error)}</p>` : ""}<button class="primary" type="submit">Sign in</button></form></section>`,
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
