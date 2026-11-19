import { build } from "esbuild";
import { readFileSync } from "node:fs";
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/deepseek.mjs",
  alias: { "react-devtools-core": "./src/stub-devtools.js" },
  define: { "process.env.NODE_ENV": '"production"', __DEEPSEEK_TUI_VERSION__: JSON.stringify(version) },
  banner: { js: "#!/usr/bin/env node\nimport { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
