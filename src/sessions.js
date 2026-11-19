// Read-only access to DSH's persisted sessions ($DSH_HOME/sessions/<cwd-slug>/<id>/session.v4.jsonl.zstd)
// for titles in /resume and for replaying history on resume.
import zlib from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { dshHomeLocal } from "./agent.js";

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

async function findSessionFile(id) {
  const root = join(dshHomeLocal(), "sessions");
  let dirs = [];
  try {
    dirs = await readdir(root);
  } catch {
    return undefined;
  }
  for (const d of dirs) {
    for (const name of id.startsWith("session-") ? [id] : [id, `session-${id}`]) {
      const p = join(root, d, name, "session.v4.jsonl.zstd");
      try {
        return { path: p, data: await readFile(p) };
      } catch {}
    }
  }
  return undefined;
}

/** Decode a file made of concatenated zstd frames; a torn trailing frame is skipped. */
function decodeFrames(buf) {
  if (typeof zlib.zstdDecompressSync !== "function") return "";
  const starts = [];
  for (let i = buf.indexOf(ZSTD_MAGIC); i >= 0; i = buf.indexOf(ZSTD_MAGIC, i + 4)) starts.push(i);
  let out = "";
  for (let k = 0; k < starts.length; k++) {
    try {
      out += zlib.zstdDecompressSync(buf.subarray(starts[k], starts[k + 1] ?? buf.length)).toString("utf8");
    } catch {}
  }
  return out;
}

async function readEvents(id) {
  const f = await findSessionFile(id);
  if (!f) return [];
  const events = [];
  for (const line of decodeFrames(f.data).split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {}
  }
  return events;
}

function ago(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "たった今";
  if (s < 3600) return `${Math.floor(s / 60)}分前`;
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`;
  return `${Math.floor(s / 86400)}日前`;
}

/** { [id]: { label } } — title, relative time, and message count for /resume. */
export async function listSessionMeta(ids) {
  const out = {};
  await Promise.all(
    ids.slice(0, 20).map(async (id) => {
      try {
        const ev = await readEvents(id);
        if (!ev.length) return;
        const title = ev.filter((e) => e.type === "session/title").at(-1)?.data?.title;
        const firstUser = ev.find((e) => e.type === "user/message" && e.data?.source?.kind === "user");
        const text = title ?? firstUser?.data?.content?.find((c) => c.type === "text")?.text ?? "(無題)";
        const users = ev.filter((e) => e.type === "user/message" && e.data?.source?.kind === "user").length;
        const last = ev.at(-1)?.time ?? ev[0].createdAt;
        out[id] = { label: `${text.replace(/\s+/g, " ").slice(0, 50)}  · ${ago(last)} · ${users}件` };
      } catch {}
    }),
  );
  return out;
}

/** Transcript items (same shapes the UI uses) for a persisted session. */
export async function loadHistory(id) {
  const ev = await readEvents(id);
  const items = [];
  const tools = new Map();
  for (const e of ev) {
    if (e.type === "user/message" && e.data?.source?.kind === "user") {
      const text = (e.data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (text) items.push({ kind: "user", text });
    } else if (e.type === "assistant/message") {
      for (const b of e.data?.message?.content ?? []) {
        if (b.type === "reasoning" && b.text) items.push({ kind: "thought", text: b.text });
        else if (b.type === "text" && b.text) items.push({ kind: "agent", text: b.text });
      }
    } else if (e.type === "tool/call") {
      let input = e.data.arguments;
      try {
        input = JSON.parse(input);
      } catch {}
      const it = { kind: "tool", toolCallId: e.data.callId, title: e.data.name, rawInput: input, status: "completed" };
      tools.set(e.data.callId, it);
      items.push(it);
    } else if (e.type === "tool/result") {
      const m = e.data?.message;
      const it = tools.get(m?.toolCallId);
      if (it) {
        it.status = m.isError ? "failed" : "completed";
        it.result = (m.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      }
    }
  }
  return items;
}

/** Token consumption summed over every model step persisted for a session. */
export async function sessionUsage(id) {
  const sum = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, steps: 0 };
  for (const e of await readEvents(id)) {
    const u = e.type === "assistant/message" ? e.data?.usage : undefined;
    if (!u) continue;
    sum.input += u.inputTokens ?? 0;
    sum.output += u.outputTokens ?? 0;
    sum.cacheRead += u.cacheReadTokens ?? 0;
    sum.cacheWrite += u.cacheWriteTokens ?? 0;
    sum.total += u.totalTokens ?? (u.inputTokens ?? 0) + (u.outputTokens ?? 0) + (u.cacheReadTokens ?? 0);
    sum.steps += 1;
  }
  return sum;
}
