# DeepSeek Harness TUI

Claude Code みたいに、ターミナルで `cd` して `deepseek` と打つだけで DeepSeek Harness のエージェントと会話できる TUI。

```
[deepseek (Ink/React)] ⇄ ACP (JSON-RPC/stdio) ⇄ [DeepSeek Harness.exe --profile acp] → DeepSeek
```

## 使い方
```
deepseek                       # カレントディレクトリで新しいセッション
deepseek "テストを直して"        # 最初のプロンプト付きで起動
deepseek -c                    # このディレクトリの最新セッションを再開（履歴も再表示）
deepseek -r <session-id>       # 指定セッションを再開
deepseek --permission-mode read-only | workspace-write | danger-full-access
```
TUI 内: `/help` `/model` `/effort` `/resume` `/clear` `/thinking` `/status` `/exit`
キー: Enter 送信 / `\`+Enter 改行 / Esc 中断 / ↑↓ 履歴 / Ctrl+C×2 終了

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
- モデル/推論の選択は `%USERPROFILE%\.dsh\deepseek-harness-tui\config.json` に保存（Windows/WSL 共通）。
  API キーが無く未選択なら DeepSeek Account のモデルを自動選択。
- ピクセルアートは `src/art.js`（パレット + 1 行ずつの文字列、`.` は透明）。

## 環境変数
- `DEEPSEEK_TUI_HARNESS_DIR` DeepSeek Harness のインストール先（Windows パス）
- `DEEPSEEK_TUI_DSH_HOME` DSH ホーム（この OS から見たパス）
- `DEEPSEEK_TUI_COMPANION=1` 入力欄の横に dafeiyu が住むお供モード（実験的・非公開）
