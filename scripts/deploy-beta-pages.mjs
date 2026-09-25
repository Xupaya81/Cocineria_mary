import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

// Pages uses wrangler.jsonc in its project root, not a custom --config argument.
const config = readFileSync("wrangler.beta.pages.jsonc", "utf8");
if (config.includes("REPLACE") || !config.includes('"BETA_CLOSED": "true"'))
  throw new Error(
    "Configura primero Cloudflare Access en wrangler.beta.pages.jsonc.",
  );
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim())
  throw new Error(
    "Guarda los cambios en Git antes de desplegar para identificar el commit exacto.",
  );
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const target = `work/beta-pages-${Date.now()}`;
mkdirSync(target, { recursive: true });
for (const path of ["dist", "functions", "shared"])
  cpSync(path, `${target}/${path}`, { recursive: true });
writeFileSync(`${target}/wrangler.jsonc`, config);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "--cwd",
    target,
    "pages",
    "deploy",
    "dist",
    "--project-name",
    "cocineria-mary-beta",
    "--branch",
    "main",
    "--commit-hash",
    commit,
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
