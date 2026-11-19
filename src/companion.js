// Companion mode: a tiny dafeiyu that lives next to the input box and reacts to what the agent
// is doing. Everything here is local (no tokens) and nothing is written to the transcript.
import { DAFEIYU, artToAnsi } from "./art.js";
import { t } from "./i18n.js";

// 10x6 px chibi (3 rows). Expressions only swap the eye/cheek rows.
const BASE = ["..pppppp..", ".peeeeeep.", "eeeaeeaeee", "gedkoodkeg", "gemoooomeg", ".ggoooogg."];
const face = (r3, r4, r2) => {
  const g = [...BASE];
  if (r2) g[2] = r2;
  if (r3) g[3] = r3;
  if (r4) g[4] = r4;
  return artToAnsi({ palette: DAFEIYU.palette, rows: g });
};
export const FACES = {
  normal: face(),
  blink: face("geaaooaaeg"),
  happy: face("geaaooaaeg", "gemmoommeg"),
  worry: face("gedkoodkfg", "gemoooomfg"),
  think: face("geooooooeg", null, "eeddeeddee"),
  sleepy: face("geooooooeg", "geaaooaaeg"),
};
export const SPRITE_COLS = 10;

/** What each mood looks like; her lines are the i18n arrays mood.<name>. */
export const MOODS = {
  hello: { face: "happy" },
  thinking: { face: "think" },
  command: { face: "normal" },
  search: { face: "think" },
  edit: { face: "normal" },
  working: { face: "normal" },
  oops: { face: "worry" },
  waiting: { face: "worry" },
  success: { face: "happy" },
  cancelled: { face: "normal" },
  error: { face: "worry" },
  sleepy: { face: "sleepy" },
  bye: { face: "happy" },
};

export const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];
export const moodLines = (m) => t(`mood.${m}`);

/** Classify a tool call into a mood from its name. */
export function toolMood(title = "") {
  const t = title.toLowerCase();
  if (/pwsh|bash|shell|terminal|command|exec/.test(t)) return "command";
  if (/search|grep|glob|find|read|list|web|fetch|query/.test(t)) return "search";
  if (/write|edit|replace|patch|create/.test(t)) return "edit";
  return "working";
}

/** The big 26px portrait, used once when companion mode is switched on. */
export const PORTRAIT = artToAnsi(DAFEIYU);

const fmt = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/**
 * What dafeiyu says when summoned with /dafeiyu.
 * @param used - tokens summed over the session's persisted model steps (or null)
 * @param ctx - latest context occupancy { used, size } from ACP (or null)
 * @returns bubble lines
 */
export function tokenReport(used, ctx) {
  const lines = [pick(t("egg.greet"))];
  if (used && used.total > 0) {
    lines.push(t("egg.ate", { n: fmt(used.total) }));
    lines.push(t("egg.breakdown", { input: fmt(used.input), cache: fmt(used.cacheRead), output: fmt(used.output), steps: used.steps }));
    const cacheRate = used.cacheRead / Math.max(1, used.input + used.cacheRead);
    if (cacheRate >= 0.7) lines.push(t("egg.cache", { pct: Math.round(cacheRate * 100) }));
  } else {
    lines.push(t("egg.hungry"));
  }
  if (ctx?.size) {
    const pct = Math.round((ctx.used / ctx.size) * 100);
    const mood = t(pct < 10 ? "egg.tummy.lt10" : pct < 50 ? "egg.tummy.lt50" : pct < 80 ? "egg.tummy.lt80" : "egg.tummy.full");
    lines.push(t("egg.tummy", { used: fmt(ctx.used), size: fmt(ctx.size), pct, mood }));
  }
  return lines;
}
