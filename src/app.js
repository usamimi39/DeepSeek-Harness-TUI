import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Box, Text, Static, useApp, useInput, useStdout, useCursor, renderToString } from "ink";
import stringWidth from "string-width";
import { renderMarkdown } from "./markdown.js";
import { listSessionMeta, loadHistory, sessionUsage } from "./sessions.js";
import { preferredConfig, savePrefs } from "./prefs.js";
import { FACES, MOODS, SPRITE_COLS, PORTRAIT, pick, toolMood, tokenReport } from "./companion.js";
import { WHALE, artToAnsi } from "./art.js";

const h = React.createElement;
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const ACCENT = "#4D6BFE"; // DeepSeek blue

const COMMANDS = [
  { name: "/help", desc: "コマンドとショートカットの一覧" },
  { name: "/clear", desc: "画面を消して新しいセッションを開始" },
  { name: "/resume", desc: "このディレクトリの過去セッションを再開" },
  { name: "/model", desc: "モデルを切り替え" },
  { name: "/effort", desc: "推論の強さ (reasoning effort) を切り替え" },
  { name: "/thinking", desc: "思考過程の表示 ON/OFF" },
  { name: "/status", desc: "セッション情報を表示" },
  { name: "/exit", desc: "終了" },
];

let idSeq = 0;
const nid = () => `i${++idSeq}`;

