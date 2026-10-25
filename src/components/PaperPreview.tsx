import {
  getPageDimensions,
  getPaperSize,
  getImagePlacement,
} from "../lib/paperSizes";
import type { InputFile, Options } from "../types";
import { BlobImage } from "./Previews";

export function PaperPreview({
  input,
  options,
}: {
  input: InputFile;
  options: Options;
}) {
  const paper = getPaperSize(options.pageSize);
  const page = getPageDimensions(options.pageSize, options.orientation);
  let image;
  try {
    image = getImagePlacement(
      page,
      { width: input.width!, height: input.height! },
      options.margin,
      options.alignment,
    );
  } catch {
    return (
      <p className="error" role="alert">
        Margins leave no room for the image. Reduce the margin to see the
        preview.
      </p>
    );
  }
  const previewWidth = Math.min(240, (240 * page.width) / page.height);
  return (
    <div className="layout-preview">
      <h3>Page layout preview</h3>
      <div
        className="paper-preview"
        style={{
          width: `${previewWidth}px`,
          aspectRatio: `${page.width} / ${page.height}`,
        }}
      >
        <div
          className="paper-preview-image"
          style={{
            left: `${(image.x / page.width) * 100}%`,
            top: `${((page.height - image.y - image.height) / page.height) * 100}%`,
            width: `${(image.width / page.width) * 100}%`,
            height: `${(image.height / page.height) * 100}%`,
          }}
        >
          <BlobImage blob={input.file} alt="First image on a PDF page" />
        </div>
      </div>
      <p className="hint">
        {paper.label} · {paper.dimensions} · {options.orientation} ·{" "}
        {options.margin} pt margins · one image per page
      </p>
    </div>
  );
}
