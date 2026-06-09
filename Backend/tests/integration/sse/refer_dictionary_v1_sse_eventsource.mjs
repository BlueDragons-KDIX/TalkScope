#!/usr/bin/env node

/**
 * GET版SSE endpointをfetch streamで叩き、chunk到着ごとのlapと文字化けを確認する。
 *
 * Usage:
 *   cd Backend
 *   uv run uvicorn main:app --reload
 *   node tests/integration/sse/refer_dictionary_v1_sse_eventsource.mjs
 *
 * Optional:
 *   SSE_BASE_URL=http://127.0.0.1:8000 node tests/integration/sse/refer_dictionary_v1_sse_eventsource.mjs
 */

const BASE_URL = process.env.SSE_BASE_URL ?? "http://127.0.0.1:8000";
const ENDPOINT = "/analysis/refer_dictionary_get_scores/stream";

const PHASES = [
  {
    name: "phase 1: first_seen",
    text: "量子計算と画像認識と音声合成",
  },
  {
    name: "phase 2: mixed",
    text: "量子計算と画像認識と構文解析と知識検索",
  },
  {
    name: "phase 3: cached",
    text: "量子計算と画像認識と音声合成と構文解析と知識検索",
  },
];

function nowSeconds() {
  return performance.now() / 1000;
}

function buildUrl(text) {
  const url = new URL(ENDPOINT, BASE_URL);
  url.searchParams.set("text", text);
  return url;
}

function sourceCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const source = String(entry?.source ?? "unknown");
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return counts;
}

function assertNoMojibake(eventData) {
  if (eventData.includes("\uFFFD")) {
    throw new Error("UTF-8 replacement character was found in SSE data");
  }
  if (eventData.includes("\\u")) {
    throw new Error("Unicode escape was found; ensure_ascii=False may not be applied");
  }
}

function hasJapaneseText(value) {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(String(value ?? ""));
}

function parseSseEvent(rawEvent) {
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (dataLines.length === 0) {
    return {
      eventData: "",
      payload: [],
    };
  }

  const eventData = dataLines.join("\n");
  assertNoMojibake(eventData);
  const payload = JSON.parse(eventData);
  if (!Array.isArray(payload)) {
    throw new Error("SSE payload must be an array");
  }
  return {
    eventData,
    payload,
  };
}

function recordPayload({ chunks, entries, eventData, payload, elapsed, lap }) {
  const parsedAsJson = Array.isArray(payload);
  const japaneseTerms = payload
    .filter((entry) => hasJapaneseText(entry?.term))
    .map((entry) => entry.term);
  const japaneseDescriptions = payload
    .filter((entry) => hasJapaneseText(entry?.description))
    .map((entry) => entry.description);
  const restoredJapanese =
    japaneseTerms.length > 0 || japaneseDescriptions.length > 0;

  chunks.push({
    index: chunks.length + 1,
    elapsed,
    lap,
    count: payload.length,
    parsedAsJson,
    restoredJapanese,
  });
  entries.push(...payload);

  console.log(
    `  chunk ${chunks.length}: elapsed=${elapsed.toFixed(3)} sec, ` +
      `lap=${lap.toFixed(3)} sec, entries=${payload.length}`,
  );
  console.log(
    `    json: parsed=${parsedAsJson}, ` +
      `rawHasUnicodeEscape=${eventData.includes("\\u")}, ` +
      `restoredJapanese=${restoredJapanese}`,
  );
  console.log(`    raw data: ${eventData}`);
  if (japaneseTerms.length > 0) {
    console.log(`    restored terms: ${japaneseTerms.join(", ")}`);
  }
  if (japaneseDescriptions.length > 0) {
    console.log(`    restored descriptions: ${japaneseDescriptions.join(" / ")}`);
  }
  for (const entry of payload) {
    console.log(
      `    - ${entry.term} source=${entry.source} score=${entry.score}`,
    );
  }
}

