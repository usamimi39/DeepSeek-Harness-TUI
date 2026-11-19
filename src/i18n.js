// UI strings. t("key", { name: value }) fills {name} placeholders; array entries (e.g. the mascot's
// lines) are returned as arrays. English is the default; the choice is saved in prefs ("language").

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
];

const en = {
  "banner.tips": "▎ /help for commands · Esc to interrupt · \\+Enter for a newline · Ctrl+C×2 to exit",

  "cmd./help": "List commands and shortcuts",
  "cmd./clear": "Clear the screen and start a new session",
  "cmd./resume": "Resume a past session in this directory",
  "cmd./model": "Switch model",
  "cmd./effort": "Switch reasoning effort",
  "cmd./thinking": "Toggle showing the full thinking",
  "cmd./status": "Show session info",
  "cmd./language": "Change the UI language",
  "cmd./exit": "Exit",

  "help.commands": "Commands:",
  "help.shortcuts": "Shortcuts:",
  "help.keys": [
    "  Enter      send          \\ + Enter  newline",
    "  Esc        interrupt while running / clear the input",
    "  ↑ / ↓      input history",
    "  Ctrl+C×2   exit          Ctrl+U  clear the line",
    "  Shift+Tab  toggle auto-approve (dangerous operations still ask)",
  ],

  "thought.more": "  … +{n} more lines (/thinking to show all)",
  "tool.running": "  ⎿  Running…",
  "tool.more": "… +{n} more lines",
  "tool.noOutput": "  ⎿  (no output)",
  "tool.generic": "Tool",
  "plan.title": "Plan:",
  "picker.footer": "↑↓ to select · Enter to confirm · Esc to cancel",

  "boot.spinner": "Starting DeepSeek Harness…",
  "boot.failed": "Failed to start: {msg}",
  "busy.spinner": "Thinking… ",
  "busy.hint": "({s}s · esc to interrupt)",
  "busy.wait": "Still working on the previous request (press Esc to interrupt)",
  "ctrlc.again": "Press Ctrl+C again to exit",
  "dsh.exited": "The dsh process exited.\n{tail}",
  "dsh.exitedCode": "dsh exited (code {code})\n{tail}",

  "stop.cancelled": "⎿ Interrupted",
  "stop.maxTokens": "⎿ Reached the maximum number of tokens",
  "stop.refusal": "⎿ The agent declined to respond",

  "resume.done": "── Resumed session {id} ──",
  "resume.noneToContinue": "No session to continue in this directory, starting a new one",
  "resume.busy": "Can't /resume while running",
  "resume.empty": "No sessions to resume in this directory",
  "resume.pick": "Choose a session to resume",
  "clear.busy": "Can't /clear while running (press Esc to interrupt first)",
  "exit.resume": "To resume: deepseek --resume {id}",

  "config.unavailable": "This setting is not available",
  "config.saved": "{title}: {label} (also the default from now on)",
  "title.model": "Model",
  "title.effort": "Reasoning effort",
  "thinking.toggled": "Show full thinking: {state} (applies from now on)",
  "language.title": "Language",
  "language.set": "Language: {name}",

  "perm.title": "Allow this operation?",
  "perm.footer": "↑↓ / number keys to select · Enter to confirm · Esc to reject",
  "perm.allow_once": "Yes (this time only)",
  "perm.allow_session": "Yes, and don't ask again for “{key}” this session",
  "perm.allow_always": "Yes (always)",
  "perm.reject_once": "No",
  "perm.reject_always": "No (always)",
  "perm.danger": "⚠ This may be {reason}, so it was not auto-approved",
  "approved.auto": "auto-approved",
  "approved.rule": "allowed",

  "footer.auto": "⏵⏵ auto-approve on",
  "footer.autoHint": " (shift+tab to toggle)",
  "footer.default": "? /help for help · shift+tab to auto-approve",

  "danger.recursiveForceDelete": "a recursive force delete",
  "danger.recursiveDelete": "a recursive delete",
  "danger.diskWipe": "wiping a disk",
  "danger.forcePush": "a force push",
  "danger.discardChanges": "discarding changes",
  "danger.docker": "deleting Docker resources",
  "danger.shutdown": "a restart or shutdown",
  "danger.registry": "changing the registry or system settings",
  "danger.pipeToShell": "running a downloaded script",
  "danger.dropDb": "deleting database data",
  "danger.admin": "running with elevated privileges",
  "danger.chmod": "a bulk permission change",

  "ago.now": "just now",
  "ago.min": "{n}m ago",
  "ago.hour": "{n}h ago",
  "ago.day": "{n}d ago",
  "session.untitled": "(untitled)",
  "session.messages": "{n} msgs",

  "cli.help": `deepseek — DeepSeek Harness TUI: use DeepSeek Harness from the terminal, Claude Code style

Usage:
  deepseek [options] [prompt]

Options:
  -c, --continue               resume the latest session in this directory
  -r, --resume <id>            resume a session (inside the TUI, /resume lists them)
      --permission-mode <mode> read-only | workspace-write (default) | danger-full-access
      --auto                   start in auto-approve mode (dangerous operations still ask; Shift+Tab toggles)
  -h, --help                   show this help

The current directory becomes the workspace. Works from both Windows and WSL.`,
  "cli.badMode": "Unknown permission mode: {mode}",
  "cli.notTty": 'Start deepseek in an interactive terminal (stdin is not a TTY).\nFor non-interactive use: dsh headless "task"',
  "agent.unsupportedOs": "Run deepseek on Windows or WSL (DeepSeek Harness is a Windows app)",
  "agent.notFound": "DeepSeek Harness not found: {path}\nSet DEEPSEEK_TUI_HARNESS_DIR to its install directory",

  // the dafeiyu easter egg (/dafeiyu) and the shelved companion mode
  "egg.greet": ["dafeiyu here! You called?", "Hi hi, it's dafeiyu~", "What's up?"],
  "egg.ate": "I ate {n} tokens this session!",
  "egg.breakdown": "input {input} · cache {cache} · output {output} ({steps} steps)",
  "egg.cache": "Cache hit {pct}%, nice and cheap ♪",
  "egg.hungry": "Haven't eaten anything yet~ so hungry…",
  "egg.tummy": "Tummy: {used} / {size} ({pct}%) {mood}",
  "egg.tummy.lt10": "Plenty of room!",
  "egg.tummy.lt50": "Feeling good~",
  "egg.tummy.lt80": "Getting kinda full…",
  "egg.tummy.full": "Can't eat any more… /clear please",
  "egg.nom": " nom nom… {n} tokens, thanks for the meal",
  "mood.hello": ["dafeiyu here! I'll hang out for a while", "Heya, I'll help out!"],
  "mood.thinking": ["Hmm hmm…", "Leave it to me!", "Thinking~", "Let's see…"],
  "mood.command": ["Running a command", "Here goes!", "Executing~!"],
  "mood.search": ["Going to look!", "Where is it~", "Reading files"],
  "mood.edit": ["Writing…", "Fixing it up", "Rewriting a bit"],
  "mood.working": ["Working hard!", "On it~"],
  "mood.oops": ["Oops, that failed", "Didn't work… once more!", "Hmm, an error"],
  "mood.waiting": ["Can I run this?", "Please check!", "What should I do…?"],
  "mood.success": ["Good work!", "Done~!", "Nailed it!"],
  "mood.cancelled": ["Stopped", "Okay, stopping"],
  "mood.error": ["Ugh, an error…", "Something's off…"],
  "mood.sleepy": ["*yawn*…", "zzz…"],
  "mood.bye": ["See ya~", "Bye bye!"],
};

