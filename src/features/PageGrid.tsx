import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
} from "lucide-react";
import { PDFThumbnail } from "../components/Previews";
import { Button } from "../components/ui/button";
import type { PageEdit } from "../types";
export function PageGrid({
  file,
  pages,
  set,
  mode,
}: {
  file: File;
  pages: PageEdit[];
  set: (pages: PageEdit[]) => void;
  mode: "organize" | "rotate" | "select";
}) {
  function move(from: number, to: number) {
    if (to < 0 || to >= pages.length) return;
    const next = [...pages];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    set(next);
  }
  const edit = mode === "organize";
  function rotate(angle: number) {
    set(
      pages.map((p) =>
        p.selected ? { ...p, rotation: (p.rotation + angle + 360) % 360 } : p,
      ),
    );
  }
  return (
    <section className="page-editor">
      <div className="section-heading">
        <h3>{pages.length} pages</h3>
        <div className="actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set(pages.map((p) => ({ ...p, selected: true })))}
          >
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set(pages.map((p) => ({ ...p, selected: false })))}
          >
            Clear selection
          </Button>
        </div>
      </div>
      {mode !== "select" && (
        <div className="page-toolbar">
          <Button size="sm" variant="outline" onClick={() => rotate(-90)}>
            <RotateCcw size={15} />
            Rotate left
          </Button>
          <Button size="sm" variant="outline" onClick={() => rotate(90)}>
            <RotateCw size={15} />
            Rotate right
          </Button>
          {edit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => set(pages.filter((p) => !p.selected))}
            >
              <Trash2 size={15} />
              Remove selected
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => set(pages.map((p) => ({ ...p, rotation: 0 })))}
          >
            Reset rotations
          </Button>
        </div>
      )}
      <div className="page-grid">
        {pages.map((p, i) => (
          <article
            key={p.id}
            className={`page-card ${p.selected ? "selected" : ""}`}
            draggable={edit}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => {
              if (edit) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isInteger(from) && from >= 0 && from < pages.length)
                move(from, i);
            }}
          >
            <label className="page-select">
              <input
                type="checkbox"
                checked={p.selected}
                onChange={(e) =>
                  set(
                    pages.map((x) =>
                      x.id === p.id ? { ...x, selected: e.target.checked } : x,
                    ),
                  )
                }
              />
              Page {p.index + 1}
              <span>{p.rotation ? `+${p.rotation}°` : ""}</span>
            </label>
            <PDFThumbnail file={file} index={p.index} rotation={p.rotation} />
            {edit && (
              <div className="page-actions">
                <button
                  className="icon-button"
                  aria-label={`Move page ${i + 1} left`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move page ${i + 1} right`}
                  disabled={i === pages.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowRight size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Duplicate page ${i + 1}`}
                  onClick={() =>
                    set([
                      ...pages.slice(0, i + 1),
                      { ...p, id: crypto.randomUUID() },
                      ...pages.slice(i + 1),
                    ])
                  }
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove page ${i + 1}`}
                  onClick={() => set(pages.filter((x) => x.id !== p.id))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
