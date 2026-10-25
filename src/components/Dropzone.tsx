import { useRef, useState } from "react";
import { UploadCloud, Plus } from "lucide-react";
export function Dropzone({
  accept,
  multiple,
  disabled,
  onFiles,
  compact = false,
  formatLabel,
  limitLabel = "Up to 100 MB per file · 300 MB total",
}: {
  accept: string;
  multiple: boolean;
  disabled: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
  formatLabel?: string;
  limitLabel?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`dropzone ${drag ? "drag-active" : ""} ${compact ? "compact" : ""} ${disabled ? "disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        tabIndex={-1}
        ref={input}
        type="file"
        aria-label="Select files"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button
        className="dropzone-button"
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <span className="upload-icon">
          {compact ? <Plus size={22} /> : <UploadCloud size={30} />}
        </span>
        <strong>{compact ? "Add more files" : "Drop your files here"}</strong>
        <span>
          {compact ? "or drag and drop" : "or click to browse your device"}
        </span>
      </button>
      <p>
        {formatLabel ??
          (accept === "application/pdf"
            ? "PDF documents"
            : accept === "*"
              ? "Any file type"
              : "JPEG, PNG, or WebP")}{" "}
        · {limitLabel}
      </p>
    </div>
  );
}