// ---------- small helpers ----------
function summarizeInput(input) {
  if (input == null) return "";
  if (typeof input === "string") return oneLine(input);
  for (const k of ["command", "cmd", "script", "file_path", "path", "pattern", "query", "url", "description"]) {
    if (typeof input[k] === "string") return oneLine(input[k]);
  }
  return oneLine(JSON.stringify(input));
}
function oneLine(s, max = 120) {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
function toolResultText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => (c?.content?.type === "text" ? c.content.text : c?.content?.type ? `[${c.content.type}]` : ""))
    .filter(Boolean)
    .join("\n");
}
function fmtTokens(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function modelLabel(configOptions) {
  const opt = configOptions?.find((o) => o.category === "model");
  if (!opt) return "?";
  for (const g of opt.options ?? []) {
    const list = g.options ?? [g];
    const hit = list.find((o) => o.value === opt.currentValue);
    if (hit) return hit.name;
  }
  return opt.currentValue;
}
function flattenOptions(opt) {
  const out = [];
  for (const g of opt.options ?? []) {
    if (Array.isArray(g.options)) for (const o of g.options) out.push({ label: `${o.name}  (${g.name})`, value: o.value, hint: o.description });
    else out.push({ label: g.name, value: g.value, hint: g.description });
  }
  return out;
}

// ---------- transcript items ----------
function Bullet({ color, children, dim }) {
  return h(
    Box,
    { flexDirection: "row" },
    h(Box, { width: 2, flexShrink: 0 }, h(Text, { color, dimColor: dim }, "●")),
    h(Box, { flexDirection: "column", flexGrow: 1 }, children),
  );
}

const BANNER_ART = artToAnsi(WHALE);
const VERSION = typeof __DEEPSEEK_TUI_VERSION__ === "string" ? __DEEPSEEK_TUI_VERSION__ : "dev";

function providerLabel(configOptions) {
  const opt = configOptions?.find((o) => o.category === "model");
  for (const g of opt?.options ?? []) {
    if (Array.isArray(g.options) && g.options.some((o) => o.value === opt.currentValue)) return g.name;
  }
  return undefined;
}

function makeBanner(cwd, configOptions) {
  return {
    id: nid(),
    kind: "banner",
    cwd,
    model: configOptions ? modelLabel(configOptions) : undefined,
    provider: configOptions ? providerLabel(configOptions) : undefined,
  };
}

// ---------- companion speech bubble ----------
// Hand-built so the tail can point at the sprite: "┬" sits `tailFromRight` cells from the right edge.
function SpeechBubble({ text, lines, maxWidth = 60, tailFromRight, tailLeft = false }) {
  const fit = (t) => {
    while (stringWidth(t) > maxWidth - 4 && t.length > 1) t = t.slice(0, -2) + "…";
    return t;
  };
  const body = (lines ?? [text]).map(fit);
  const w = Math.max(...body.map((l) => stringWidth(l))) + 2;
  const c = "#858edd";
  const bottom =
    tailFromRight != null && w - tailFromRight >= 1
      ? "╰" + "─".repeat(w - tailFromRight) + "┬" + "─".repeat(tailFromRight - 1) + "╯"
      : "╰" + "─".repeat(w) + "╯";
  const mid = Math.floor(body.length / 2);
  return h(
    Box,
    { flexDirection: "column", flexShrink: 0 },
    h(Text, { color: c }, (tailLeft ? " " : "") + "╭" + "─".repeat(w) + "╮"),
    ...body.map((l, i) =>
      h(
        Text,
        { key: String(i) },
        h(Text, { color: c }, tailLeft ? (i === mid ? "◀│ " : " │ ") : "│ "),
        l,
        " ".repeat(w - 2 - stringWidth(l)),
        h(Text, { color: c }, " │"),
      ),
    ),
    h(Text, { color: c }, (tailLeft ? " " : "") + bottom),
  );
}

function Item({ item, showThinking }) {
  switch (item.kind) {
    case "banner":
      return h(
        Box,
        { flexDirection: "column", marginBottom: 1 },
        h(
          Box,
          { flexDirection: "row" },
          h(Box, { flexShrink: 0, marginRight: 3 }, h(Text, null, BANNER_ART)),
          h(
            Box,
            { flexDirection: "column", paddingTop: 1 },
            h(Text, null, h(Text, { bold: true }, "DeepSeek Harness TUI"), h(Text, { dimColor: true }, ` v${VERSION}`)),
            h(Text, { dimColor: true }, item.model ? `${item.model}${item.provider ? ` · ${item.provider}` : ""}` : "DeepSeek Harness"),
            h(Text, { dimColor: true }, item.cwd),
          ),
        ),
        h(
          Box,
          { marginTop: 1 },
          h(Text, { dimColor: true }, "▎ /help でコマンド一覧 · Esc で中断 · \\+Enter で改行 · Ctrl+C×2 で終了"),
        ),
      );
    case "portrait":
      return h(
        Box,
        { flexDirection: "row", marginBottom: 1 },
        h(Box, { flexShrink: 0, marginRight: 2 }, h(Text, null, PORTRAIT)),
        h(
          Box,
          { flexDirection: "column", justifyContent: "center" },
          h(SpeechBubble, { lines: item.lines ?? [item.text], maxWidth: item.maxWidth ?? 60, tailLeft: true }),
        ),
      );
    case "user":
      return h(
        Box,
        { marginTop: 1, marginBottom: 1, flexDirection: "row" },
        h(Box, { width: 2, flexShrink: 0 }, h(Text, { color: "gray" }, ">")),
        h(Box, { flexGrow: 1, flexShrink: 1 }, h(Text, { color: "gray" }, item.text)),
      );
    case "agent":
      return h(Box, { marginBottom: 1 }, h(Bullet, { color: "white" }, h(Text, null, renderMarkdown(item.text))));
    case "thought": {
      const lines = item.text.trim().split("\n");
      const shown = showThinking ? lines : lines.slice(0, 2);
      const more = lines.length - shown.length;
      return h(
        Box,
        { marginBottom: 1, flexDirection: "column" },
        h(Text, { dimColor: true, italic: true }, `✻ ${shown.join("\n  ")}`),
        more > 0 ? h(Text, { dimColor: true }, `  … +${more} 行 (/thinking で全文表示)`) : null,
      );
    }
    case "tool": {
      const color = item.status === "failed" ? "red" : item.status === "completed" ? "green" : "yellow";
      const lines = (item.result ?? "").replace(/\r/g, "").replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n").filter((l, i, a) => a.length > 1 || l);
      const preview = lines.slice(0, 4);
      return h(
        Box,
        { flexDirection: "column", marginBottom: 1 },
        h(
          Bullet,
          { color },
          h(Text, null, h(Text, { bold: true }, item.title), item.summary ? h(Text, { dimColor: true }, `(${item.summary})`) : null),
        ),
        item.status === "in_progress"
          ? h(Text, { dimColor: true }, "  ⎿  実行中…")
          : preview.length
            ? h(
                Box,
                { flexDirection: "row" },
                h(Text, { dimColor: true }, "  ⎿  "),
                h(
                  Box,
                  { flexDirection: "column", flexGrow: 1 },
                  h(Text, { dimColor: item.status !== "failed", color: item.status === "failed" ? "red" : undefined }, preview.join("\n")),
                  lines.length > 4 ? h(Text, { dimColor: true }, `… +${lines.length - 4} 行`) : null,
                ),
              )
            : h(Text, { dimColor: true }, "  ⎿  (出力なし)"),
      );
    }
    case "info":
      return h(Box, { marginBottom: 1 }, h(Text, { dimColor: true }, `  ${item.text}`));
    case "error":
      return h(Box, { marginBottom: 1 }, h(Text, { color: "red" }, `✗ ${item.text}`));
    default:
      return null;
  }
}
const isFinal = (it) => it.kind !== "tool" || it.status === "completed" || it.status === "failed";

// ---------- selectors ----------
function Selector({ title, body, options, selected, color = ACCENT, footer }) {
  return h(
    Box,
    { borderStyle: "round", borderColor: color, paddingX: 1, flexDirection: "column" },
    h(Text, { bold: true, color }, title),
    body ? h(Box, { marginY: 0, flexDirection: "column" }, body) : null,
    h(Text, null, " "),
    ...options.map((o, i) =>
      h(
        Text,
        { key: String(i), color: i === selected ? color : undefined },
        `${i === selected ? "❯" : " "} ${i + 1}. ${o.label}`,
        o.hint && i === selected ? h(Text, { dimColor: true }, `  ${oneLine(o.hint, 60)}`) : null,
      ),
    ),
    h(Text, { dimColor: true }, footer ?? "↑↓ で選択・Enter で決定・Esc でキャンセル"),
  );
}

// ---------- input ----------
// The input is wrapped by hand (CJK = 2 columns) so we know exactly where the cursor is; the real
// terminal cursor is then moved there with useCursor, which is where IME composition text appears.
const PREFIX_COLS = 2; // "> "
const BOX_X = 2; // left border + paddingX
const segmenter = new Intl.Segmenter();

function layoutInput(value, cursor, avail) {
  const lines = [""];
  let col = 0;
  let pos = null;
  const width = Math.max(1, avail);
  for (const { segment, index } of segmenter.segment(value)) {
    if (pos === null && index >= cursor) pos = { row: lines.length - 1, col };
    if (segment === "\n") {
      lines.push("");
      col = 0;
      continue;
    }
    const w = stringWidth(segment);
    if (col + w > width) {
      lines.push("");
      col = 0;
      if (pos !== null && index === cursor) pos = { row: lines.length - 1, col: 0 };
    }
    lines[lines.length - 1] += segment;
    col += w;
  }
  if (pos === null) {
    if (col >= width) {
      lines.push("");
      col = 0;
    }
    pos = { row: lines.length - 1, col };
  }
  return { lines, row: pos.row, col: pos.col };
}

function InputBox({ layout, busy, width }) {
  return h(
    Box,
    { borderStyle: "round", borderColor: busy ? "gray" : "white", paddingX: 1, width, flexDirection: "column" },
    ...layout.lines.map((line, i) =>
      h(
        Text,
        { key: String(i), wrap: "truncate" },
        h(Text, { color: busy ? "gray" : undefined }, i === 0 ? "> " : "  "),
        line,
      ),
    ),
  );
}

// ---------- app ----------
export function App({ agent, cwd, initialPrompt, resumeId, continueLast, permissionMode }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [cols, setCols] = useState(stdout.columns || 80);
  const [rows, setRows] = useState(stdout.rows || 24);
  const staticCountRef = useRef(0); // how many items have been handed to <Static>

  // ---- companion (dafeiyu) ----
  // Companion mode (dafeiyu living next to the input) is shelved: only DEEPSEEK_TUI_COMPANION=1 enables it.
  const [companion] = useState(() => process.env.DEEPSEEK_TUI_COMPANION === "1");
  const companionRef = useRef(companion);
  companionRef.current = companion;
  const [mood, setMood] = useState("normal");
  const [bubble, setBubble] = useState(null);
  const [blink, setBlink] = useState(false);
  const bubbleTimerRef = useRef(null);
  const lastMoodRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  /** Change her mood; a new line is picked only when the mood changes (no chatter per tool call). */
  const say = useCallback((m, { ttl, text } = {}) => {
    if (!companionRef.current) return;
    lastActivityRef.current = Date.now();
    setMood(m);
    if (text || lastMoodRef.current !== m) setBubble(text ?? pick(MOODS[m]?.lines ?? [""]));
    lastMoodRef.current = m;
    clearTimeout(bubbleTimerRef.current);
    if (ttl)
      bubbleTimerRef.current = setTimeout(() => {
        setBubble(null);
        setMood("normal");
        lastMoodRef.current = null;
      }, ttl);
  }, []);
  useEffect(() => {
    if (!companion) return;
    let alive = true;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => alive && setBlink(false), 160);
        // doze off after a while with nothing going on
        if (Date.now() - lastActivityRef.current > 90_000 && lastMoodRef.current !== "sleepy") {
          lastMoodRef.current = "sleepy";
          setMood("sleepy");
          setBubble(pick(MOODS.sleepy.lines));
          clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 4000);
        }
        loop();
      }, 3000 + Math.random() * 3000);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [companion]);
  const usageAtTurnStartRef = useRef(null);
  const usageRef = useRef(null);
  const [items, setItems] = useState([]);
  const [staticKey, setStaticKey] = useState(0);
  // Editor state lives in a ref so rapid keystrokes (typing/paste) never see a stale cursor.
  const edRef = useRef({ value: "", cursor: 0 });
  const [ed, setEdState] = useState(edRef.current);
  const setEd = useCallback((value, cursor = value.length) => {
    edRef.current = { value, cursor };
    setEdState(edRef.current);
  }, []);
  const input = ed.value;
  const cursor = ed.cursor;
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tick, setTick] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [permission, setPermission] = useState(null); // {params, respond, selected, tool}
  const [picker, setPicker] = useState(null); // {title, options, selected, onPick}
  const [usage, setUsage] = useState(null);
  const [configOptions, setConfigOptions] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const [hint, setHint] = useState("");
  const sessionRef = useRef(null);
  const itemsRef = useRef(items);
  const historyRef = useRef({ list: [], idx: -1 });
  const ctrlCRef = useRef(0);
  itemsRef.current = items;

  const push = useCallback((it) => setItems((xs) => [...xs, { id: nid(), ...it }]), []);
  const info = useCallback((text) => push({ kind: "info", text }), [push]);
  const error = useCallback((text) => push({ kind: "error", text }), [push]);

  useEffect(() => {
    const onResize = () => {
      setCols(stdout.columns || 80);
      setRows(stdout.rows || 24);
      floorRef.current = 0; // reflow invalidates our bookkeeping; start pinning afresh
    };
    stdout.on("resize", onResize);
    return () => stdout.off("resize", onResize);
  }, [stdout]);

  // spinner
  useEffect(() => {
    if (!busy && !booting) return;
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [busy, booting]);

  // agent events
  useEffect(() => {
    const onUpdate = ({ sessionId, update }) => {
      if (sessionId !== sessionRef.current) return;
      switch (update.sessionUpdate) {
        case "agent_message_chunk":
        case "agent_thought_chunk": {
          if (update.sessionUpdate === "agent_thought_chunk") say("thinking");
          const kind = update.sessionUpdate === "agent_message_chunk" ? "agent" : "thought";
          const text = update.content?.type === "text" ? update.content.text : `[${update.content?.type}]`;
          setItems((xs) => {
            const last = xs[xs.length - 1];
            if (last && last.kind === kind && last.messageId && last.messageId === update.messageId) {
              return [...xs.slice(0, -1), { ...last, text: last.text + text }];
            }
            return [...xs, { id: nid(), kind, text, messageId: update.messageId }];
          });
          break;
        }
        case "tool_call":
          say(toolMood(update.title));
          setItems((xs) => [
            ...xs,
            {
              id: nid(),
              kind: "tool",
              toolCallId: update.toolCallId,
              title: update.title,
              summary: summarizeInput(update.rawInput),
              rawInput: update.rawInput,
              status: update.status ?? "in_progress",
            },
          ]);
          break;
        case "tool_call_update":
          if (update.status === "failed") say("oops");
          setItems((xs) =>
            xs.map((it) =>
              it.kind === "tool" && it.toolCallId === update.toolCallId
                ? {
                    ...it,
                    status: update.status ?? it.status,
                    result: update.content ? toolResultText(update.content) : it.result,
                    title: update.title ?? it.title,
                  }
                : it,
            ),
          );
          break;
        case "usage_update":
          setUsage({ used: update.used, size: update.size });
          usageRef.current = update.used;
          break;
        case "config_option_update":
          setConfigOptions(update.configOptions);
          break;
        case "plan":
          push({
            kind: "info",
            text:
              "計画:\n" +
              (update.entries ?? []).map((e) => `  ${e.status === "completed" ? "☒" : "☐"} ${e.content}`).join("\n"),
          });
          break;
        default:
          break;
      }
    };
    const onPermission = (params, respond) => {
      const tool = itemsRef.current.find((it) => it.kind === "tool" && it.toolCallId === params.toolCall?.toolCallId);
      setPermission({ params, respond, selected: 0, tool });
      say("waiting");
    };
    const onExit = () => {
      setBusy(false);
      error(`dsh プロセスが終了しました。\n${agent.stderrTail.slice(-8).join("\n")}`);
    };
    agent.on("update", onUpdate);
    agent.on("permission", onPermission);
    agent.on("exit", onExit);
    return () => {
      agent.off("update", onUpdate);
      agent.off("permission", onPermission);
      agent.off("exit", onExit);
    };
  }, [agent, push, error, say]);

  const runPrompt = useCallback(
    async (text) => {
      if (!sessionRef.current) return;
      setBusy(true);
      setStartedAt(Date.now());
      usageAtTurnStartRef.current = usageRef.current;
      say("thinking");
      try {
        const res = await agent.prompt(sessionRef.current, text);
        if (res?.stopReason === "cancelled") say("cancelled", { ttl: 5000 });
        else {
          const ate = (usageRef.current ?? 0) - (usageAtTurnStartRef.current ?? 0);
          const line = pick(MOODS.success.lines) + (ate > 0 ? ` もぐもぐ… ${fmtTokens(ate)} トークンごちそうさま` : "");
          say("success", { ttl: 8000, text: line });
        }
        if (res?.stopReason === "cancelled") info("⎿ 中断しました");
        else if (res?.stopReason === "max_tokens") info("⎿ 最大トークン数に達しました");
        else if (res?.stopReason === "refusal") info("⎿ エージェントが応答を拒否しました");
      } catch (e) {
        error(e.message);
        say("error", { ttl: 8000 });
      } finally {
        setBusy(false);
      }
    },
    [agent, info, error, say],
  );

  /** Apply saved model/effort (or the account fallback) to the active session. */
  const applyPrefs = useCallback(
    async (opts, isNew) => {
      let current = opts;
      for (const pass of [false, true]) {
        for (const c of preferredConfig(current, { isNew }).filter((c) => Boolean(c.after) === pass)) {
          const r = await agent.setConfig(sessionRef.current, c.configId, c.value).catch(() => null);
          if (r?.configOptions) current = r.configOptions;
        }
      }
      setConfigOptions(current ?? null);
      return current;
    },
    [agent],
  );

  const startNewSession = useCallback(async () => {
    const res = await agent.newSession(cwd);
    sessionRef.current = res.sessionId;
    setUsage(null);
    return await applyPrefs(res.configOptions, true);
  }, [agent, cwd, applyPrefs]);

  const resumeSession = useCallback(
    async (id, { withBanner = false } = {}) => {
      if (sessionRef.current) await agent.closeSession(sessionRef.current).catch(() => {});
      const res = await agent.resumeSession(id, cwd);
      sessionRef.current = id;
      setUsage(null);
      const opts = await applyPrefs(res.configOptions, false);
      const history = await loadHistory(id).catch(() => []);
      setItems((xs) => [
        ...xs,
        ...(withBanner ? [makeBanner(cwd, opts)] : []),
        ...history.map((it) => ({ id: nid(), ...it, ...(it.kind === "tool" ? { summary: summarizeInput(it.rawInput) } : {}) })),
        { id: nid(), kind: "info", text: `── セッション ${id} を再開しました ──` },
      ]);
    },
    [agent, cwd, applyPrefs],
  );

  // boot
  useEffect(() => {
    (async () => {
      try {
        await agent.initialize();
        let target = resumeId;
        let notice;
        if (continueLast) {
          const list = await agent.listSessions(cwd);
          target = list.sessions?.[0]?.sessionId;
          if (!target) notice = "このディレクトリに再開できるセッションがないので、新しく始めます";
        }
        if (target) await resumeSession(target, { withBanner: true });
        else push(makeBanner(cwd, await startNewSession()));
        if (notice) info(notice);
        setBooting(false);
        if (initialPrompt) {
          push({ kind: "user", text: initialPrompt });
          historyRef.current.list.push(initialPrompt);
          runPrompt(initialPrompt);
        }
      } catch (e) {
        setBooting(false);
        push(makeBanner(cwd, null));
        error(`起動に失敗しました: ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [exiting, setExiting] = useState(false);
  const doExit = useCallback(() => {
    const id = sessionRef.current;
    // First render once with the terminal cursor released from the input box, so Ink leaves it
    // below the output; otherwise the goodbye line would overwrite the input box's border.
    setExiting(true);
    setTimeout(() => {
      agent.dispose();
      exit();
      if (id) setTimeout(() => process.stdout.write(`再開するには: deepseek --resume ${id}\n`), 50);
    }, 30);
  }, [agent, exit]);

  const openConfigPicker = useCallback(
    (category, title) => {
      const opt = configOptions?.find((o) => o.category === category);
      if (!opt) return info("この設定は利用できません");
      const options = flattenOptions(opt);
      const selected = Math.max(0, options.findIndex((o) => o.value === opt.currentValue));
      setPicker({
        title,
        options,
        selected,
        onPick: async (o) => {
          try {
            const res = await agent.setConfig(sessionRef.current, opt.id, o.value);
            setConfigOptions(res.configOptions ?? configOptions);
            savePrefs(category === "model" ? { model: o.value } : { effort: o.value });
            info(`${title}: ${o.label}（次回以降のデフォルトにも使います）`);
          } catch (e) {
            error(e.message);
          }
        },
      });
    },
    [agent, configOptions, info, error],
  );

  const handleCommand = useCallback(
    async (line) => {
      const [cmd] = line.split(/\s+/);
      switch (cmd) {
        case "/exit":
        case "/quit":
          return doExit();
        case "/help":
          return info(
            [
              "コマンド:",
              ...COMMANDS.map((c) => `  ${c.name.padEnd(10)} ${c.desc}`),
              "",
              "ショートカット:",
              "  Enter      送信          \\ + Enter  改行",
              "  Esc        実行中なら中断 / 入力をクリア",
              "  ↑ / ↓      入力履歴",
              "  Ctrl+C×2   終了          Ctrl+U  行をクリア",
            ].join("\n"),
          );
        case "/clear": {
          if (busy) return info("実行中は /clear できません（Esc で中断してから）");
          if (sessionRef.current) await agent.closeSession(sessionRef.current).catch(() => {});
          // Clear and start again from the top row; the dynamic region fills the rest of the
          // screen so the banner sits at the top and the input stays pinned to the bottom.
          process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
          staticSeenRef.current = 0;
          floorRef.current = Math.max(0, (stdout.rows || 24) - 1);
          setItems([]);
          setStaticKey((k) => k + 1);
          try {
            push(makeBanner(cwd, await startNewSession()));
          } catch (e) {
            push(makeBanner(cwd, null));
            error(e.message);
          }
          return;
        }
        case "/resume": {
          if (busy) return info("実行中は /resume できません");
          try {
            const list = await agent.listSessions(cwd);
            const ids = (list.sessions ?? []).map((s) => s.sessionId).filter((id) => id !== sessionRef.current);
            if (!ids.length) return info("このディレクトリに再開できるセッションはありません");
            const meta = await listSessionMeta(ids);
            setPicker({
              title: "再開するセッションを選んでください",
              options: ids.slice(0, 20).map((id) => ({
                label: meta[id]?.label ?? id,
                hint: id,
                value: id,
              })),
              selected: 0,
              onPick: (o) => resumeSession(o.value).catch((e) => error(e.message)),
            });
          } catch (e) {
            error(e.message);
          }
          return;
        }
        case "/dafeiyu": {
          // Easter egg (not in /help): the 26px dafeiyu pops in once and reports token usage.
          const used = await sessionUsage(sessionRef.current).catch(() => null);
          push({ kind: "portrait", lines: tokenReport(used, usage), maxWidth: Math.max(24, (stdout.columns || 80) - 32) });
          return;
        }
        case "/model":
          return openConfigPicker("model", "モデル");
        case "/effort":
          return openConfigPicker("thought_level", "推論の強さ");
        case "/thinking":
          setShowThinking((v) => !v);
          return info(`思考過程の全文表示: ${showThinking ? "OFF" : "ON"}（これ以降の表示に反映）`);
        case "/status":
          return info(
            [
              `session: ${sessionRef.current}`,
              `cwd:     ${cwd}`,
              `model:   ${modelLabel(configOptions)}`,
              `mode:    ${permissionMode ?? "workspace-write (default)"}`,
              usage ? `context: ${fmtTokens(usage.used)} / ${fmtTokens(usage.size)}` : null,
            ]
              .filter(Boolean)
              .join("\n  "),
          );
        default:
          return false; // not ours → send to agent
      }
    },
    [agent, busy, configOptions, cwd, doExit, error, info, openConfigPicker, permissionMode, resumeSession, showThinking, startNewSession, usage],
  );

  const submit = useCallback(async () => {
    const text = edRef.current.value.trim();
    if (!text) return;
    setEd("");
    historyRef.current.list.push(text);
    historyRef.current.idx = -1;
    if (text.startsWith("/")) {
      const handled = await handleCommand(text);
      if (handled !== false) return;
    }
    if (busy || booting) return info("まだ前の処理が終わっていません（Esc で中断できます）");
    push({ kind: "user", text });
    runPrompt(text);
  }, [busy, booting, handleCommand, push, runPrompt, info, setEd]);

  const suggestFor = (v) => (v.startsWith("/") && !v.includes(" ") ? COMMANDS.filter((c) => c.name.startsWith(v)) : []);
  const suggestions = suggestFor(input);

  useInput((ch, key) => {
    // --- permission prompt ---
    if (permission) {
      const opts = permission.params.options ?? [];
      const choose = (i) => {
        const o = opts[i];
        permission.respond({ outcome: { outcome: "selected", optionId: o.optionId } });
        setPermission(null);
        say(o.kind?.startsWith("allow") ? "working" : "cancelled");
      };
      if (key.upArrow) setPermission((p) => ({ ...p, selected: (p.selected + opts.length - 1) % opts.length }));
      else if (key.downArrow || key.tab) setPermission((p) => ({ ...p, selected: (p.selected + 1) % opts.length }));
      else if (key.return) choose(permission.selected);
      else if (/^[1-9]$/.test(ch) && Number(ch) <= opts.length) choose(Number(ch) - 1);
      else if (key.escape || (key.ctrl && ch === "c")) {
        const rej = opts.findIndex((o) => o.kind?.startsWith("reject"));
        if (rej >= 0) choose(rej);
        else {
          permission.respond({ outcome: { outcome: "cancelled" } });
          setPermission(null);
        }
      }
      return;
    }
    // --- generic picker ---
    if (picker) {
      const n = picker.options.length;
      if (key.upArrow) setPicker((p) => ({ ...p, selected: (p.selected + n - 1) % n }));
      else if (key.downArrow || key.tab) setPicker((p) => ({ ...p, selected: (p.selected + 1) % n }));
      else if (key.return) {
        const o = picker.options[picker.selected];
        setPicker(null);
        picker.onPick(o);
      } else if (/^[1-9]$/.test(ch) && Number(ch) <= n) {
        const o = picker.options[Number(ch) - 1];
        setPicker(null);
        picker.onPick(o);
      } else if (key.escape || (key.ctrl && ch === "c")) setPicker(null);
      return;
    }

    lastActivityRef.current = Date.now();
    if (lastMoodRef.current === "sleepy") {
      lastMoodRef.current = null;
      setMood("normal");
      setBubble(null);
    }
    // --- global keys ---
    const { value: input, cursor } = edRef.current;
    const suggestions = suggestFor(input);
    if (key.ctrl && ch === "c") {
      if (busy) {
        agent.cancel(sessionRef.current);
        return;
      }
      if (input) {
        setEd("");
        return;
      }
      const now = Date.now();
      if (now - ctrlCRef.current < 1500) return doExit();
      ctrlCRef.current = now;
      setHint("もう一度 Ctrl+C で終了");
      setTimeout(() => setHint(""), 1500);
      return;
    }
    if (key.ctrl && ch === "d" && !input) return doExit();
    if (key.escape) {
      if (busy) agent.cancel(sessionRef.current);
      else {
        setEd("");
      }
      return;
    }

    // --- editing ---
    if (key.return) {
      if (input[cursor - 1] === "\\") {
        setEd(input.slice(0, cursor - 1) + "\n" + input.slice(cursor), cursor);
        return;
      }
      if (suggestions.length && input !== suggestions[0].name && suggestions.length >= 1 && !COMMANDS.some((c) => c.name === input)) {
        const s = suggestions[0].name;
        setEd(s);
        return;
      }
      submit();
      return;
    }
    if (key.tab) {
      if (suggestions.length) {
        const s = suggestions[0].name;
        setEd(s);
      }
      return;
    }
    if (key.backspace || key.delete) {
      if (cursor > 0) {
        setEd(input.slice(0, cursor - 1) + input.slice(cursor), cursor - 1);
      }
      return;
    }
    if (key.leftArrow) return setEd(input, Math.max(0, cursor - 1));
    if (key.rightArrow) return setEd(input, Math.min(input.length, cursor + 1));
    if (key.upArrow || key.downArrow) {
      const hst = historyRef.current;
      if (!hst.list.length) return;
      if (key.upArrow) hst.idx = hst.idx < 0 ? hst.list.length - 1 : Math.max(0, hst.idx - 1);
      else hst.idx = hst.idx < 0 ? -1 : hst.idx + 1 >= hst.list.length ? -1 : hst.idx + 1;
      const v = hst.idx < 0 ? "" : hst.list[hst.idx];
      setEd(v);
      return;
    }
    if (key.ctrl && ch === "a") return setEd(input, 0);
    if (key.ctrl && ch === "e") return setEd(input, input.length);
    if (key.ctrl && ch === "u") {
      setEd("");
      return;
    }
    if (key.ctrl && ch === "w") {
      const left = input.slice(0, cursor).replace(/\S+\s*$/, "");
      setEd(left + input.slice(cursor), left.length);
      return;
    }
    if (key.ctrl || key.meta || !ch) return;
    // A trailing CR in a chunk that is otherwise single-line is a fast-typed Enter, not pasted text.
    const enterAtEnd = /\r$/.test(ch) && !/[\r\n]/.test(ch.slice(0, -1));
    const text = (enterAtEnd ? ch.slice(0, -1) : ch).replace(/\r\n?/g, "\n");
    const before = input.slice(0, cursor) + text;
    if (enterAtEnd && before.endsWith("\\")) {
      // "\" + Enter arrived in one chunk → newline, same as the key.return path.
      const next = before.slice(0, -1) + "\n";
      setEd(next + input.slice(cursor), next.length);
      return;
    }
    setEd(before + input.slice(cursor), before.length);
    if (enterAtEnd) submit();
  });

  // Split transcript into Static (finalized) and live parts. A finalized item first spends one
  // frame in the live area so its height can be measured (renderToString can't run during render);
  // it moves to <Static> on the next frame, which also shrinks the pin floor by that height.
  const measuredRef = useRef(new Map());
  const [, setMeasureTick] = useState(0);
  let firstLive = items.findIndex((it) => !isFinal(it) || !measuredRef.current.has(it.id));
  if (firstLive < 0) firstLive = items.length;
  firstLive = Math.max(firstLive, Math.min(staticCountRef.current, items.length)); // never un-static
  const done = items.slice(0, firstLive);
  const live = items.slice(firstLive);

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const width = Math.max(20, cols);

  // Real terminal cursor → inside the input box (IME composition is drawn at the cursor).
  const showInput = !permission && !picker && !exiting;
  const spriteCols = companion ? SPRITE_COLS + 1 : 0;
  const inputWidth = Math.max(20, width - spriteCols);
  const inputLayout = layoutInput(input, cursor, inputWidth - BOX_X * 2 - PREFIX_COLS);
  const inputBoxRef = useRef(null);
  const [inputTop, setInputTop] = useState(null);
  useLayoutEffect(() => {
    const top = showInput && inputBoxRef.current?.yogaNode && contentRef.current?.yogaNode
      ? contentRef.current.yogaNode.getComputedTop() + inputBoxRef.current.yogaNode.getComputedTop()
      : null;
    if (top !== inputTop) setInputTop(top ?? null);
  });
  const { setCursorPosition } = useCursor();
  setCursorPosition(
    showInput && inputTop != null
      ? { x: BOX_X + PREFIX_COLS + inputLayout.col, y: inputTop + 1 + inputLayout.row }
      : undefined,
  );

  // ---- keep the input pinned to the bottom of the screen ----
  // The dynamic region (live items … footer) sits at the bottom of the terminal. When it shrinks
  // (a picker closes, the spinner goes away) Ink would leave blank lines *below* the input. Instead
  // the region keeps a minimum height ("floor") and a flex spacer above the content absorbs the
  // slack, so the input stays on the bottom row. Lines that scroll in through <Static> take that
  // space back in the same frame, so nothing ever jumps.
  const floorRef = useRef(Math.max(0, (stdout.rows || 24) - 1)); // start: fill the screen (banner on top)
  const staticSeenRef = staticCountRef;
  const contentRef = useRef(null);
  if (done.length > staticSeenRef.current) {
    let lines = 0;
    for (const it of done.slice(staticSeenRef.current)) lines += measuredRef.current.get(it.id) ?? 0;
    staticSeenRef.current = done.length;
    floorRef.current = Math.max(0, floorRef.current - lines);
  }
  // Measure outside React's commit: a nested renderToString during commit corrupts Yoga's state.
  useEffect(() => {
    const pending = live.filter((it) => isFinal(it) && !measuredRef.current.has(it.id));
    if (!pending.length) return;
    const t = setImmediate(() => {
      for (const it of pending) {
        if (measuredRef.current.has(it.id)) continue;
        let n = 0;
        try {
          n = renderToString(h(Item, { item: it, showThinking }), { columns: width }).split("\n").length;
        } catch {}
        measuredRef.current.set(it.id, n);
      }
      setMeasureTick((x) => x + 1);
    });
    return () => clearImmediate(t);
  });
  const floorNow = Math.min(floorRef.current, Math.max(0, rows - 1));
  useLayoutEffect(() => {
    const content = contentRef.current?.yogaNode?.getComputedHeight();
    if (content == null) return;
    floorRef.current = Math.min(Math.max(floorRef.current, content), Math.max(0, rows - 1));
  });

  let permissionBox = null;
  if (permission) {
    const t = permission.tool;
    const body = [
      h(Text, { key: "t", bold: true }, t?.title ?? "ツール"),
      t?.rawInput !== undefined
        ? h(
            Text,
            { key: "i", dimColor: true },
            typeof t.rawInput === "string" ? t.rawInput : JSON.stringify(t.rawInput, null, 2).slice(0, 1500),
          )
        : null,
    ];
    const labels = { allow_once: "はい（今回だけ許可）", allow_always: "はい（常に許可）", reject_once: "いいえ", reject_always: "いいえ（常に拒否）" };
    permissionBox = h(Selector, {
      title: "この操作を実行してもいいですか？",
      body,
      color: "yellow",
      options: (permission.params.options ?? []).map((o) => ({ label: labels[o.kind] ?? o.name })),
      selected: permission.selected,
      footer: "↑↓ / 数字キーで選択・Enter で決定・Esc で拒否",
    });
  }

  return h(
    Box,
    { flexDirection: "column" },
    h(Static, { key: `s${staticKey}`, items: done }, (it) => h(Item, { key: it.id, item: it, showThinking })),
    h(
    Box,
    { flexDirection: "column", minHeight: floorNow },
    h(Box, { flexGrow: 1 }),
    h(
    Box,
    { ref: contentRef, flexDirection: "column", flexShrink: 0 },
    ...live.map((it) => h(Item, { key: it.id, item: it, showThinking })),
    booting
      ? h(Text, { color: ACCENT }, `${SPINNER[tick % SPINNER.length]} DeepSeek Harness を起動中…`)
      : busy && !permission
        ? h(
            Box,
            { marginBottom: 1 },
            h(Text, { color: ACCENT }, `${SPINNER[tick % SPINNER.length]} 考え中… `),
            h(Text, { dimColor: true }, `(${elapsed}s · esc で中断)`),
          )
        : null,
    // speech bubble, right-aligned so its tail points down at the sprite
    companion && bubble && !exiting
      ? h(
          Box,
          { justifyContent: "flex-end", width },
          h(SpeechBubble, { text: bubble, maxWidth: Math.max(20, width - 4), tailFromRight: Math.ceil(SPRITE_COLS / 2) }),
        )
      : null,
    // bottom row: input (or permission / picker) + dafeiyu living next to it
    h(
      Box,
      { ref: inputBoxRef, flexDirection: "row", alignItems: "flex-end", width },
      h(
        Box,
        { flexDirection: "column", flexGrow: 1, flexShrink: 1 },
        permissionBox,
        picker ? h(Selector, picker) : null,
        showInput ? h(InputBox, { layout: inputLayout, busy, width: inputWidth }) : null,
      ),
      companion && !exiting
        ? h(Box, { flexShrink: 0, marginLeft: 1 }, h(Text, null, blink && FACES[MOODS[mood]?.face ?? "normal"] === FACES.normal ? FACES.blink : FACES[MOODS[mood]?.face ?? "normal"]))
        : null,
    ),
    suggestions.length && !picker && !permission
      ? h(
          Box,
          { flexDirection: "column", paddingX: 2 },
          ...suggestions.map((c, i) =>
            h(Text, { key: c.name, color: i === 0 ? ACCENT : undefined, dimColor: i !== 0 }, `${c.name.padEnd(12)}${c.desc}`),
          ),
        )
      : h(
          Box,
          { paddingX: 2, justifyContent: "space-between", width },
          h(Text, { dimColor: true }, hint || (permissionMode ? `⏵⏵ ${permissionMode}` : "? /help でヘルプ")),
          h(
            Text,
            { dimColor: true },
            `${modelLabel(configOptions)}${usage ? ` · ctx ${fmtTokens(usage.used)}/${fmtTokens(usage.size)} (${Math.round((usage.used / usage.size) * 100)}%)` : ""}`,
          ),
        ),
    ),
    ),
  );
}
