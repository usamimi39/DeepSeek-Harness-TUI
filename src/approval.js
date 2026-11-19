// Client-side approval policy: auto mode and per-session "don't ask again" rules.
// DSH only offers allow-once / reject-once, so everything beyond that is decided here.

/** The command line of a shell-like tool call, if any. */
export function commandOf(rawInput) {
  if (typeof rawInput === "string") return rawInput;
  for (const k of ["command", "cmd", "script"]) if (typeof rawInput?.[k] === "string") return rawInput[k];
  return undefined;
}

// Tools whose first word alone says too little ("git push" vs "git status").
const TWO_WORD = new Set(["git", "npm", "npx", "pnpm", "yarn", "docker", "kubectl", "gh", "wsl", "wsl.exe", "dotnet", "cargo", "pip", "uv"]);

/**
 * Key for "don't ask again this session": the tool plus the command's leading word(s),
 * e.g. "pwsh: wsl.exe -d" or "pwsh: git commit"; non-shell tools are keyed by name only.
 */
export function ruleKey(title, rawInput) {
  const cmd = commandOf(rawInput);
  if (!cmd) return title ?? "tool";
  const words = cmd.trim().split(/\s+/);
  const head = TWO_WORD.has(words[0]?.toLowerCase()) ? words.slice(0, 2) : words.slice(0, 1);
  return `${title}: ${head.join(" ")}`;
}

// Destructive or hard-to-undo operations: auto mode still asks for these.
const DANGEROUS = [
  [/\brm\s+(-\w*r\w*f|-\w*f\w*r|--recursive\s+--force|--force\s+--recursive)/, "recursiveForceDelete"],
  [/\bremove-item\b[^|;]*-recurse/, "recursiveDelete"],
  [/\b(del|erase)\s+[^|;]*\/s\b|\brmdir\s+[^|;]*\/s\b|\brd\s+\/s\b/, "recursiveDelete"],
  [/\bformat(-volume)?\b\s+\w:|\bmkfs\b|\bdd\s+if=|\bdiskpart\b|\bclear-disk\b/, "diskWipe"],
  [/\bgit\s+push\b[^|;]*(--force\b|-f\b|--force-with-lease)/, "forcePush"],
  [/\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-\w*f|\bgit\s+checkout\s+--\s+\.|\bgit\s+branch\s+-D\b/, "discardChanges"],
  [/\bdocker\s+(system|volume|image|container|network)\s+(prune|rm)\b|\bdocker\s+rm\s+-f\b|\bdocker\s+compose\s+down\s+[^|;]*-v\b/, "docker"],
  [/\b(shutdown|reboot|restart-computer|stop-computer)\b/, "shutdown"],
  [/\breg\s+(delete|add)\b|\bremove-itemproperty\b|\bset-executionpolicy\b/, "registry"],
  [/(curl|wget|iwr|invoke-webrequest)[^|]*\|\s*(sh|bash|iex|invoke-expression)\b/, "pipeToShell"],
  [/\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b/, "dropDb"],
  [/\bsudo\b|\brunas\b|start-process\b[^|;]*-verb\s+runas/, "admin"],
  [/\bchmod\s+(-R\s+)?777\b|\bchown\s+-R\b/, "chmod"],
];

/** Why this call is too risky to auto-approve (an i18n key under danger.*), or undefined. */
export function dangerReason(rawInput) {
  const cmd = commandOf(rawInput);
  if (!cmd) return undefined;
  const c = cmd.toLowerCase();
  // lowercased for PowerShell's case-insensitive cmdlets; original for case-sensitive flags (git branch -D)
  for (const [re, reason] of DANGEROUS) if (re.test(c) || re.test(cmd)) return reason;
  return undefined;
}
