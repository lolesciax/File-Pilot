import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { BlobImage } from "../components/Previews";
import { Button } from "../components/ui/button";
import type { Options } from "../types";
type Crop = Options["crop"];
export function Cropper({
  file,
  crop,
  onChange,
  width,
  height,
}: {
  file: File;
  crop: Crop;
  onChange: (crop: Crop) => void;
  width: number;
  height: number;
}) {
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    crop: Crop;
    mode: "move" | "resize";
  } | null>(null);
  const [ratio, setRatio] = useState("free");
  const [custom, setCustom] = useState({ width: 1, height: 1 });
  function fixed(c: Crop, nextRatio = ratio, nextCustom = custom) {
    if (nextRatio === "free") return c;
    const [a, b] =
      nextRatio === "custom"
        ? [nextCustom.width, nextCustom.height]
        : nextRatio.split(":").map(Number);
    const nextH = (c.width * width * b) / (height * a);
    if (nextH > 100 - c.y) {
      c.height = 100 - c.y;
      c.width = (c.height * height * a) / (width * b);
    } else c.height = nextH;
    return c;
  }
  const zoom = 100 / Math.max(crop.width, crop.height);
  return (
    <div className="cropper">
      <div className="section-heading">
        <h3>Frame your image</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRatio("free");
            onChange({ x: 0, y: 0, width: 100, height: 100 });
          }}
        >
          <RotateCcw size={15} />
          Reset
        </Button>
      </div>
      <div className="field-pair">
        <label className="field">
          Aspect ratio
          <select
            value={ratio}
            onChange={(e) => {
              const next = e.target.value;
              setRatio(next);
              if (next !== "free")
                onChange(fixed({ x: 10, y: 10, width: 80, height: 80 }, next));
            }}
          >
            {["free", "1:1", "4:3", "3:2", "16:9", "9:16", "custom"].map(
              (r) => (
                <option key={r} value={r}>
                  {r === "free"
                    ? "Freeform"
                    : r === "custom"
                      ? "Custom ratio"
                      : r}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          <span>Crop zoom · {zoom.toFixed(1)}×</span>
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={Math.min(10, zoom)}
            onChange={(e) => {
              const factor =
                100 /
                Number(e.target.value) /
                Math.max(crop.width, crop.height);
              const w = crop.width * factor,
                h = crop.height * factor;
              onChange({
                x: Math.max(
                  0,
                  Math.min(100 - w, crop.x + (crop.width - w) / 2),
                ),
                y: Math.max(
                  0,
                  Math.min(100 - h, crop.y + (crop.height - h) / 2),
                ),
                width: w,
                height: h,
              });
            }}
          />
        </label>
      </div>
      {ratio === "custom" && (
        <div className="field-pair">
          {(["width", "height"] as const).map((key) => (
            <label className="field" key={key}>
              Ratio {key}
              <input
                type="number"
                min={1}
                max={100}
                value={custom[key]}
                onChange={(e) => {
                  const next = {
                    ...custom,
                    [key]: Math.max(1, Math.min(100, Number(e.target.value))),
                  };
                  setCustom(next);
                  onChange(fixed({ ...crop }, "custom", next));
                }}
              />
            </label>
          ))}
        </div>
      )}
      <div
        className="crop-area"
        ref={area}
        onPointerMove={(e) => {
          if (!drag.current || !area.current) return;
          const rect = area.current.getBoundingClientRect(),
            dx = ((e.clientX - drag.current.x) / rect.width) * 100,
            dy = ((e.clientY - drag.current.y) / rect.height) * 100,
            c = drag.current.crop;
          if (drag.current.mode === "move")
            onChange({
              ...c,
              x: Math.max(0, Math.min(100 - c.width, c.x + dx)),
              y: Math.max(0, Math.min(100 - c.height, c.y + dy)),
            });
          else
            onChange(
              fixed({
                ...c,
                width: Math.max(1, Math.min(100 - c.x, c.width + dx)),
                height: Math.max(1, Math.min(100 - c.y, c.height + dy)),
              }),
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <BlobImage blob={file} alt="Image being cropped" />
        <div
          className="crop-region"
          style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.width}%`,
            height: `${crop.height}%`,
          }}
          tabIndex={0}
          role="group"
          aria-label="Crop selection. Use arrow keys to move; edit fields below to resize."
          onKeyDown={(e) => {
            const moves: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              },
              m = moves[e.key];
            if (m) {
              e.preventDefault();
              onChange({
                ...crop,
                x: Math.max(0, Math.min(100 - crop.width, crop.x + m[0])),
                y: Math.max(0, Math.min(100 - crop.height, crop.y + m[1])),
              });
            }
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              crop: { ...crop },
              mode: "move",
            };
          }}
        >
          <span
            className="crop-handle"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                crop: { ...crop },
                mode: "resize",
              };
            }}
          />
        </div>
      </div>
      <div className="crop-fields">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <label className="field" key={key}>
            <span>{key} (%)</span>
            <input
              type="number"
              min={key === "x" || key === "y" ? 0 : 1}
              max={100}
              step={0.1}
              value={Math.round(crop[key] * 10) / 10}
              onChange={(e) => {
                const c = {
                  ...crop,
                  [key]: Math.max(
                    key === "x" || key === "y" ? 0 : 1,
                    Math.min(100, Number(e.target.value)),
                  ),
                };
                c.x = Math.min(c.x, 100 - c.width);
                c.y = Math.min(c.y, 100 - c.height);
                onChange(fixed(c));
              }}
            />
          </label>
        ))}
      </div>
      <p className="hint">
        Drag to reposition. Drag the corner to resize, or use the numeric
        fields. Output: {Math.round((width * crop.width) / 100)} ×{" "}
        {Math.round((height * crop.height) / 100)} px.
      </p>
      <h3 className="crop-preview-title">Crop preview</h3>
      <div
        className="live-crop-preview"
        style={{
          width: `min(100%, ${Math.min(320, (320 * (width * crop.width)) / (height * crop.height))}px)`,
          aspectRatio: `${width * crop.width} / ${height * crop.height}`,
        }}
      >
        <div
          style={{
            width: `${10000 / crop.width}%`,
            left: `${(-crop.x / crop.width) * 100}%`,
            top: `${(-crop.y / crop.height) * 100}%`,
          }}
        >
          <BlobImage blob={file} alt="Live crop result" />
        </div>
      </div>
    </div>
  );
}
