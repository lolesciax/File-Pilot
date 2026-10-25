import { zip } from "fflate";
import { MAX_TOTAL, uniqueNames } from "../lib/files";
import type { OutputFile } from "../types";
export async function archive(
  files: Pick<OutputFile, "name" | "blob">[],
): Promise<Blob> {
  if (files.reduce((n, f) => n + f.blob.size, 0) > MAX_TOTAL)
    throw new Error(
      "ZIP exports are limited to 300 MB. Download files individually.",
    );
  const names = uniqueNames(files.map((f) => f.name));
  const entries: Record<string, Uint8Array> = {};
  for (let i = 0; i < files.length; i++)
    entries[names[i]] = new Uint8Array(await files[i].blob.arrayBuffer());
  return new Promise((resolve, reject) =>
    zip(entries, { level: 1 }, (error, data) =>
      error
        ? reject(error)
        : resolve(
            new Blob([new Uint8Array(data)], { type: "application/zip" }),
          ),
    ),
  );
}
