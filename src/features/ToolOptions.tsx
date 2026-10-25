import type { ReactNode } from "react";
import type { Options, ToolId, InputFile } from "../types";
import { renameFiles } from "../lib/files";
import { paperSizes } from "../lib/paperSizes";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ToolOptions({
  id,
  o,
  set,
  files,
}: {
  id: ToolId;
  o: Options;
  set: (value: Partial<Options>) => void;
  files: InputFile[];
}) {
  const pdf = [
    "split-pdf",
    "extract-pdf",
    "pdf-to-images",
    "pdf-to-word",
    "pdf-to-excel",
    "pdf-to-powerpoint",
  ].includes(id);
  const image = [
    "resize-images",
    "crop-image",
    "convert-images",
    "compress-images",
    "pdf-to-images",
  ].includes(id);
  return (
    <>
      <Field label="Output filename">
        <input
          value={o.name}
          maxLength={120}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      {(id === "split-pdf" || id === "extract-pdf") && (
        <Field label={id === "split-pdf" ? "Split mode" : "Extraction mode"}>
          <select
            value={o.splitMode}
            onChange={(e) =>
              set({ splitMode: e.target.value as Options["splitMode"] })
            }
          >
            <option value="combined">Selected pages in one PDF</option>
            <option value="individual">Each page in a separate PDF</option>
            {id === "split-pdf" && (
              <option value="groups">Custom groups (separated by ;)</option>
            )}
          </select>
        </Field>
      )}
      {pdf && (
        <Field
          label={
            o.splitMode === "groups" && id === "split-pdf"
              ? "Page groups"
              : "Page ranges"
          }
          hint={
            o.splitMode === "groups" && id === "split-pdf"
              ? "Example: 1-3; 4,6. Each group becomes a PDF."
              : "Example: 1-3, 5. Leave blank for all pages. Order is preserved."
          }
        >
          <input
            value={o.ranges}
            placeholder={o.splitMode === "groups" ? "1-3; 4-6" : "All pages"}
            onChange={(e) => set({ ranges: e.target.value })}
          />
        </Field>
      )}
      {id === "resize-images" && (
        <>
          <Field label="Resize by">
            <select
              value={o.dimensionMode}
              onChange={(e) =>
                set({
                  dimensionMode: e.target.value as Options["dimensionMode"],
                })
              }
            >
              <option value="box">Width and height</option>
              <option value="width">Width (preserve ratio)</option>
              <option value="height">Height (preserve ratio)</option>
              <option value="percent">Percentage</option>
            </select>
          </Field>
          <Field label="Preset">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const [width, height] = e.target.value.split("x").map(Number);
                  set({ width, height, dimensionMode: "box" });
                }
              }}
              defaultValue=""
            >
              <option value="">Custom dimensions</option>
              {["1920x1080", "1280x720", "1080x1080", "1080x1350"].map((v) => (
                <option key={v} value={v}>
                  {v.replace("x", " × ")}
                </option>
              ))}
            </select>
          </Field>
          {o.dimensionMode === "percent" ? (
            <Field label="Scale (%)">
              <input
                type="number"
                min={1}
                max={400}
                value={o.percent}
                onChange={(e) => set({ percent: Number(e.target.value) })}
              />
            </Field>
          ) : (
            <div className="field-pair">
              {o.dimensionMode !== "height" && (
                <Field label="Width (px)">
                  <input
                    type="number"
                    min={1}
                    max={8192}
                    value={o.width}
                    onChange={(e) => {
                      const width = Number(e.target.value);
                      set({
                        width,
                        ...(o.lock && files[0]?.width
                          ? {
                              height: Math.max(
                                1,
                                Math.round(
                                  (width * files[0].height!) / files[0].width,
                                ),
                              ),
                            }
                          : {}),
                      });
                    }}
                  />
                </Field>
              )}
              {o.dimensionMode !== "width" && (
                <Field label="Height (px)">
                  <input
                    type="number"
                    min={1}
                    max={8192}
                    value={o.height}
                    onChange={(e) => {
                      const height = Number(e.target.value);
                      set({
                        height,
                        ...(o.lock && files[0]?.height
                          ? {
                              width: Math.max(
                                1,
                                Math.round(
                                  (height * files[0].width!) / files[0].height,
                                ),
                              ),
                            }
                          : {}),
                      });
                    }}
                  />
                </Field>
              )}
            </div>
          )}
          {o.dimensionMode === "box" && (
            <>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={o.lock}
                  onChange={(e) => set({ lock: e.target.checked })}
                />
                Lock aspect ratio to first image
              </label>
              <Field label="Fit mode">
                <select
                  value={o.resizeMode}
                  onChange={(e) =>
                    set({ resizeMode: e.target.value as Options["resizeMode"] })
                  }
                >
                  <option value="contain">
                    Contain — fit inside dimensions
                  </option>
                  <option value="cover">Cover — fill and crop edges</option>
                  <option value="stretch">Stretch — change aspect ratio</option>
                </select>
              </Field>
            </>
          )}
        </>
      )}
      {image && (
        <>
          <Field label="Output format">
            <select
              value={o.format}
              onChange={(e) =>
                set({ format: e.target.value as Options["format"] })
              }
            >
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
              {id !== "pdf-to-images" && (
                <option value="image/webp">WebP</option>
              )}
            </select>
          </Field>
          {o.format !== "image/png" && (
            <Field
              label={`Quality · ${Math.round(o.quality * 100)}%`}
              hint="Lower quality may reduce size and visible detail."
            >
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(o.quality * 100)}
                onChange={(e) => set({ quality: Number(e.target.value) / 100 })}
              />
            </Field>
          )}
          {o.format === "image/jpeg" && (
            <Field
              label="JPEG background"
              hint="JPEG does not support transparency."
            >
              <input
                type="color"
                value={o.background}
                onChange={(e) => set({ background: e.target.value })}
              />
            </Field>
          )}
        </>
      )}
      {id === "compress-images" && (
        <>
          <Field
            label="Maximum width (px)"
            hint="Smaller images stay at their original dimensions."
          >
            <input
              type="number"
              min={1}
              max={8192}
              value={o.width}
              onChange={(e) => set({ width: Number(e.target.value) })}
            />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={o.keepOriginal}
              onChange={(e) => set({ keepOriginal: e.target.checked })}
            />
            Keep original if result is not smaller
          </label>
        </>
      )}
      {(id === "pdf-to-images" || id === "pdf-to-powerpoint") && (
        <Field
          label="Render scale"
          hint="Higher resolution uses more memory. Output is rasterized."
        >
          <select
            value={o.scale}
            onChange={(e) => set({ scale: Number(e.target.value) })}
          >
            <option value={1}>1× (72 dpi)</option>
            <option value={1.5}>1.5× (108 dpi)</option>
            <option value={2}>2× (144 dpi)</option>
            <option value={3}>3× (216 dpi)</option>
          </select>
        </Field>
      )}
      {id === "images-to-pdf" && (
        <>
          <Field
            label="Page size"
            hint="Short is Letter (11 in). Long is 13 in; Legal is 14 in."
          >
            <select
              value={o.pageSize}
              onChange={(e) =>
                set({ pageSize: e.target.value as Options["pageSize"] })
              }
            >
              {paperSizes.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.label} — {paper.dimensions}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Orientation">
            <select
              value={o.orientation}
              onChange={(e) =>
                set({ orientation: e.target.value as Options["orientation"] })
              }
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Field>
          <Field label="Margins (points)">
            <input
              type="number"
              value={o.margin}
              min={0}
              max={200}
              onChange={(e) => set({ margin: Number(e.target.value) })}
            />
          </Field>
          <Field label="Horizontal alignment">
            <select
              value={o.alignment}
              onChange={(e) =>
                set({ alignment: e.target.value as Options["alignment"] })
              }
            >
              <option value="center">Center</option>
              <option value="start">Left</option>
              <option value="end">Right</option>
            </select>
          </Field>
          <p className="hint">
            Images are contained on each page, preserving their proportions.
          </p>
        </>
      )}
      {id === "batch-rename" && (
        <>
          <div className="field-pair">
            <Field label="Prefix">
              <input
                value={o.prefix}
                onChange={(e) => set({ prefix: e.target.value })}
              />
            </Field>
            <Field label="Suffix">
              <input
                value={o.suffix}
                onChange={(e) => set({ suffix: e.target.value })}
              />
            </Field>
          </div>
          <div className="field-pair">
            <Field label="Find">
              <input
                value={o.find}
                onChange={(e) => set({ find: e.target.value })}
              />
            </Field>
            <Field label="Replace with">
              <input
                value={o.replace}
                onChange={(e) => set({ replace: e.target.value })}
              />
            </Field>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={o.keepName}
              onChange={(e) => set({ keepName: e.target.checked })}
            />
            Keep original base name
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={o.numbering}
              onChange={(e) => set({ numbering: e.target.checked })}
            />
            Add sequential numbering
          </label>
          <div className="field-pair">
            <Field label="Start number">
              <input
                type="number"
                min={0}
                max={999999}
                value={o.start}
                onChange={(e) => set({ start: Number(e.target.value) })}
              />
            </Field>
            <Field label="Separator">
              <input
                value={o.separator}
                maxLength={10}
                onChange={(e) => set({ separator: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Letter case">
            <select
              value={o.nameCase}
              onChange={(e) =>
                set({ nameCase: e.target.value as Options["nameCase"] })
              }
            >
              <option value="original">Original</option>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
            </select>
          </Field>
          {files.length > 0 && (
            <div className="rename-preview">
              <h3>Name preview</h3>
              {renameFiles(
                files.map((f) => f.file.name),
                o,
              ).map((name, i) => (
                <div key={files[i].id}>
                  <span>{files[i].file.name}</span>
                  <strong>→ {name}</strong>
                </div>
              ))}
            </div>
          )}
          <p className="hint">
            Downloads renamed copies as a ZIP. Original files stay unchanged.
          </p>
        </>
      )}
      {image && id !== "pdf-to-images" && (
        <p className="hint">
          Static images only. Metadata and animation are not preserved.
        </p>
      )}
    </>
  );
}
