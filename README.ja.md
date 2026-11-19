# DeepSeek Harness TUI

[English](README.md) · **日本語**

Claude Code みたいに、ターミナルで `cd` して `deepseek` と打つだけで DeepSeek Harness のエージェントと会話できる TUI。

```
[deepseek (Ink/React)] ⇄ ACP (JSON-RPC/stdio) ⇄ [DeepSeek Harness.exe --profile acp] → DeepSeek
```

## 必要なもの
- Windows に DeepSeek Harness（デスクトップ版）がインストールされていて、ログイン済みであること
- Node.js 20 以上（Windows 側。WSL から使う場合は WSL 側にも）

## 使い方
```
deepseek                       # カレントディレクトリで新しいセッション
deepseek "テストを直して"        # 最初のプロンプト付きで起動
deepseek -c                    # このディレクトリの最新セッションを再開（履歴も再表示）
deepseek -r <session-id>       # 指定セッションを再開
deepseek --auto                # 自動承認モードで起動
deepseek --permission-mode read-only | workspace-write | danger-full-access
```
TUI 内: `/help` `/model` `/effort` `/resume` `/clear` `/thinking` `/status` `/language` `/exit`
キー: Enter 送信 / `\`+Enter 改行 / Esc 中断 / ↑↓ 履歴 / Shift+Tab 自動承認の切替 / Ctrl+C×2 終了

### 自動承認モード
エージェントがサンドボックスの外に出たいとき（ワークスペース外への書き込みなど）に出る承認を、自動で許可します。
- **Shift+Tab** で切り替え、`--auto` で最初からオン
- `rm -rf`、`Remove-Item -Recurse`、`git push --force`、`git reset --hard`、`docker volume rm`、
  `curl … | sh` などの**危険な操作は、自動承認モードでも必ず確認**します
- 承認画面の「はい、このセッション中は「pwsh: git commit」を聞かない」を選ぶと、
  同じ種類（ツール名 + コマンドの先頭の単語）はそのセッション中は聞かれなくなります
- 危険な操作の判定はパターンマッチなので完全ではありません。大事な環境では気をつけて使ってください

### 言語
UI は英語と日本語に対応しています。デフォルトは英語で、`/language` で切り替えると保存されます。

## インストール
```
npm install && npm run build
npm link                                               # Windows: deepseek.cmd が %APPDATA%\npm に入る
ln -sf "$PWD/bin/deepseek-wsl" ~/.local/bin/deepseek   # WSL
```

## 実装メモ
- WSL では WSL 側の node で TUI を動かし、interop で Windows の DeepSeek Harness を起動する
  （Windows の node.exe を WSL から呼ぶと TTY にならないため）。
- 依存を esbuild で 1 ファイルにバンドルしているのは、WSL から /mnt/c の大量の小ファイルを読むと極端に遅いため。
- 入力ボックスは画面下に固定。動的領域に `minHeight` + flex スペーサーを入れ、`<Static>` に流れた行数ぶん縮める。
  確定したアイテムは 1 フレーム live 領域で `renderToString` により行数を測ってから Static に移す
  （描画中・コミット中に `renderToString` を呼ぶと空文字 / Yoga 破損になるので `setImmediate` で測る）。
- IME 対応: 入力は自前で折り返し（全角=2桁）、`useCursor` で本物のカーソルを入力位置に置く。
- 設定（モデル・推論の強さ・言語）は `%USERPROFILE%\.dsh\deepseek-harness-tui\config.json` に保存（Windows/WSL 共通）。
  API キーが無く未選択なら DeepSeek Account のモデルを自動選択。
- UI の文字列は `src/i18n.js`、承認の判定は `src/approval.js`、ピクセルアートは `src/art.js`
  （パレット + 1 行ずつの文字列、`.` は透明）。
- DSH のプラグイン（`dsh tui`）として動かす計画は [docs/PLUGIN.md](docs/PLUGIN.md)。

## 環境変数
- `DEEPSEEK_TUI_HARNESS_DIR` DeepSeek Harness のインストール先（Windows パス）
- `DEEPSEEK_TUI_DSH_HOME` DSH ホーム（この OS から見たパス）
- `DEEPSEEK_TUI_COMPANION=1` 入力欄の横に dafeiyu が住むお供モード（実験的・非公開）
