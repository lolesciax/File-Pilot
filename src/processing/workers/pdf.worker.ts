import { processPDF } from "../pdf";
import type { InputFile, Options, PageEdit, ToolId } from "../../types";
globalThis.onmessage = async (
  event: MessageEvent<{
    id: ToolId;
    files: InputFile[];
    options: Options;
    pages: PageEdit[];
  }>,
) => {
  try {
    const { id, files, options, pages } = event.data;
    const outputs = await processPDF(id, files, options, pages, {
      signal: new AbortController().signal,
      progress: (completed, total, detail) =>
        globalThis.postMessage({ type: "progress", completed, total, detail }),
    });
    globalThis.postMessage({ type: "result", outputs });
  } catch (e) {
    globalThis.postMessage({
      type: "error",
      message: e instanceof Error ? e.message : "PDF processing failed.",
    });
  }
};
