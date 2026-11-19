import { parseArgs } from "node:util";
import React from "react";
import { render } from "ink";
import { AcpAgent, workspaceCwd, platformLabel } from "./agent.js";
import { App } from "./app.js";
import { t, setLanguage } from "./i18n.js";
import { loadPrefs } from "./prefs.js";

setLanguage(loadPrefs().language ?? "en");



let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      continue: { type: "boolean", short: "c" },
      resume: { type: "string", short: "r" },
      "permission-mode": { type: "string" },
      auto: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
} catch (e) {
  console.error(e.message + "\n\n" + t("cli.help"));
  process.exit(2);
}
if (args.values.help) {
  console.log(t("cli.help"));
  process.exit(0);
}
const mode = args.values["permission-mode"];
if (mode && !["read-only", "workspace-write", "danger-full-access"].includes(mode)) {
  console.error(t("cli.badMode", { mode }));
  process.exit(2);
}
if (!process.stdin.isTTY) {
  console.error(t("cli.notTty"));
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
    initialAuto: Boolean(args.values.auto),
  }),
  { exitOnCtrlC: false },
);
await app.waitUntilExit();
agent.dispose();
