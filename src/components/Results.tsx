import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  Package,
} from "lucide-react";
import { useWorkspace } from "../stores/workspace";
import { download, formatSize } from "../lib/files";
import type { OutputFile } from "../types";
import { Button } from "./ui/button";
import { BlobImage } from "./Previews";

function ConversionNotes({ output }: { output: OutputFile }) {
  return output.warnings?.length ? (
    <details className="conversion-warnings">
      <summary>Review conversion notes ({output.warnings.length})</summary>
      <ul>
        {output.warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </details>
  ) : null;
}
function ResultRow({
  output,
  individual = true,
  notes = true,
}: {
  output: OutputFile;
  individual?: boolean;
  notes?: boolean;
}) {
  return (
    <div className="result-row">
      {output.blob.type.startsWith("image/") ? (
        <BlobImage
          blob={output.blob}
          alt={`Result ${output.name}`}
          className="result-thumb"
        />
      ) : (
        <FileCheck2 size={25} />
      )}
      <div className="file-meta">
        <strong title={output.name}>{output.name}</strong>
        <span>
          {formatSize(output.blob.size)} ·{" "}
          {output.name.split(".").pop()?.toUpperCase()}
          {output.originalSize !== undefined &&
            ` · ${output.blob.size < output.originalSize ? `${((1 - output.blob.size / output.originalSize) * 100).toFixed(1)}% smaller` : output.blob.size === output.originalSize ? "Original retained" : `${((output.blob.size / output.originalSize - 1) * 100).toFixed(1)}% larger`}`}
        </span>
      </div>
      {individual && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => download(output.blob, output.name)}
          aria-label={`Download ${output.name}`}
        >
          <Download size={16} />
          Download
        </Button>
      )}
      {notes && <ConversionNotes output={output} />}
    </div>
  );
}

export function Results({
  outputs: provided,
  completion = false,
  partial = false,
  title,
  message,
  issues = [],
  singleLabel = "Download",
}: {
  outputs?: OutputFile[];
  completion?: boolean;
  partial?: boolean;
  title?: string;
  message?: string;
  issues?: string[];
  singleLabel?: string;
}) {
  const saved = useWorkspace((state) => state.outputs);
  const outputs = provided ?? saved;
  const [error, setError] = useState("");
  const [packing, setPacking] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  if (!outputs.length) return null;
  const single = outputs.length === 1;
  const summary = `${outputs.length} ${single ? "file" : "files"} ready`;
  async function save() {
    setError("");
    if (single) {
      download(outputs[0].blob, outputs[0].name);
      return;
    }
    setPacking(true);
    try {
      const { archive } = await import("../processing/archive");
      download(await archive(outputs), "filepilot-results.zip");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "ZIP export failed. Try individual downloads.",
      );
    } finally {
      setPacking(false);
    }
  }
  return (
    <section
      className={`results ${completion ? "results-completion" : "panel"}`}
      aria-label={completion ? "Processing results" : "Saved downloads"}
    >
      <div className="title-with-icon">
        {partial ? <AlertCircle size={32} /> : <CheckCircle2 size={32} />}
        <h2 ref={heading} tabIndex={-1}>
          {title ?? "Saved downloads"}
        </h2>
      </div>
      {message && <p className="completion-message">{message}</p>}
      <p className="result-count">
        {summary}
        {partial ? " · Some files need attention" : ""}
      </p>
      {!completion && (
        <p>
          Latest saved results from each tool. A new run replaces that tool’s
          previous batch.
        </p>
      )}
      {single && (
        <ResultRow output={outputs[0]} individual={false} notes={false} />
      )}
      <div className="result-primary-slot">
        <div className="result-primary-action">
          <Button
            onClick={save}
            disabled={packing}
            aria-label={
              single ? `Download ${outputs[0].name}` : "Download all as ZIP"
            }
          >
            {single ? <Download size={17} /> : <Package size={17} />}
            {packing
              ? "Creating ZIP…"
              : single
                ? singleLabel
                : "Download all as ZIP"}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {issues.length > 0 && (
        <div className="error-box" role="alert">
          <div>
            <p>{issues[0]}</p>
            {issues.length > 1 && (
              <details>
                <summary>
                  Review all processing issues ({issues.length})
                </summary>
                <ul>
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
      {single && <ConversionNotes output={outputs[0]} />}
      {!single && (
        <details
          className="batch-results"
          key={outputs.map((output) => output.id).join(",")}
        >
          <summary>View results ({outputs.length})</summary>
          <div className="result-list">
            {outputs.map((output) => (
              <ResultRow key={output.id} output={output} />
            ))}
          </div>
        </details>
      )}
      <p className="hint">Download before closing this tab.</p>
    </section>
  );
}
