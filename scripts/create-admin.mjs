import { scryptAsync } from "@noble/hashes/scrypt";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE || "propietario";
const beta = process.argv.includes("--beta");
if (
  !email ||
  !password ||
  password.length < 14 ||
  !["propietario", "superadmin", "personal"].includes(role)
) {
  console.error(
    "Define ADMIN_EMAIL, ADMIN_PASSWORD (mínimo 14 caracteres) y opcionalmente ADMIN_ROLE. No se imprimirá la contraseña.",
  );
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = Buffer.from(
  await scryptAsync(password, salt, { N: 16384, r: 8, p: 5, dkLen: 32 }),
).toString("hex");
const encoded = `scrypt$16384$8$5$${salt}$${hash}`;
const esc = (s) => s.replaceAll("'", "''");
mkdirSync("work", { recursive: true });
writeFileSync(
  "work/create-admin.sql",
  `INSERT INTO users(id,business_id,email,password_hash,role) VALUES('${randomUUID()}','mary','${esc(email.toLowerCase())}','${encoded}','${role}');`,
);
try {
  const r = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "--config",
      "wrangler.worker.jsonc",
      "d1",
      "execute",
      beta ? "mary-beta" : "mary",
      ...(process.argv.includes("--remote")
        ? ["--remote", "--env", beta ? "beta" : "production"]
        : ["--local"]),
      "--file=work/create-admin.sql",
    ],
    { stdio: "inherit" },
  );
  process.exitCode = r.status ?? 1;
} finally {
  unlinkSync("work/create-admin.sql");
}
