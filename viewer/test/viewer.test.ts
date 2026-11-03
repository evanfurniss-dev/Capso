import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { videoView } from "../src/views.ts";
const password = "test-only-library-password-1234",
  origin = "https://example.test";
let mf: Miniflare, cookie: string;
before(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "viewer",
          modules: true,
          scriptPath: "dist/index.js",
          compatibilityDate: "2026-11-03",
          compatibilityFlags: ["nodejs_compat"],
          r2Buckets: ["VIDEOS", "ANALYSIS"],
          bindings: {
            ADMIN_PASSWORD: password,
            OWNER_NAME: "Evan Furniss",
            PUBLIC_ORIGIN: origin,
          },
          ratelimits: {
            LOGIN_LIMIT: {
              namespace_id: "1001",
              simple: { limit: 20, period: 60 },
            },
          },
        },
      ],
    }),
  );
  const b = await mf.getR2Bucket("VIDEOS");
  await b.put("ai6uo2q.mp4", "0123456789abcdefghijklmnopqrstuvwxyz", {
    httpMetadata: { contentType: "video/mp4" },
  });
  await b.put("assets/ai6uo2q/poster.jpg", "poster", {
    httpMetadata: { contentType: "image/jpeg" },
  });
  await b.put("assets/ai6uo2q/playback.mp4", "playback", {
    httpMetadata: { contentType: "video/mp4" },
  });
  await b.put(
    "metadata/ai6uo2q.json",
    JSON.stringify({
      title: "Walkthrough",
      description: "A video description.",
      automation: { status: "transcribing" },
      transcriptKey: "ai6uo2q/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/transcript.json",
    }),
  );
  const analysis = await mf.getR2Bucket("ANALYSIS");
  await analysis.put(
    "ai6uo2q/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/transcript.json",
    JSON.stringify({ text: "Private transcript example.", segments: [] }),
  );
});
after(async () => {
  await mf.dispose();
});
const request = (
  path: string,
  init?: Parameters<Miniflare["dispatchFetch"]>[1],
) => mf.dispatchFetch(origin + path, { ...init, redirect: "manual" });
test("public viewer serves complete OG metadata, poster and playback URL", async () => {
  const r = await request("/v/ai6uo2q");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /og:title" content="Walkthrough"/);
  assert.match(html, /og:description" content="A video description./);
  assert.match(html, /og:image/);
  assert.match(html, /assets\/ai6uo2q\/playback.mp4/);
  assert.match(html, /poster="\/assets\/ai6uo2q\/poster.jpg"/);
  assert.match(
    r.headers.get("content-security-policy")!,
    /frame-ancestors 'none'/,
  );
});
test("unknown IDs return 404 and bucket metadata stays private through the Worker", async () => {
  assert.equal((await request("/v/doesnotexist")).status, 404);
  assert.equal((await request("/metadata/ai6uo2q.json")).status, 404);
  assert.equal((await request("/library")).status, 303);
});
test("login rejects cross-site and incorrect passwords; session permits the private library", async () => {
  assert.equal(
    (
      await request("/login", {
        method: "POST",
        headers: { Origin: "https://attacker.test" },
        body: "password=" + password,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/login", {
        method: "POST",
        headers: { Origin: origin },
        body: "password=incorrect-password",
      })
    ).status,
    401,
  );
  const r = await request("/login", {
    method: "POST",
    headers: { Origin: origin },
    body: "password=" + password,
  });
  assert.equal(r.status, 303);
  cookie = r.headers.get("set-cookie")!.split(";")[0];
  assert.match(
    r.headers.get("set-cookie")!,
    /Secure; HttpOnly; SameSite=Strict/,
  );
  const library = await request("/library", { headers: { Cookie: cookie } });
  assert.equal(library.status, 200);
  assert.match(await library.text(), /Walkthrough/);
  assert.equal(library.headers.get("cache-control"), "no-store");
});
test("editing requires a session, saves text and rejects stale writes", async () => {
  assert.equal(
    (
      await request("/library/edit/ai6uo2q", {
        method: "POST",
        headers: { Origin: origin },
        body: "title=Oops",
      })
    ).status,
    303,
  );
  const b = await mf.getR2Bucket("VIDEOS"),
    old = await b.head("metadata/ai6uo2q.json");
  const fields = new URLSearchParams({
    title: "Updated title",
    description: "Updated description",
    revision: old!.etag,
  });
  const init = {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie },
    body: fields.toString(),
  };
  assert.equal((await request("/library/edit/ai6uo2q", init)).status, 303);
  const storedDetails = await (await b.get("metadata/ai6uo2q.json"))!.json<{
    manualDetails: boolean;
  }>();
  assert.equal(storedDetails.manualDetails, true);
  assert.match(
    await (await request("/v/ai6uo2q")).text(),
    /og:title" content="Updated title/,
  );
  assert.equal((await request("/library/edit/ai6uo2q", init)).status, 409);
});
test("media requests preserve byte ranges and HEAD semantics", async () => {
  const r = await request("/ai6uo2q.mp4", { headers: { Range: "bytes=2-5" } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("content-range"), "bytes 2-5/36");
  assert.equal(await r.text(), "2345");
  const head = await request("/ai6uo2q.mp4", { method: "HEAD" });
  assert.equal(head.headers.get("content-length"), "36");
  assert.equal(await head.text(), "");
});
test("titles and descriptions cannot inject scripts or break HTML attributes", () => {
  const html = videoView(
    {
      id: "ai6uo2q",
      key: "ai6uo2q.mp4",
      title: "<script>alert(1)</script>",
      description: '" onload="alert(1)',
      created: new Date().toISOString(),
      size: 10,
      poster: "/poster.svg",
      playback: "/ai6uo2q.mp4",
      revision: "v1",
    },
    "Owner",
    origin,
    "test-nonce",
  );
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /script nonce="test-nonce"/);
});

test("suffix and invalid ranges use correct HTTP semantics", async () => {
  const suffix = await request("/ai6uo2q.mp4", {
    headers: { Range: "bytes=-4" },
  });
  assert.equal(suffix.status, 206);
  assert.equal(suffix.headers.get("content-range"), "bytes 32-35/36");
  assert.equal(await suffix.text(), "wxyz");
  const invalid = await request("/ai6uo2q.mp4", {
    headers: { Range: "bytes=100-200" },
  });
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("content-range"), "bytes */36");
});

test("public detail polling omits transcripts while the signed-in editor can read them", async () => {
  const response = await request("/v/ai6uo2q/details");
  const details = (await response.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(details).sort(), [
    "description",
    "status",
    "title",
  ]);
  assert.doesNotMatch(
    await (await request("/v/ai6uo2q")).text(),
    /Private transcript example/,
  );
  const editor = await request("/library/edit/ai6uo2q", {
    headers: { Cookie: cookie },
  });
  assert.equal(editor.status, 200);
  assert.match(await editor.text(), /Private transcript example/);
});
