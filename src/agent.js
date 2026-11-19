// Spawns `dsh --profile acp` (DeepSeek Harness) and speaks ACP (JSON-RPC over ndjson stdio).
// Works on native Windows and on WSL (via interop, spawning the Windows executable).
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { t } from "./i18n.js";

const IS_WIN = process.platform === "win32";
const IS_WSL = !IS_WIN && process.platform === "linux" && /microsoft/i.test(safeRead("/proc/version"));

function safeRead(path) {
  try {
    return execFileSync("cat", [path], { encoding: "utf8" });
  } catch {
    return "";
  }
}

/** Convert a WSL path to a Windows path (or vice versa). */
function wslpath(flag, p) {
  return execFileSync("wslpath", [flag, p], { encoding: "utf8" }).trim();
}

/** Locate the DeepSeek Harness install. Returns { exe, cliWin, exeSpawn }. */
export function locateHarness() {
  let dirWin = process.env.DEEPSEEK_TUI_HARNESS_DIR; // Windows-style path to the install dir
  if (!dirWin) {
    if (IS_WIN) {
      dirWin = join(process.env.LOCALAPPDATA ?? "", "Programs", "DeepSeek Harness");
    } else if (IS_WSL) {
      const local = execFileSync("cmd.exe", ["/d", "/c", "echo %LOCALAPPDATA%"], {
        encoding: "utf8",
        cwd: "/mnt/c",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      dirWin = `${local}\\Programs\\DeepSeek Harness`;
    } else {
      throw new Error(t("agent.unsupportedOs"));
    }
  }
  const sep = "\\";
  const exeWin = `${dirWin}${sep}DeepSeek Harness.exe`;
  const cliWin = [dirWin, "resources", "app.asar", "dsh", "node_modules", "@deepseek-ai", "dsh-desktop-host", "lib", "cli.js"].join(sep);
  const exeSpawn = IS_WIN ? exeWin : wslpath("-u", exeWin);
  if (!existsSync(exeSpawn)) {
    throw new Error(t("agent.notFound", { path: exeWin }));
  }
  return { exeSpawn, cliWin };
}

/** Local (this-OS) path of the DSH home directory (default %USERPROFILE%\.dsh). */
let dshHomeCache;
export function dshHomeLocal() {
  if (dshHomeCache) return dshHomeCache;
  if (process.env.DEEPSEEK_TUI_DSH_HOME) return (dshHomeCache = process.env.DEEPSEEK_TUI_DSH_HOME);
  if (IS_WIN) return (dshHomeCache = process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? "", ".dsh"));
  const profile = execFileSync("cmd.exe", ["/d", "/c", "echo %USERPROFILE%"], {
    encoding: "utf8",
    cwd: "/mnt/c",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  return (dshHomeCache = join(wslpath("-u", profile), ".dsh"));
}

/** The workspace path as DeepSeek Harness (a Windows process) sees it. */
export function workspaceCwd() {
  return IS_WIN ? process.cwd() : wslpath("-w", process.cwd());
}

export const platformLabel = IS_WIN ? "windows" : IS_WSL ? "wsl" : process.platform;

export class AcpAgent extends EventEmitter {
  constructor({ permissionMode } = {}) {
    super();
    this.permissionMode = permissionMode;
    this.nextId = 1;
    this.pending = new Map();
    this.stderrTail = [];
    this.closed = false;
  }

  start() {
    const { exeSpawn, cliWin } = locateHarness();
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
    const forward = ["ELECTRON_RUN_AS_NODE"];
    if (this.permissionMode) {
      env.DSH_PERMISSION_MODE = this.permissionMode;
      forward.push("DSH_PERMISSION_MODE");
    }
    if (IS_WSL) env.WSLENV = [env.WSLENV, ...forward].filter(Boolean).join(":");

    this.child = spawn(exeSpawn, ["--expose-internals", cliWin, "--profile", "acp"], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let buf = "";
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) this.#onLine(line);
      }
    });
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => {
      for (const l of chunk.split(/\r?\n/)) if (l.trim()) this.stderrTail.push(l);
      if (this.stderrTail.length > 50) this.stderrTail.splice(0, this.stderrTail.length - 50);
    });
    this.child.on("error", (err) => this.#fail(err));
    this.child.on("exit", (code) => {
      this.closed = true;
      this.#fail(new Error(t("dsh.exitedCode", { code, tail: this.stderrTail.slice(-10).join("\n") })));
      this.emit("exit", code);
    });
  }

  #fail(err) {
    for (const { reject } of this.pending.values()) reject(err);
    this.pending.clear();
  }

  #send(msg) {
    if (this.closed) throw new Error("dsh is not running");
    this.child.stdin.write(JSON.stringify(msg) + "\n");
  }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.#send({ jsonrpc: "2.0", id, method, params });
      } catch (e) {
        this.pending.delete(id);
        reject(e);
      }
    });
  }

  notify(method, params) {
    this.#send({ jsonrpc: "2.0", method, params });
  }

  #onLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      this.stderrTail.push(`[non-json stdout] ${line}`);
      return;
    }
    if (msg.id !== undefined && msg.method === undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) {
        const e = new Error(msg.error.message + (msg.error.data ? `: ${JSON.stringify(msg.error.data)}` : ""));
        e.code = msg.error.code;
        p.reject(e);
      } else p.resolve(msg.result);
      return;
    }
    if (msg.method === "session/update") {
      this.emit("update", msg.params);
      return;
    }
    if (msg.id !== undefined && msg.method === "session/request_permission") {
      // The UI must call respond(result).
      const respond = (result) => this.#send({ jsonrpc: "2.0", id: msg.id, result });
      this.emit("permission", msg.params, respond);
      return;
    }
    if (msg.id !== undefined) {
      this.#send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `method not supported: ${msg.method}` } });
    }
  }

  // ---- ACP convenience wrappers ----
  initialize() {
    return this.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "deepseek-harness-tui", version: "0.1.0" },
    });
  }
  newSession(cwd) {
    return this.request("session/new", { cwd, mcpServers: [] });
  }
  resumeSession(sessionId, cwd) {
    return this.request("session/resume", { sessionId, cwd, mcpServers: [] });
  }
  listSessions(cwd) {
    return this.request("session/list", { cwd });
  }
  closeSession(sessionId) {
    return this.request("session/close", { sessionId });
  }
  prompt(sessionId, text) {
    return this.request("session/prompt", { sessionId, prompt: [{ type: "text", text }] });
  }
  cancel(sessionId) {
    this.notify("session/cancel", { sessionId });
  }
  setConfig(sessionId, configId, value) {
    return this.request("session/set_config_option", { sessionId, configId, value });
  }

  dispose() {
    if (this.closed) return;
    try {
      this.child.stdin.end(); // dsh acp exits on stdin EOF
    } catch {}
    setTimeout(() => {
      try {
        this.child.kill();
      } catch {}
    }, 3000).unref();
  }
}
