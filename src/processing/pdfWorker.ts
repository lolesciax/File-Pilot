import type {
  InputFile,
  Options,
  PageEdit,
  ToolId,
  OutputFile,
  JobContext,
} from "../types";
export function runPDFWorker(
  id: ToolId,
  files: InputFile[],
  options: Options,
  pages: PageEdit[],
  ctx: JobContext,
): Promise<OutputFile[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./workers/pdf.worker.ts", import.meta.url),
      { type: "module" },
    );
    function cleanup() {
      worker.terminate();
      ctx.signal.removeEventListener("abort", cancel);
    }
    function cancel() {
      cleanup();
      reject(new DOMException("Processing cancelled", "AbortError"));
    }
    if (ctx.signal.aborted) {
      cancel();
      return;
    }
    ctx.signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        completed: number;
        total: number;
        detail: string;
        outputs: OutputFile[];
        message: string;
      };
      if (data.type === "progress")
        ctx.progress(data.completed, data.total, data.detail);
      else if (data.type === "result") {
        cleanup();
        resolve(data.outputs);
      } else {
        cleanup();
        reject(new Error(data.message));
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "The PDF worker stopped unexpectedly. Try a smaller document.",
        ),
      );
    };
    worker.postMessage({ id, files, options, pages });
  });
}