async function runPhase(phase) {
  const url = buildUrl(phase.text);
  const startedAt = nowSeconds();
  let lastAt = startedAt;
  const chunks = [];
  const entries = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";

  console.log(`\n[${phase.name}]`);
  console.log(`url: ${url.toString()}`);
  console.log(`text: ${phase.text}`);

  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
    },
  });
  if (!response.ok) {
    throw new Error(`${phase.name} failed: status=${response.status}`);
  }
  if (!response.body) {
    throw new Error(`${phase.name} response body is empty`);
  }

  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    const receivedAt = nowSeconds();
    if (done) {
      break;
    }

    const decoded = decoder.decode(value, { stream: true });
    assertNoMojibake(decoded);
    buffer += decoded;

    while (buffer.includes("\n\n")) {
      const separatorIndex = buffer.indexOf("\n\n");
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      if (!rawEvent.trim()) {
        continue;
      }

      const { eventData, payload } = parseSseEvent(rawEvent);
      const elapsed = receivedAt - startedAt;
      const lap = receivedAt - lastAt;
      lastAt = receivedAt;
      recordPayload({ chunks, entries, eventData, payload, elapsed, lap });
    }
  }

  const tail = decoder.decode();
  assertNoMojibake(tail);
  buffer += tail;
  if (buffer.trim()) {
    throw new Error(`Unparsed SSE buffer remained: ${buffer}`);
  }
  if (chunks.length === 0) {
    throw new Error(`${phase.name} ended before receiving any SSE message`);
  }

  const endedAt = nowSeconds();
  const counts = sourceCounts(entries);
  console.log(`phase elapsed: ${(endedAt - startedAt).toFixed(3)} sec`);
  console.log(`chunks: ${chunks.length}`);
  console.log(`entries: ${entries.length}`);
  console.log(
    `sources: db=${counts.get("db") ?? 0}, ` +
      `llm=${counts.get("llm") ?? 0}, ` +
      `unknown=${counts.get("unknown") ?? 0}`,
  );

  return {
    name: phase.name,
    text: phase.text,
    startedAt,
    endedAt,
    chunks,
    entries,
  };
}

function warnPhaseSources(results) {
  const firstSources = sourceCounts(results[0].entries);
  const mixedSources = sourceCounts(results[1].entries);
  const cachedSources = sourceCounts(results[2].entries);

  if ((firstSources.get("llm") ?? 0) < 1) {
    console.warn("WARN: 初出フェーズで LLM 取得がありません。既にDBにキャッシュされている可能性があります。");
  }
  if ((mixedSources.get("db") ?? 0) < 1) {
    console.warn("WARN: 混合フェーズで DB 取得がありません。DB状態を確認してください。");
  }
  if ((mixedSources.get("llm") ?? 0) < 1) {
    console.warn("WARN: 混合フェーズで LLM 取得がありません。既にDBにキャッシュされている可能性があります。");
  }
  if ((cachedSources.get("db") ?? 0) < 1) {
    console.warn("WARN: 既出フェーズで DB 取得がありません。DB状態を確認してください。");
  }
  if ((cachedSources.get("llm") ?? 0) !== 0) {
    console.warn("WARN: 既出フェーズで LLM 取得が発生しています。保存処理やDB状態を確認してください。");
  }
}

function printSummary(results) {
  console.log("\n[summary]");
  for (const result of results) {
    const counts = sourceCounts(result.entries);
    const firstChunkElapsed = result.chunks[0]?.elapsed ?? 0;
    const maxLap = Math.max(...result.chunks.map((chunk) => chunk.lap));
    const jsonOk = result.chunks.every((chunk) => chunk.parsedAsJson);
    const japaneseOk = result.chunks.every((chunk) => chunk.restoredJapanese);

    console.log(
      `${result.name}: ` +
        `elapsed=${(result.endedAt - result.startedAt).toFixed(3)} sec, ` +
        `firstChunk=${firstChunkElapsed.toFixed(3)} sec, ` +
        `maxLap=${maxLap.toFixed(3)} sec, ` +
        `chunks=${result.chunks.length}, ` +
        `entries=${result.entries.length}, ` +
        `db=${counts.get("db") ?? 0}, ` +
        `llm=${counts.get("llm") ?? 0}, ` +
        `jsonOk=${jsonOk}, ` +
        `japaneseOk=${japaneseOk}`,
    );
  }
}

async function main() {
  if (typeof fetch === "undefined") {
    throw new Error("This script requires Node.js with global fetch support");
  }

  const results = [];
  for (const phase of PHASES) {
    results.push(await runPhase(phase));
  }

  console.log("\n[phase gaps]");
  for (let i = 1; i < results.length; i += 1) {
    const prev = results[i - 1];
    const current = results[i];
    console.log(
      `${prev.name} -> ${current.name}: ` +
        `gap=${(current.startedAt - prev.endedAt).toFixed(6)} sec`,
    );
  }

  warnPhaseSources(results);
  printSummary(results);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
