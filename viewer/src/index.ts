import { handleUploadEvents } from "./enrichment";
export { VideoEnrichment } from "./enrichment";
import {
  shell,
  videoView,
  loginView,
  libraryView,
  editView,
  type Video,
} from "./views";

const idPattern = /^[a-z0-9][a-z0-9_-]{5,63}$/;
const encoder = new TextEncoder();
const errorHeaders = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
};
export const metadataKey = (id: string) => `metadata/${id}.json`;
export function validID(id: string) {
  return idPattern.test(id);
}
export function keyFromPage(path: string) {
  const m = /^\/v\/([a-z0-9_-]+)(?:\.mp4)?$/.exec(path);
  return m && validID(m[1]) ? m[1] : null;
}
function redirect(path: string, cookie?: string) {
  const h = new Headers({ location: path, "cache-control": "no-store" });
  if (cookie) h.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers: h });
}
async function boundedBody(req: Request, max = 8192) {
  if (Number(req.headers.get("content-length")) > max)
    throw new Error("body-too-large");
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("body-too-large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    out.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(out);
}
async function hash(s: string) {
  return crypto.subtle.digest("SHA-256", encoder.encode(s));
}
async function safeEqual(a: string, b: string) {
  return crypto.subtle.timingSafeEqual(await hash(a), await hash(b));
}
async function signingKey(password: string) {
  return crypto.subtle.importKey(
    "raw",
    await hash(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function from64(s: string) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
}
export async function makeSession(password: string) {
  const payload =
    Math.floor(Date.now() / 1000 + 604800) + "." + crypto.randomUUID();
  const sig = await crypto.subtle.sign(
    "HMAC",
    await signingKey(password),
    encoder.encode(payload),
  );
  return payload + "." + b64(sig);
}
export async function hasSession(req: Request, password: string) {
  try {
    const token = req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("__Host-library="))
      ?.slice(15);
    if (!token) return false;
    const [expiry, uuid, sig, ...extra] = token.split(".");
    if (
      extra.length ||
      !sig ||
      !uuid ||
      !Number.isFinite(Number(expiry)) ||
      Number(expiry) < Date.now() / 1000 ||
      Number(expiry) > Date.now() / 1000 + 604900
    )
      return false;
    return crypto.subtle.verify(
      "HMAC",
      await signingKey(password),
      from64(sig),
      encoder.encode(expiry + "." + uuid),
    );
  } catch {
    return false;
  }
}
export async function getVideo(
  bucket: R2Bucket,
  id: string,
): Promise<Video | null> {
  if (!validID(id)) return null;
  const original = await bucket.head(id + ".mp4");
  if (!original) return null;
  const metadata = await bucket.get(metadataKey(id));
  let details: Record<string, unknown> = {};
  if (metadata) {
    try {
      details = await metadata.json();
    } catch {
      console.warn(JSON.stringify({ event: "invalid-metadata", id }));
    }
  }
  const poster = await bucket.head(`assets/${id}/poster.jpg`),
    playback = await bucket.head(`assets/${id}/playback.mp4`);
  return {
    id,
    key: original.key,
    title:
      typeof details.title === "string" ? details.title : "Screen recording",
    description:
      typeof details.description === "string" ? details.description : "",
    created: original.uploaded.toISOString(),
    size: original.size,
    duration:
      typeof details.duration === "number" ? details.duration : undefined,
    poster: poster ? `/assets/${id}/poster.jpg` : "/poster.svg",
    playback: playback ? `/assets/${id}/playback.mp4` : `/${original.key}`,
    revision: metadata?.etag ?? "initial",
    processingStatus:
      details.automation &&
      typeof details.automation === "object" &&
      "status" in details.automation &&
      typeof details.automation.status === "string"
        ? details.automation.status
        : undefined,
    transcriptKey:
      typeof details.transcriptKey === "string"
        ? details.transcriptKey
        : undefined,
    generatedTitle:
      details.automation &&
      typeof details.automation === "object" &&
      "generatedTitle" in details.automation &&
      typeof details.automation.generatedTitle === "string"
        ? details.automation.generatedTitle
        : undefined,
    generatedDescription:
      details.automation &&
      typeof details.automation === "object" &&
      "generatedDescription" in details.automation &&
      typeof details.automation.generatedDescription === "string"
        ? details.automation.generatedDescription
        : undefined,
  };
}
const fallbackPoster = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#000"/><rect x="90" y="72" width="1020" height="486" rx="10" fill="#111"/><circle cx="600" cy="285" r="58" fill="white"/><path d="M585 258L630 285L585 312Z" fill="#111"/><text x="600" y="428" font-family="system-ui,sans-serif" font-size="36" text-anchor="middle" fill="white">A recording from Evan Furniss</text></svg>`;
async function asset(req: Request, env: Env, key: string) {
  if (
    !/^(?:_capso_test_[a-z0-9]+\.txt|[a-z0-9_-]+\.(?:mp4|png|jpg|jpeg|gif|webp)|assets\/[a-z0-9_-]+\/(?:poster\.jpg|playback\.mp4)|assets\/fonts\/(?:departure-mono-1\.500\.woff2|OFL\.txt))$/.test(
      key,
    )
  )
    return new Response("Not found", { status: 404 });
  const range = req.method === "GET" ? req.headers.get("range") : null;
  let resolvedRange: { offset: number; length: number } | undefined;
  if (range) {
    const info = await env.VIDEOS.head(key);
    if (!info) return new Response("Not found", { status: 404 });
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () =>
      new Response("Range not satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${info.size}` },
      });
    if (!match || (!match[1] && !match[2]) || info.size === 0) return invalid();
    const start = match[1]
      ? Number(match[1])
      : Math.max(0, info.size - Number(match[2]));
    const end =
      match[1] && match[2]
        ? Math.min(Number(match[2]), info.size - 1)
        : info.size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start >= info.size ||
      start > end ||
      (!match[1] && Number(match[2]) <= 0)
    )
      return invalid();
    resolvedRange = { offset: start, length: end - start + 1 };
  }
  const object =
    req.method === "HEAD"
      ? await env.VIDEOS.head(key)
      : await env.VIDEOS.get(
          key,
          resolvedRange ? { range: resolvedRange } : undefined,
        );
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=60");
  headers.set("x-content-type-options", "nosniff");
  headers.set(
    "content-type",
    key.endsWith(".mp4")
      ? "video/mp4"
      : key.endsWith(".jpg")
        ? "image/jpeg"
        : (headers.get("content-type") ?? "application/octet-stream"),
  );
  if (new URL(req.url).searchParams.has("download"))
    headers.set(
      "content-disposition",
      `attachment; filename="${key.split("/").at(-1)}"`,
    );
  let status = 200;
  const r = object.range;
  if (
    range &&
    req.method !== "HEAD" &&
    r &&
    "offset" in r &&
    "length" in r &&
    r.offset !== undefined &&
    r.length !== undefined
  ) {
    status = 206;
    headers.set(
      "content-range",
      `bytes ${r.offset}-${r.offset + r.length - 1}/${object.size}`,
    );
    headers.set("content-length", String(r.length));
  } else {
    headers.set("content-length", String(object.size));
  }
  return new Response(
    req.method === "HEAD" ? null : (object as R2ObjectBody).body,
    { status, headers },
  );
}
export default {
  queue: handleUploadEvents,
  async fetch(req: Request, env: Env): Promise<Response> {
    const nonce = b64(crypto.getRandomValues(new Uint8Array(18)).buffer);
    const url = new URL(req.url),
      path = url.pathname;
    const page = (html: string, status = 200, privatePage = false) =>
      new Response(req.method === "HEAD" ? null : html, {
        status,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": privatePage
            ? "no-store"
            : "public, max-age=0, must-revalidate",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "x-robots-tag": "noindex, nofollow",
          "content-security-policy": `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' data:; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
        },
      });
    try {
      if (!["GET", "HEAD", "POST"].includes(req.method))
        return new Response("Method not allowed", {
          status: 405,
          headers: { allow: "GET, HEAD, POST" },
        });
      if (req.method === "POST" && req.headers.get("origin") !== url.origin)
        return new Response("Request origin rejected", { status: 403 });
      if (path === "/health")
        return Response.json(
          { ok: true },
          { headers: { "cache-control": "no-store" } },
        );
      if (path === "/robots.txt")
        return new Response("User-agent: *\nDisallow: /\n", {
          headers: { "content-type": "text/plain" },
        });
      if (path === "/poster.svg")
        return new Response(req.method === "HEAD" ? null : fallbackPoster, {
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public,max-age=3600",
            "content-security-policy":
              "default-src 'none'; style-src 'unsafe-inline'",
          },
        });
      if (path === "/") return redirect("/library");
      if (path === "/login") {
        if (!env.ADMIN_PASSWORD)
          return page(
            shell(
              "Library unavailable",
              "<h1>Library sign-in is being set up</h1>",
              env.OWNER_NAME,
              nonce,
            ),
            503,
            true,
          );
        if (req.method === "POST") {
          const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
          if (
            !(await env.LOGIN_LIMIT.limit({ key: ip }).then((r) => r.success))
          )
            return page(
              loginView(
                env.OWNER_NAME,
                nonce,
                "Too many attempts. Try again in one minute.",
              ),
              429,
              true,
            );
          const fields = new URLSearchParams(await boundedBody(req));
          const password = fields.get("password") ?? "";
          if (
            !password ||
            password.length > 256 ||
            !(await safeEqual(password, env.ADMIN_PASSWORD))
          )
            return page(
              loginView(
                env.OWNER_NAME,
                nonce,
                "Check your password and try again.",
              ),
              401,
              true,
            );
          const token = await makeSession(env.ADMIN_PASSWORD);
          return redirect(
            "/library",
            `__Host-library=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800`,
          );
        }
        return page(loginView(env.OWNER_NAME, nonce), 200, true);
      }
      if (path.startsWith("/library") || path === "/logout") {
        if (!env.ADMIN_PASSWORD || !(await hasSession(req, env.ADMIN_PASSWORD)))
          return redirect("/login");
        if (path === "/logout" && req.method === "POST")
          return redirect(
            "/login",
            "__Host-library=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0",
          );
        const edit = /^\/library\/edit\/([a-z0-9_-]+)$/.exec(path);
        if (edit) {
          const v = await getVideo(env.VIDEOS, edit[1]);
          if (!v)
            return page(
              shell(
                "Video not found",
                '<h1>Video not found</h1><a href="/library">Return to your library</a>',
                env.OWNER_NAME,
                nonce,
              ),
              404,
              true,
            );
          if (req.method === "POST") {
            const fields = new URLSearchParams(await boundedBody(req, 20000));
            const title = (fields.get("title") ?? "").trim(),
              description = (fields.get("description") ?? "").trim();
            if (!title || title.length > 160 || description.length > 3000)
              return new Response(
                "Use a title up to 160 characters and a description up to 3000 characters.",
                { status: 400 },
              );
            const revision = fields.get("revision");
            if (revision !== v.revision)
              return new Response(
                "This video was edited in another tab. Reload before saving.",
                { status: 409 },
              );
            const old = await env.VIDEOS.get(metadataKey(v.id));
            if ((old?.etag ?? "initial") !== revision)
              return new Response("This video changed. Reload before saving.", {
                status: 409,
              });
            const details = old
              ? await old.json<Record<string, unknown>>()
              : {};
            const saved = await env.VIDEOS.put(
              metadataKey(v.id),
              JSON.stringify({
                ...details,
                title,
                description,
                manualDetails: true,
              }),
              {
                httpMetadata: { contentType: "application/json" },
                onlyIf: old
                  ? { etagMatches: old.etag }
                  : { etagDoesNotMatch: "*" },
              },
            );
            if (!saved)
              return new Response("This video changed. Reload before saving.", {
                status: 409,
              });
            return redirect(`/library/edit/${v.id}?saved=1`);
          }
          let transcript = "";
          if (
            v.transcriptKey &&
            new RegExp(`^${v.id}/[a-f0-9]{32}/transcript\\.json$`).test(
              v.transcriptKey,
            )
          ) {
            const object = await env.ANALYSIS.get(v.transcriptKey);
            if (object) {
              const details = await object.json<{ text?: unknown }>();
              if (typeof details.text === "string") transcript = details.text;
            }
          }
          return page(
            editView(
              v,
              env.OWNER_NAME,
              nonce,
              url.searchParams.has("saved"),
              transcript,
            ),
            200,
            true,
          );
        }
        if (path === "/library" && req.method !== "POST") {
          const cursor = url.searchParams.get("cursor") ?? undefined;
          if (cursor && cursor.length > 2048)
            return new Response("Invalid cursor", { status: 400 });
          const list = await env.VIDEOS.list({
            limit: 100,
            cursor,
            delimiter: "/",
          });
          const videos = (
            await Promise.all(
              list.objects
                .filter((o) => /^[a-z0-9_-]+\.mp4$/.test(o.key))
                .map((o) => getVideo(env.VIDEOS, o.key.slice(0, -4))),
            )
          )
            .filter((v): v is Video => v !== null)
            .sort((a, b) => b.created.localeCompare(a.created));
          return page(
            libraryView(
              videos,
              env.OWNER_NAME,
              nonce,
              list.truncated ? list.cursor : "",
            ),
            200,
            true,
          );
        }
        return new Response("Not found", { status: 404 });
      }
      const detailsRoute = /^\/v\/([a-z0-9_-]+)\/details$/.exec(path);
      if (detailsRoute && req.method !== "POST") {
        const v = await getVideo(env.VIDEOS, detailsRoute[1]);
        if (!v) return new Response("Video not found", { status: 404 });
        return Response.json(
          {
            title: v.title,
            description: v.description,
            status: v.processingStatus ?? "idle",
          },
          {
            headers: {
              "cache-control": "no-store",
              "x-content-type-options": "nosniff",
            },
          },
        );
      }
      const id = keyFromPage(path);
      if (id && req.method !== "POST") {
        const v = await getVideo(env.VIDEOS, id);
        if (!v)
          return page(
            shell(
              "Video not found",
              "<h1>This video is unavailable</h1><p>The link may have expired or the video may have been removed.</p>",
              env.OWNER_NAME,
              nonce,
            ),
            404,
          );
        return page(videoView(v, env.OWNER_NAME, env.PUBLIC_ORIGIN, nonce));
      }
      if (req.method === "POST")
        return new Response("Not found", { status: 404 });
      return await asset(req, env, path.slice(1));
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "viewer-request-failed",
          name: error instanceof Error ? error.name : "unknown",
        }),
      );
      return new Response(
        "Unable to complete this request. Please try again.",
        { status: 503, headers: errorHeaders },
      );
    }
  },
} satisfies ExportedHandler<Env>;
