import { cp, mkdir, copyFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const target = new URL("public/pdfjs/", root);
await mkdir(target, { recursive: true });
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"])
  await cp(
    new URL(`node_modules/pdfjs-dist/${folder}/`, root),
    new URL(`${folder}/`, target),
    { recursive: true },
  );
await copyFile(
  new URL("node_modules/pdfjs-dist/LICENSE", root),
  new URL("LICENSE", target),
);
console.log("Prepared local PDF.js font and decoder resources.");
