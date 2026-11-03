import { test } from "node:test";
import assert from "node:assert/strict";
import { eventVideoID, preparedAudio } from "../src/automation.ts";
import { durationFromMP4 } from "../src/mp4.ts";
test("upload notifications accept original recordings and metadata while ignoring derivatives", () => {
  const make = (
    key: string,
    action = "PutObject",
    bucket = "evan-screencap",
  ) => ({ action, bucket, object: { key } });
  assert.deepEqual(eventVideoID(make("ai6uo2q.mp4")), {
    id: "ai6uo2q",
    deleted: false,
  });
  assert.deepEqual(eventVideoID(make("metadata/ai6uo2q.json")), {
    id: "ai6uo2q",
    deleted: false,
  });
  assert.deepEqual(eventVideoID(make("ai6uo2q.mp4", "DeleteObject")), {
    id: "ai6uo2q",
    deleted: true,
  });
  assert.deepEqual(eventVideoID(make("ai6uo2q.mp4", "LifecycleDeletion")), {
    id: "ai6uo2q",
    deleted: true,
  });
  for (const value of [
    make("assets/ai6uo2q/playback.mp4"),
    make("../ai6uo2q.mp4"),
    make("ai6uo2q.mp4", "GetObject"),
    make("metadata/ai6uo2q.json", "LifecycleDeletion"),
    make("ai6uo2q.mp4", "PutObject", "another-bucket"),
    null,
  ])
    assert.equal(eventVideoID(value), null);
});
test("audio plans cover the entire recording without gaps, overlaps or cross-video keys", () => {
  const parts = [
    { key: "assets/ai6uo2q/audio-0000.m4a", start: 0, duration: 60 },
    { key: "assets/ai6uo2q/audio-0001.m4a", start: 60, duration: 25 },
  ];
  assert.equal(preparedAudio(parts, "ai6uo2q", 85)?.length, 2);
  assert.equal(preparedAudio(parts, "otherid", 85), null);
  assert.equal(preparedAudio(parts, "ai6uo2q", 100), null);
  assert.equal(
    preparedAudio([parts[0], { ...parts[1], start: 59 }], "ai6uo2q", 85),
    null,
  );
  assert.equal(
    preparedAudio([{ ...parts[0], duration: 0 }], "ai6uo2q", 0),
    null,
  );
});
function box(type: string, body: Uint8Array) {
  const b = Buffer.alloc(8 + body.length);
  b.writeUInt32BE(b.length);
  b.write(type, 4);
  b.set(body, 8);
  return b;
}
function movie(version: number, tail = false) {
  const mvhd = Buffer.alloc(version === 1 ? 32 : 20);
  mvhd[0] = version;
  if (version === 1) {
    mvhd.writeUInt32BE(1000, 20);
    mvhd.writeBigUInt64BE(85500n, 24);
  } else {
    mvhd.writeUInt32BE(1000, 12);
    mvhd.writeUInt32BE(85500, 16);
  }
  const moov = box("moov", box("mvhd", mvhd)),
    mdat = box("mdat", Buffer.alloc(100));
  return Buffer.concat([
    box("ftyp", Buffer.alloc(8)),
    ...(tail ? [mdat, moov] : [moov, mdat]),
  ]);
}
for (const version of [0, 1])
  for (const tail of [false, true])
    test(`MP4 duration parses version ${version}, moov at ${tail ? "end" : "start"}, with small range reads`, async () => {
      const b = movie(version, tail);
      let maxRead = 0;
      const value = await durationFromMP4(b.length, async (offset, length) => {
        maxRead = Math.max(maxRead, length);
        return new DataView(
          Uint8Array.from(b.subarray(offset, offset + length)).buffer,
        );
      });
      assert.equal(value, 85.5);
      assert.ok(maxRead <= 32);
    });
test("invalid MP4 box lengths return no duration", async () => {
  const b = Buffer.alloc(16);
  b.writeUInt32BE(4);
  b.write("moov", 4);
  assert.equal(
    await durationFromMP4(
      b.length,
      async (o, n) =>
        new DataView(Uint8Array.from(b.subarray(o, o + n)).buffer),
    ),
    null,
  );
});
