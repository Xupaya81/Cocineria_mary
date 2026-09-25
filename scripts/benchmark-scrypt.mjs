import { scryptAsync } from "@noble/hashes/scrypt";
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";

// Host benchmark only. This does not measure Cloudflare billing CPU or full HTTP flows.
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("hex");
const samples = [];
for (const operation of ["register-hash", "login-verify-derivation"]) {
  for (let i = 0; i < 5; i++) {
    const cpu = process.cpuUsage(),
      start = performance.now();
    await scryptAsync(password, salt, { N: 16384, r: 8, p: 5, dkLen: 32 });
    const elapsedMs = performance.now() - start,
      usage = process.cpuUsage(cpu);
    samples.push({
      operation,
      sample: i + 1,
      elapsedMs: Math.round(elapsedMs),
      hostCpuMs: Math.round((usage.user + usage.system) / 1000),
    });
  }
}
const report = {
  environment: "Local Node.js; NOT Cloudflare production",
  node: process.version,
  parameters: { N: 16384, r: 8, p: 5, dkLen: 32 },
  samples,
};
mkdirSync("work", { recursive: true });
writeFileSync("work/scrypt-benchmark.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
