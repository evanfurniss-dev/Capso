import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import {
  applyGeneratedDetails,
  parseGeneratedDetails,
  hasUsableTranscript,
  DETAILS_INSTRUCTIONS,
  type VideoTranscript,
  type AudioPart,
  eventVideoID,
  preparedAudio,
} from "./automation";
import { mp4Duration } from "./mp4";

export interface EnrichmentParams {
  id: string;
  sourceETag: string;
}
const validID = /^[a-z0-9][a-z0-9_-]{5,63}$/;
const metadataKey = (id: string) => `metadata/${id}.json`;
const retry = {
  retries: {
    limit: 3,
    delay: "5 seconds" as const,
    backoff: "exponential" as const,
  },
  timeout: "5 minutes" as const,
};
async function versionHash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 32);
}
async function currentSource(env: Env, p: EnrichmentParams) {
  const source = await env.VIDEOS.head(p.id + ".mp4");
  if (!source || source.etag !== p.sourceETag)
    throw new Error("Video source changed");
  return source;
}
async function patchMetadata(
  env: Env,
  p: EnrichmentParams,
  change: (current: Record<string, unknown>) => Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await currentSource(env, p);
    const old = await env.VIDEOS.get(metadataKey(p.id));
    const current = old ? await old.json<Record<string, unknown>>() : {};
    const result = await env.VIDEOS.put(
      metadataKey(p.id),
      JSON.stringify(change(current)),
      {
        httpMetadata: { contentType: "application/json" },
        onlyIf: old ? { etagMatches: old.etag } : { etagDoesNotMatch: "*" },
      },
    );
    if (result) return;
  }
  throw new Error("Video details changed during update");
}
async function status(env: Env, p: EnrichmentParams, state: string) {
  await patchMetadata(env, p, (current) => ({
    ...current,
    automation: {
      ...(current.automation && typeof current.automation === "object"
        ? current.automation
        : {}),
      status: state,
      sourceETag: p.sourceETag,
    },
  }));
}
function base64(bytes: Uint8Array) {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192)
    parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(parts.join(""));
}
async function boundedAudio(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 4 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Audio part exceeds processing limit");
    }
    chunks.push(value);
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    data.set(part, offset);
    offset += part.length;
  }
  return data;
}
async function loadParts(
  env: Env,
  p: EnrichmentParams,
): Promise<{ parts: AudioPart[]; noAudio: boolean }> {
  const original = await currentSource(env, p),
    object = await env.VIDEOS.get(metadataKey(p.id));
  const meta = object ? await object.json<Record<string, unknown>>() : {};
  if (typeof meta.sourceETag === "string" && meta.sourceETag !== p.sourceETag)
    throw new Error("Waiting for the current upload manifest");
  if (meta.hasAudio === false) return { parts: [], noAudio: true };
  const duration = await mp4Duration(env.VIDEOS, original.key, original.size);
  if (!duration) throw new Error("Recording duration is unavailable");
  const audioDuration =
    typeof meta.audioDuration === "number" &&
    Number.isFinite(meta.audioDuration) &&
    meta.audioDuration > 0 &&
    meta.audioDuration <= duration + 0.25 &&
    meta.audioDuration <= 7200
      ? meta.audioDuration
      : duration;
  const prepared = preparedAudio(meta.audioChunks, p.id, audioDuration);
  if (prepared && meta.sourceETag === p.sourceETag)
    return { parts: prepared, noAudio: false };
  if (meta.sourceETag === p.sourceETag && meta.audioPreparationFailed !== true)
    throw new Error("Waiting for prepared audio");
  const playback = await env.VIDEOS.head(`assets/${p.id}/playback.mp4`);
  const source = playback ?? original;
  if (duration > 600 || source.size >= 100_000_000)
    throw new Error("Prepared audio is required for this recording");
  return {
    noAudio: false,
    parts: Array.from({ length: Math.ceil(duration / 60) }, (_, index) => ({
      key: source.key,
      start: index * 60,
      duration: Math.min(60, duration - index * 60),
      source: "extract" as const,
    })),
  };
}
export class VideoEnrichment extends WorkflowEntrypoint<Env, EnrichmentParams> {
  async run(event: WorkflowEvent<EnrichmentParams>, step: WorkflowStep) {
    const p = event.payload;
    if (!validID.test(p.id) || !p.sourceETag)
      throw new Error("Invalid processing request");
    const prefix = await step.do(
      "analysis version",
      async () => `${p.id}/${await versionHash(p.sourceETag)}`,
    );
    try {
      await step.sleep("allow upload assets to finish", "30 seconds");
      const manifest = await step.do(
        "load audio manifest",
        {
          retries: { limit: 8, delay: "15 seconds", backoff: "constant" },
          timeout: "1 minute",
        },
        async () => loadParts(this.env, p),
      );
      if (manifest.noAudio) {
        await step.do("mark no audio", async () =>
          status(this.env, p, "no_speech"),
        );
        return { status: "no_speech" };
      }
      await step.do("mark transcribing", async () =>
        status(this.env, p, "transcribing"),
      );
      for (let index = 0; index < manifest.parts.length; index++) {
        await step.do(`transcribe audio ${index}`, retry, async () => {
          await currentSource(this.env, p);
          const key = `${prefix}/part-${index}.json`;
          if (await this.env.ANALYSIS.head(key)) return { key };
          const part = manifest.parts[index],
            source = await this.env.VIDEOS.get(part.key);
          if (!source) throw new Error("Audio source is unavailable");
          const stream =
            part.source === "prepared"
              ? source.body
              : await this.env.MEDIA.input(source.body)
                  .output({
                    mode: "audio",
                    time: `${part.start}s`,
                    duration: `${part.duration}s`,
                  })
                  .media();
          const audio = await boundedAudio(stream);
          const result = await this.env.AI.run(
            "@cf/openai/whisper-large-v3-turbo",
            {
              audio: base64(audio),
              vad_filter: true,
              condition_on_previous_text: false,
              hallucination_silence_threshold: 2,
            },
          );
          const text = result.text.trim();
          const segments = (result.segments ?? [])
            .filter(
              (s) =>
                typeof s.start === "number" &&
                typeof s.end === "number" &&
                typeof s.text === "string" &&
                (s.no_speech_prob ?? 0) < 0.6,
            )
            .map((s) => ({
              start: part.start + s.start!,
              end: part.start + s.end!,
              text: s.text!.trim(),
            }));
          const usable =
            hasUsableTranscript(text) &&
            (result.transcription_info?.duration_after_vad ?? 1) > 0;
          await this.env.ANALYSIS.put(
            key,
            JSON.stringify({
              text: usable ? text : "",
              segments: usable ? segments : [],
            }),
            { httpMetadata: { contentType: "application/json" } },
          );
          return { key };
        });
      }
      const transcriptKey = await step.do("assemble transcript", async () => {
        const transcript: VideoTranscript = { text: "", segments: [] };
        const texts: string[] = [];
        for (let i = 0; i < manifest.parts.length; i++) {
          const object = await this.env.ANALYSIS.get(
            `${prefix}/part-${i}.json`,
          );
          if (!object) throw new Error("Transcript part is unavailable");
          const part = await object.json<VideoTranscript>();
          texts.push(part.text);
          transcript.segments.push(...part.segments);
        }
        transcript.text = texts.filter(Boolean).join("\n");
        if (transcript.text.length > 400000)
          throw new Error("Transcript exceeds the summary limit");
        const key = `${prefix}/transcript.json`;
        await this.env.ANALYSIS.put(key, JSON.stringify(transcript), {
          httpMetadata: { contentType: "application/json" },
        });
        return key;
      });
      const usable = await step.do("check speech", async () => {
        const data = await this.env.ANALYSIS.get(transcriptKey);
        return data
          ? hasUsableTranscript((await data.json<VideoTranscript>()).text)
          : false;
      });
      if (!usable) {
        await step.do("mark no speech", async () =>
          status(this.env, p, "no_speech"),
        );
        return { status: "no_speech" };
      }
      await step.do("mark summarizing", async () =>
        status(this.env, p, "summarizing"),
      );
      const detailsKey = await step.do(
        "generate title and description",
        retry,
        async () => {
          const transcript = await this.env.ANALYSIS.get(transcriptKey);
          if (!transcript) throw new Error("Transcript is unavailable");
          const { text } = await transcript.json<VideoTranscript>();
          const result = await this.env.AI.run("@cf/openai/gpt-oss-20b", {
            messages: [
              { role: "system", content: DETAILS_INSTRUCTIONS },
              { role: "user", content: JSON.stringify({ transcript: text }) },
            ],
            reasoning_effort: "low",
            max_tokens: 1200,
            response_format: { type: "json_object" },
          });
          let content: unknown;
          if ("choices" in result)
            content = result.choices?.[0]?.message?.content;
          else if ("output" in result)
            content = result.output
              ?.filter((item) => item.type === "message")
              .flatMap((item) =>
                "content" in item && Array.isArray(item.content)
                  ? item.content
                  : [],
              )
              .filter((item) => item.type === "output_text")
              .map((item) => ("text" in item ? item.text : ""))
              .join("");
          const details = parseGeneratedDetails(content);
          const key = `${prefix}/details.json`;
          await this.env.ANALYSIS.put(key, JSON.stringify(details), {
            httpMetadata: { contentType: "application/json" },
          });
          return key;
        },
      );
      await step.do("publish automatic details", retry, async () => {
        const object = await this.env.ANALYSIS.get(detailsKey);
        if (!object) throw new Error("Generated details are unavailable");
        const details = parseGeneratedDetails(await object.json());
        await patchMetadata(this.env, p, (current) => ({
          ...applyGeneratedDetails(current, details, p.sourceETag),
          transcriptKey,
        }));
      });
      return { status: "ready", transcriptKey };
    } catch (error) {
      await step.do("record processing failure", async () => {
        try {
          await status(this.env, p, "failed");
        } catch {
          console.warn(
            JSON.stringify({
              event: "enrichment-source-unavailable",
              id: p.id,
            }),
          );
        }
      });
      throw error;
    }
  }
}
export async function startEnrichment(env: Env, id: string) {
  const source = await env.VIDEOS.head(id + ".mp4");
  if (!source) return;
  const workflowID = id + "-" + (await versionHash(source.etag));
  try {
    await env.ENRICHMENT.create({
      id: workflowID,
      params: { id, sourceETag: source.etag },
    });
  } catch {
    const existing = await env.ENRICHMENT.get(workflowID);
    await existing.status();
  }
}
async function cleanDeletedVideo(env: Env, id: string) {
  if (await env.VIDEOS.head(id + ".mp4")) return;
  for (const [bucket, prefix] of [
    [env.VIDEOS, `assets/${id}/`],
    [env.ANALYSIS, `${id}/`],
  ] as const) {
    let cursor: string | undefined;
    do {
      if (await env.VIDEOS.head(id + ".mp4")) return;
      const page = await bucket.list({ prefix, cursor });
      if (page.objects.length)
        await bucket.delete(page.objects.map((o) => o.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
}
export async function handleUploadEvents(
  batch: MessageBatch<unknown>,
  env: Env,
) {
  for (const message of batch.messages) {
    try {
      const event = eventVideoID(message.body);
      if (event) {
        if (event.deleted) await cleanDeletedVideo(env, event.id);
        else await startEnrichment(env, event.id);
      }
      message.ack();
    } catch {
      console.warn(JSON.stringify({ event: "enrichment-trigger-retry" }));
      message.retry({ delaySeconds: 30 });
    }
  }
}
