import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

async function listJsFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) output.push(...await listJsFiles(path));
    else if (/\.(mjs|js)$/.test(entry.name)) output.push(path);
  }
  return output;
}

const files = ["server.mjs", "build.mjs", ...(await listJsFiles("src")), ...(await listJsFiles("scripts")), ...(await listJsFiles("tests"))];
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`${file}\n${result.stderr || result.stdout}`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`Syntax check passed for ${files.length} JavaScript files.`);
