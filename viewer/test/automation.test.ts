import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseGeneratedDetails,
  applyGeneratedDetails,
  hasUsableTranscript,
} from "../src/automation.ts";
const details = {
  title: "Configure recording settings in Capso",
  description:
    "A walkthrough of recording quality and sharing settings in Capso.",
};
test("model output must contain bounded title and description strings", () => {
  assert.deepEqual(parseGeneratedDetails(JSON.stringify(details)), details);
  assert.deepEqual(
    parseGeneratedDetails("```json\n" + JSON.stringify(details) + "\n```"),
    details,
  );
  for (const value of [
    "not JSON",
    { title: "x" },
    { ...details, title: "x".repeat(161) },
    { ...details, description: "x".repeat(601) },
  ])
    assert.throws(() => parseGeneratedDetails(value));
});
test("default details receive generated text while video metadata is preserved", () => {
  const current = { title: "Screen recording", description: "", duration: 12 };
  const next = applyGeneratedDetails(current, details, "source-etag");
  assert.equal(next.title, details.title);
  assert.equal(next.description, details.description);
  assert.equal(next.duration, 12);
  assert.equal(current.title, "Screen recording");
});
test("manual edits always survive a delayed or retried model result", () => {
  const current = {
    title: "My edited title",
    description: "My edited description",
    manualDetails: true,
  };
  const next = applyGeneratedDetails(current, details, "source-etag");
  assert.equal(next.title, current.title);
  assert.equal(next.description, current.description);
});
test("existing custom details are preserved even before edit markers were added", () => {
  const next = applyGeneratedDetails(
    { title: "Custom title", description: "Custom description" },
    details,
    "source-etag",
  );
  assert.equal(next.title, "Custom title");
  assert.equal(next.description, "Custom description");
});
test("a regenerated draft can replace previous automatic text", () => {
  const first = applyGeneratedDetails(
    { title: "Screen recording" },
    details,
    "v1",
  );
  const revised = {
    title: "Adjust capture quality in Capso",
    description: "The recording explains how to adjust video export quality.",
  };
  const next = applyGeneratedDetails(first, revised, "v2");
  assert.equal(next.title, revised.title);
});
test("silent and empty transcripts do not produce invented summaries", () => {
  assert.equal(hasUsableTranscript(""), false);
  assert.equal(hasUsableTranscript("..."), false);
  assert.equal(hasUsableTranscript("Hello."), false);
  assert.equal(
    hasUsableTranscript("Here is how to change the recording quality."),
    true,
  );
});
