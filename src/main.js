import { parseArgs } from "node:util";
import React from "react";
import { render } from "ink";
import { AcpAgent, workspaceCwd, platformLabel } from "./agent.js";
import { App } from "./app.js";

const HELP = `deepseek — DeepSeek Harness TUI: DeepSeek Harness を Claude Code みたいにターミナルで使う

Usage:
  deepseek [options] [prompt]

Options:
  -c, --continue               このディレクトリの最新セッションを再開
  -r, --resume <id>            指定したセッションを再開（TUI 内なら /resume で一覧から選べる）
      --permission-mode <mode> read-only | workspace-write (default) | danger-full-access
  -h, --help                   このヘルプ

カレントディレクトリがワークスペースになります。Windows と WSL のどちらからでも使えます。`;

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      continue: { type: "boolean", short: "c" },
      resume: { type: "string", short: "r" },
      "permission-mode": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
} catch (e) {
  console.error(e.message + "\n\n" + HELP);
  process.exit(2);
}
if (args.values.help) {
  console.log(HELP);
  process.exit(0);
}
const mode = args.values["permission-mode"];
if (mode && !["read-only", "workspace-write", "danger-full-access"].includes(mode)) {
  console.error(`不明な permission mode: ${mode}`);
  process.exit(2);
}
if (!process.stdin.isTTY) {
  console.error(
    "deepseek は対話的なターミナルで起動してください（stdin が TTY ではありません）。\n" +
      "非対話で使うなら: dsh headless \"タスク\"",
  );
  process.exit(1);
}

let agent, cwd;
try {
  cwd = workspaceCwd();
  agent = new AcpAgent({ permissionMode: mode });
  agent.start();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Push the shell's content into scrollback so our output starts at the bottom row (input pinned there).
// Then go back to the top-left: the banner starts at the top and the input is pinned to the bottom.
process.stdout.write("\n".repeat(Math.max(0, (process.stdout.rows || 24) - 1)) + "\x1b[H");

const app = render(
  React.createElement(App, {
    agent,
    cwd,
    platform: platformLabel,
    initialPrompt: args.positionals.join(" ") || undefined,
    resumeId: args.values.resume,
    continueLast: args.values.continue,
    permissionMode: mode,
  }),
  { exitOnCtrlC: false },
);
await app.waitUntilExit();
agent.dispose();
