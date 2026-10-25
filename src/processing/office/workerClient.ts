import type { Options, OutputFile, ToolId } from "../../types";
import type { OfficeFormat } from "./package";
type OfficeMessage =
  | { type: "validate"; file: File; format: OfficeFormat }
  | { type: "convert"; file: File; id: ToolId; options: Options };
export function officeWorker<T = OutputFile>(
  request: OfficeMessage,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/office.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Office processing exceeded 90 seconds. Try a smaller or simpler document.",
        ),
      );
    }, 90000);
    function cleanup() {
      clearTimeout(timeout);
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    }
    function cancel() {
      cleanup();
      reject(new DOMException("Processing cancelled", "AbortError"));
    }
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ type: string; result: T; message: string }>,
    ) => {
      cleanup();
      if (event.data.type === "result") resolve(event.data.result);
      else reject(new Error(event.data.message));
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "The Office converter could not run. Try a smaller or simpler document.",
        ),
      );
    };
    worker.postMessage(request);
  });
}