const ja = {
  "banner.tips": "▎ /help でコマンド一覧 · Esc で中断 · \\+Enter で改行 · Ctrl+C×2 で終了",

  "cmd./help": "コマンドとショートカットの一覧",
  "cmd./clear": "画面を消して新しいセッションを開始",
  "cmd./resume": "このディレクトリの過去セッションを再開",
  "cmd./model": "モデルを切り替え",
  "cmd./effort": "推論の強さ (reasoning effort) を切り替え",
  "cmd./thinking": "思考過程の表示 ON/OFF",
  "cmd./status": "セッション情報を表示",
  "cmd./language": "表示言語を切り替え",
  "cmd./exit": "終了",

  "help.commands": "コマンド:",
  "help.shortcuts": "ショートカット:",
  "help.keys": [
    "  Enter      送信          \\ + Enter  改行",
    "  Esc        実行中なら中断 / 入力をクリア",
    "  ↑ / ↓      入力履歴",
    "  Ctrl+C×2   終了          Ctrl+U  行をクリア",
    "  Shift+Tab  自動承認モードの切替（危険な操作だけは確認します）",
  ],

  "thought.more": "  … +{n} 行 (/thinking で全文表示)",
  "tool.running": "  ⎿  実行中…",
  "tool.more": "… +{n} 行",
  "tool.noOutput": "  ⎿  (出力なし)",
  "tool.generic": "ツール",
  "plan.title": "計画:",
  "picker.footer": "↑↓ で選択・Enter で決定・Esc でキャンセル",

  "boot.spinner": "DeepSeek Harness を起動中…",
  "boot.failed": "起動に失敗しました: {msg}",
  "busy.spinner": "考え中… ",
  "busy.hint": "({s}s · esc で中断)",
  "busy.wait": "まだ前の処理が終わっていません（Esc で中断できます）",
  "ctrlc.again": "もう一度 Ctrl+C で終了",
  "dsh.exited": "dsh プロセスが終了しました。\n{tail}",
  "dsh.exitedCode": "dsh が終了しました (code {code})\n{tail}",

  "stop.cancelled": "⎿ 中断しました",
  "stop.maxTokens": "⎿ 最大トークン数に達しました",
  "stop.refusal": "⎿ エージェントが応答を拒否しました",

  "resume.done": "── セッション {id} を再開しました ──",
  "resume.noneToContinue": "このディレクトリに再開できるセッションがないので、新しく始めます",
  "resume.busy": "実行中は /resume できません",
  "resume.empty": "このディレクトリに再開できるセッションはありません",
  "resume.pick": "再開するセッションを選んでください",
  "clear.busy": "実行中は /clear できません（Esc で中断してから）",
  "exit.resume": "再開するには: deepseek --resume {id}",

  "config.unavailable": "この設定は利用できません",
  "config.saved": "{title}: {label}（次回以降のデフォルトにも使います）",
  "title.model": "モデル",
  "title.effort": "推論の強さ",
  "thinking.toggled": "思考過程の全文表示: {state}（これ以降の表示に反映）",
  "language.title": "言語 / Language",
  "language.set": "表示言語: {name}",

  "perm.title": "この操作を実行してもいいですか？",
  "perm.footer": "↑↓ / 数字キーで選択・Enter で決定・Esc で拒否",
  "perm.allow_once": "はい（今回だけ許可）",
  "perm.allow_session": "はい、このセッション中は「{key}」を聞かない",
  "perm.allow_always": "はい（常に許可）",
  "perm.reject_once": "いいえ",
  "perm.reject_always": "いいえ（常に拒否）",
  "perm.danger": "⚠ {reason}の可能性があるので、自動承認しませんでした",
  "approved.auto": "自動承認",
  "approved.rule": "許可済み",

  "footer.auto": "⏵⏵ 自動承認モード",
  "footer.autoHint": "（shift+tab で切替）",
  "footer.default": "? /help でヘルプ · shift+tab で自動承認",

  "danger.recursiveForceDelete": "再帰的な強制削除",
  "danger.recursiveDelete": "再帰的な削除",
  "danger.diskWipe": "ディスクの初期化",
  "danger.forcePush": "強制 push",
  "danger.discardChanges": "変更の破棄",
  "danger.docker": "Docker リソースの削除",
  "danger.shutdown": "再起動・シャットダウン",
  "danger.registry": "レジストリ・システム設定の変更",
  "danger.pipeToShell": "ダウンロードしたスクリプトの実行",
  "danger.dropDb": "データベースの削除",
  "danger.admin": "管理者権限での実行",
  "danger.chmod": "権限の一括変更",

  "ago.now": "たった今",
  "ago.min": "{n}分前",
  "ago.hour": "{n}時間前",
  "ago.day": "{n}日前",
  "session.untitled": "(無題)",
  "session.messages": "{n}件",

  "cli.help": `deepseek — DeepSeek Harness TUI: DeepSeek Harness を Claude Code みたいにターミナルで使う

Usage:
  deepseek [options] [prompt]

Options:
  -c, --continue               このディレクトリの最新セッションを再開
  -r, --resume <id>            指定したセッションを再開（TUI 内なら /resume で一覧から選べる）
      --permission-mode <mode> read-only | workspace-write (default) | danger-full-access
      --auto                   自動承認モードで起動（危険な操作だけは確認。Shift+Tab で切替）
  -h, --help                   このヘルプ

カレントディレクトリがワークスペースになります。Windows と WSL のどちらからでも使えます。`,
  "cli.badMode": "不明な permission mode: {mode}",
  "cli.notTty": 'deepseek は対話的なターミナルで起動してください（stdin が TTY ではありません）。\n非対話で使うなら: dsh headless "タスク"',
  "agent.unsupportedOs": "deepseek は Windows か WSL で動かしてください（DeepSeek Harness は Windows アプリです）",
  "agent.notFound": "DeepSeek Harness が見つかりません: {path}\n環境変数 DEEPSEEK_TUI_HARNESS_DIR でインストール先を指定できます",

  "egg.greet": ["大肥鱼だよ！呼んだ？", "はーい、dafeiyu だよ〜", "なになに？"],
  "egg.ate": "このセッションで {n} トークン食べたよ！",
  "egg.breakdown": "入力 {input} · キャッシュ {cache} · 出力 {output}（{steps} ステップ）",
  "egg.cache": "キャッシュが {pct}% 効いてて安上がり♪",
  "egg.hungry": "まだなにも食べてないよ〜 おなかすいた…",
  "egg.tummy": "おなか: {used} / {size}（{pct}%） {mood}",
  "egg.tummy.lt10": "まだまだ入るよ！",
  "egg.tummy.lt50": "いい感じ〜",
  "egg.tummy.lt80": "そろそろおなかいっぱいかも…",
  "egg.tummy.full": "もう入らないよぉ… /clear してほしいな",
  "egg.nom": " もぐもぐ… {n} トークンごちそうさま",
  "mood.hello": ["大肥鱼だよ！しばらく一緒にいるね", "やっほー、お手伝いするよ！"],
  "mood.thinking": ["ふむふむ…", "まかせて！", "考えてるよ〜", "うーんとね…"],
  "mood.command": ["コマンド叩くね", "えいっ", "実行〜！"],
  "mood.search": ["探してくる！", "どこかな〜", "ファイル見てるよ"],
  "mood.edit": ["書き書き…", "直してるよ", "ちょっと書き換えるね"],
  "mood.working": ["がんばってる！", "作業中〜"],
  "mood.oops": ["あれっ、失敗しちゃった", "うまくいかない…もう一回！", "むむ、エラー出た"],
  "mood.waiting": ["これ実行していい？", "確認おねがい！", "どうする…？"],
  "mood.success": ["おつかれさま！", "できたよ〜！", "ばっちり！"],
  "mood.cancelled": ["止めたよ", "はーい、ストップ"],
  "mood.error": ["うぅ、エラー…", "なにか変かも…"],
  "mood.sleepy": ["ふわぁ…", "zzz…"],
  "mood.bye": ["またね〜", "ばいばい！"],
};

const DICTS = { en, ja };
let current = "en";

export function setLanguage(code) {
  current = DICTS[code] ? code : "en";
}
export function getLanguage() {
  return current;
}

/** Look up a UI string; falls back to English, then to the key itself. */
export function t(key, vars) {
  const v = DICTS[current][key] ?? en[key] ?? key;
  if (Array.isArray(v) || !vars) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}
