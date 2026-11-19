# DSH プラグインとしての配布（設計メモ）

今の `deepseek` コマンドは「外から `DeepSeek Harness.exe --profile acp` を子プロセスで起動して ACP で話す」
スタンドアロン版。これを **DSH のバンドル（プラグイン）として配布**し、`dsh tui` で起動できるようにする。

## DSH のプラグインの仕組み（DSH 0.2.2 で確認）
- プロファイル = `$DSH_HOME/profiles/<name>/`（npm ディレクトリ）。`package.json` の
  `dsh.profile.bundles` に並んだバンドルの `cordis.patch.yml` を順に重ねて構成される。
- バンドル = npm パッケージ。`package.json` に `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`、
  `cordis.patch.yml` で cordis プラグインを `insert` する（`!!js` 式で ctx を参照可能）。
- `dsh plugin --profile <name> add <pkg>`：プロファイルが無ければ
  `DEFAULT_PROFILE_BUNDLES = ["@deepseek-ai/dsh-base"]` で初期化してから追加。
  → `dsh plugin --profile tui add deepseek-harness-tui` → `dsh tui` で起動、という流れになる。
- 参考: `@deepseek-ai/dsh-acp-app`（`dsh acp` の正体）は dsh-base の上に
  `acp-app-startup`（コマンドライン解析）と `acp`（ACP ブリッジ）を insert しているだけ。

## 方針: ACP ブリッジをプロセス内で使う
`@deepseek-ai/dsh-acp` は通信路を差し替えられる:

```js
const stream = config.stream ?? ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
```

なので、プラグイン版は
1. 自前のプラグイン（`tui-app`）がメモリ上の双方向 ndjson ストリームを作ってサービスとして provide
2. `dsh-acp` をそのストリームで insert（`inject: [tuiAcpStream]`、`config.stream: !!js ctx.get('tuiAcpStream')`）
3. TUI（Ink）は process の stdio を使い、ACP クライアント（`src/agent.js` の JSON-RPC 部分）は
   そのストリーム越しに今と同じプロトコルで話す

→ 子プロセス起動・Harness の場所探し・WSL interop が不要になり、DSH が動く全 OS で動く。

```yaml
# cordis.patch.yml（案）
- id: system-prompt
  config:
    personaPrefix: >-
      You are a coding agent powered by the {{model}} model.
- insert:
    - id: tui-app
      name: deepseek-harness-tui
    - id: acp
      name: '@deepseek-ai/dsh-acp'
      inject: [tuiAcpStream]
      config:
        stream: !!js ctx.get('tuiAcpStream')
        provider: deepseek-account
        model: deepseek-flash
- id: hmr
  disabled: true
```

## そのために今のコードで必要な変更
- [ ] `src/agent.js`: JSON-RPC クライアントと「Harness の子プロセス起動」を分離し、
      任意の行ストリーム（子プロセスの stdio / メモリ上のストリーム）で動く `AcpClient` にする
- [ ] `src/plugin.js`: cordis プラグイン（`name` / `inject: ["cmdlineArgs"]` / `apply(ctx)`）。
      `dsh-cmdline` で引数を解析し、ストリームを provide して Ink を render する
- [ ] Host のログが stderr に出て TUI を崩さないようにする（logger の出力先の調整）
- [ ] パスの扱い: プロセス内なら cwd は Host と同じなので `wslpath` 変換は不要
- [ ] `package.json`: `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`、`exports`、`files`
      （`dist/` と `cordis.patch.yml` のみ）、`peerDependencies: { "@deepseek-ai/cordis": "~4.1.0" }`、
      `private` を外す、`license`
- [ ] スタンドアロン版（`deepseek` コマンド）は残す: 同じ TUI を子プロセス接続で起動するだけ
- [ ] 確認: `dsh plugin --profile tui add <tarball>` → `dsh tui` で起動できること

## 未決
- ライセンス（MIT 想定）と npm のパッケージ名（`deepseek-harness-tui` が空いているか）
- 公式の `dsh tui` プロファイル名と将来衝突しないか（衝突するなら `dsh deepseek-tui` 等）
