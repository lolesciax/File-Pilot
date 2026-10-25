import { inspectOfficePackage, type OfficeFormat } from "../office/package";
import type { Options, ToolId } from "../../types";
globalThis.onmessage = async (
  event: MessageEvent<{
    type: string;
    file: File;
    format: OfficeFormat;
    id: ToolId;
    options: Options;
  }>,
) => {
  try {
    const { type, file, format, id, options } = event.data;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (type === "validate") {
      inspectOfficePackage(bytes, format);
      globalThis.postMessage({ type: "result", result: true });
      return;
    }
    const variants = ["Regular", "Bold", "Italic", "BoldItalic"];
    const data = await Promise.all(
      variants.map(async (variant) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}pdfjs/standard_fonts/LiberationSans-${variant}.ttf`,
        );
        if (!response.ok)
          throw new Error(
            "Bundled conversion fonts could not be loaded. Refresh the application and retry.",
          );
        return new Uint8Array(await response.arrayBuffer());
      }),
    );
    const { convertOfficeBytes } = await import("../office/core");
    globalThis.postMessage({
      type: "result",
      result: await convertOfficeBytes(id, bytes, options, {
        regular: data[0],
        bold: data[1],
        italic: data[2],
        boldItalic: data[3],
      }),
    });
  } catch (error) {
    globalThis.postMessage({
      type: "error",
      message:
        error instanceof Error ? error.message : "Office conversion failed.",
    });
  }
};
