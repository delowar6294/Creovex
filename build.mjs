import { cp, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("src", "dist/src", { recursive: true });
await cp("assets", "dist/assets", { recursive: true });
console.log("Built the static CREOVEX app into dist/.");
