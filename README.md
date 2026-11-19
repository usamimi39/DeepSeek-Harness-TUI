# DeepSeek Harness TUI

**English** · [日本語](README.ja.md)

A Claude Code-style terminal UI for DeepSeek Harness: `cd` into a project, type `deepseek`, and talk to the
DeepSeek Harness agent right in your terminal.

```
[deepseek (Ink/React)] ⇄ ACP (JSON-RPC/stdio) ⇄ [DeepSeek Harness.exe --profile acp] → DeepSeek
```

## Requirements
- DeepSeek Harness (desktop app) installed on Windows and signed in
- Node.js 20+ on Windows (and inside WSL too, if you launch it from WSL)

## Usage
```
deepseek                       # new session in the current directory
deepseek "fix the tests"       # start with a first prompt
deepseek -c                    # continue the latest session here (history is replayed)
deepseek -r <session-id>       # resume a specific session
deepseek --auto                # start in auto-approve mode
deepseek --permission-mode read-only | workspace-write | danger-full-access
```
Inside the TUI: `/help` `/model` `/effort` `/resume` `/clear` `/thinking` `/status` `/language` `/exit`
Keys: Enter send / `\`+Enter newline / Esc interrupt / ↑↓ history / Shift+Tab toggle auto-approve / Ctrl+C×2 exit

### Auto-approve mode
Automatically approves the prompts the agent raises when it wants to leave the sandbox (e.g. writing outside
the workspace).
- Toggle with **Shift+Tab**, or start with `--auto`
- **Dangerous operations always ask**, even in auto mode: `rm -rf`, `Remove-Item -Recurse`, `git push --force`,
  `git reset --hard`, `docker volume rm`, `curl … | sh`, and more
- Choosing "Yes, and don't ask again for “pwsh: git commit” this session" in the prompt stops prompts for the
  same kind of operation (tool name + leading command words) for the rest of the session
- Danger detection is pattern-based and not exhaustive — be careful in important environments

### Language
The UI is available in English (default) and Japanese. Switch with `/language`; the choice is saved.

## Install
```
npm install && npm run build
npm link                                               # Windows: puts deepseek.cmd in %APPDATA%\npm
ln -sf "$PWD/bin/deepseek-wsl" ~/.local/bin/deepseek   # WSL
```

## Implementation notes
- From WSL, the TUI runs on WSL's own Node and spawns the Windows DeepSeek Harness through interop
  (a Windows `node.exe` started from WSL does not get a TTY).
- Dependencies are bundled into a single file with esbuild, because loading thousands of small files from
  `/mnt/c` in WSL is extremely slow.
- The input box is pinned to the bottom of the screen: the dynamic region has a `minHeight` plus a flex spacer
  that shrinks as lines scroll into `<Static>`. A finished item spends one frame in the live area so its
  height can be measured with `renderToString` (which must run in `setImmediate` — during render it returns
  an empty string, and during commit it corrupts Yoga's state).
- IME support: the input is wrapped by hand (full-width = 2 columns) and `useCursor` places the real terminal
  cursor at the input position, which is where the IME draws its composition text.
- Settings (model, reasoning effort, language) are saved in `%USERPROFILE%\.dsh\deepseek-harness-tui\config.json`
  and shared between Windows and WSL. Without an API key, the signed-in DeepSeek Account model is picked.
- UI strings live in `src/i18n.js`, the approval policy in `src/approval.js`, and the pixel art in `src/art.js`
  (a palette plus one string per row, `.` = transparent).
- The plan to run this as a DSH plugin (`dsh tui`) is in [docs/PLUGIN.md](docs/PLUGIN.md) (Japanese).

## Environment variables
- `DEEPSEEK_TUI_HARNESS_DIR` DeepSeek Harness install directory (Windows path)
- `DEEPSEEK_TUI_DSH_HOME` DSH home directory (as seen from the current OS)
- `DEEPSEEK_TUI_COMPANION=1` experimental, unlisted "companion" mode with dafeiyu living next to the input
