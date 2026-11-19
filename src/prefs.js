// DeepSeek Harness TUI preferences, stored under the DSH home so Windows and WSL share them.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { dshHomeLocal } from "./agent.js";

const file = () => join(dshHomeLocal(), "deepseek-harness-tui", "config.json");
const legacyFile = () => join(dshHomeLocal(), "dsht", "config.json"); // before the rename

export function loadPrefs() {
  for (const f of [file(), legacyFile()]) {
    try {
      return JSON.parse(readFileSync(f, "utf8"));
    } catch {}
  }
  return {};
}

export function savePrefs(patch) {
  const next = { ...loadPrefs(), ...patch };
  try {
    mkdirSync(dirname(file()), { recursive: true });
    writeFileSync(file(), JSON.stringify(next, null, 2));
  } catch {}
  return next;
}

/** All selectable values of a config option (flattening provider groups). */
function values(opt) {
  return (opt?.options ?? []).flatMap((g) => (Array.isArray(g.options) ? g.options : [g])).map((o) => o.value);
}

/**
 * Decide which config changes to apply to a session: saved choices first; otherwise, when the
 * API-key route is selected but no key is present, fall back to the logged-in DeepSeek account.
 * @returns array of { configId, value }
 */
export function preferredConfig(configOptions, { isNew }) {
  const prefs = loadPrefs();
  const changes = [];
  const model = configOptions?.find((o) => o.category === "model");
  if (model) {
    const avail = values(model);
    const currentProvider = safeProvider(model.currentValue);
    if (isNew && prefs.model && avail.includes(prefs.model) && prefs.model !== model.currentValue) {
      changes.push({ configId: model.id, value: prefs.model });
    } else if (currentProvider === "deepseek-official" && !process.env.DEEPSEEK_API_KEY) {
      const account = model.options?.find((g) => g.group === "deepseek-account")?.options?.[0];
      if (account) changes.push({ configId: model.id, value: account.value });
    }
  }
  const effort = configOptions?.find((o) => o.category === "thought_level");
  if (isNew && effort && prefs.effort && values(effort).includes(prefs.effort) && prefs.effort !== effort.currentValue) {
    changes.push({ configId: effort.id, value: prefs.effort, after: "model" });
  }
  return changes;
}

function safeProvider(v) {
  try {
    return JSON.parse(v)[0];
  } catch {
    return undefined;
  }
}
