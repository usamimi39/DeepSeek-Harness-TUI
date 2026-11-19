// Companion mode: a tiny dafeiyu that lives next to the input box and reacts to what the agent
// is doing. Everything here is local (no tokens) and nothing is written to the transcript.
import { DAFEIYU, artToAnsi } from "./art.js";

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

/** What each mood looks like and the lines she picks from. */
export const MOODS = {
  hello: { face: "happy", lines: ["大肥鱼だよ！しばらく一緒にいるね", "やっほー、お手伝いするよ！"] },
  thinking: { face: "think", lines: ["ふむふむ…", "まかせて！", "考えてるよ〜", "うーんとね…"] },
  command: { face: "normal", lines: ["コマンド叩くね", "えいっ", "実行〜！"] },
  search: { face: "think", lines: ["探してくる！", "どこかな〜", "ファイル見てるよ"] },
  edit: { face: "normal", lines: ["書き書き…", "直してるよ", "ちょっと書き換えるね"] },
  working: { face: "normal", lines: ["がんばってる！", "作業中〜"] },
  oops: { face: "worry", lines: ["あれっ、失敗しちゃった", "うまくいかない…もう一回！", "むむ、エラー出た"] },
  waiting: { face: "worry", lines: ["先輩、これ実行していい？", "確認おねがい！", "どうする…？"] },
  success: { face: "happy", lines: ["おつかれさま！", "できたよ〜！", "ばっちり！"] },
  cancelled: { face: "normal", lines: ["止めたよ", "はーい、ストップ"] },
  error: { face: "worry", lines: ["うぅ、エラー…", "なにか変かも…"] },
  sleepy: { face: "sleepy", lines: ["ふわぁ…", "zzz…"] },
  bye: { face: "happy", lines: ["またね〜", "ばいばい！"] },
};

export const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

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
  const lines = [pick(["大肥鱼だよ！呼んだ？", "はーい、dafeiyu だよ〜", "なになに？"])];
  if (used && used.total > 0) {
    lines.push(`このセッションで ${fmt(used.total)} トークン食べたよ！`);
    lines.push(`入力 ${fmt(used.input)} · キャッシュ ${fmt(used.cacheRead)} · 出力 ${fmt(used.output)}（${used.steps} ステップ）`);
    const cacheRate = used.cacheRead / Math.max(1, used.input + used.cacheRead);
    if (cacheRate >= 0.7) lines.push(`キャッシュが ${Math.round(cacheRate * 100)}% 効いてて安上がり♪`);
  } else {
    lines.push("まだなにも食べてないよ〜 おなかすいた…");
  }
  if (ctx?.size) {
    const pct = Math.round((ctx.used / ctx.size) * 100);
    const mood =
      pct < 10 ? "まだまだ入るよ！" : pct < 50 ? "いい感じ〜" : pct < 80 ? "そろそろおなかいっぱいかも…" : "もう入らないよぉ… /clear してほしいな";
    lines.push(`おなか: ${fmt(ctx.used)} / ${fmt(ctx.size)}（${pct}%） ${mood}`);
  }
  return lines;
}
