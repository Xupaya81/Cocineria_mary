import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { content } from "./seed-data.mjs";
mkdirSync("work", { recursive: true });
const escape = (s) => s.replaceAll("'", "''");
const sql =
  `INSERT OR IGNORE INTO businesses(id,slug,content) VALUES('mary','cocineria-mary','${escape(JSON.stringify(content))}');\n` +
  Array.from(
    { length: 8 },
    (_, i) =>
      `INSERT OR IGNORE INTO dining_tables(id,business_id,name,capacity,people,status) VALUES('${i + 1}','mary','Mesa ${i + 1}',${i < 4 ? 4 : 6},0,'disponible');`,
  ).join("\n");
writeFileSync("work/seed.sql", sql);
if (process.argv.includes("--generate-only")) process.exit(0);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "--config",
    "wrangler.worker.jsonc",
    "d1",
    "execute",
    "mary",
    "--local",
    "--file=work/seed.sql",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
