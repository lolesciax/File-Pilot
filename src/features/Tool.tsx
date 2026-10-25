import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
  LoaderCircle,
  Trash2,
  CircleCheck,
} from "lucide-react";
import { z } from "zod";
import { tools } from "../lib/catalog";
import {
  defaultOptions,
  type InputFile,
  type Options,
  type PageEdit,
  type FileJobStatus,
} from "../types";
import { useWorkspace } from "../stores/workspace";
import { MAX_TOTAL, formatSize, validateFile, parseRanges } from "../lib/files";
import { Dropzone } from "../components/Dropzone";
import { BlobImage, PDFThumbnail } from "../components/Previews";
import { ToolIcon } from "../components/ToolIcon";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/dialog";
import { ProcessingAction } from "../components/ProcessingAction";
import { CompletionScreen } from "../components/CompletionScreen";
import { ToolOptions } from "./ToolOptions";
import { Cropper } from "./Cropper";
import { PageGrid } from "./PageGrid";
import { PaperPreview } from "../components/PaperPreview";
import { useElementSize, useViewportHeight } from "../hooks/useElementSize";
import { isOfficeTool, officeMime, officeNotices } from "../lib/officeTools";
const savedOptions = new Map<string, Options>();
export default function Tool() {
  const { id } = useParams();
  const tool = tools.find((t) => t.id === id);
  if (!tool)
    return (
      <div className="container page-intro">
        <h1>Tool not found</h1>
        <Link to="/tools">Explore all tools</Link>
      </div>
    );
  return <ToolWorkspace key={tool.id} tool={tool} />;
}
function ToolWorkspace({ tool }: { tool: (typeof tools)[number] }) {
  const state = useWorkspace();
  const { files, status } = state;
  const viewportHeight = useViewportHeight();
  const [o, setO] = useState<Options>(
    () => savedOptions.get(tool.id) ?? { ...defaultOptions },
  );
  const [pages, setPages] = useState<PageEdit[]>([]);
  const [emptySelection, setEmptySelection] = useState(false);
  const [notice, setNotice] = useState("");
  const [fileJobs, setFileJobs] = useState<Record<string, FileJobStatus>>({});
  const [editingResults, setEditingResults] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<"upload" | "action" | null>(null);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  const busy = status === "validating" || status === "processing";
  const currentIds = state.resultIds[tool.id] ?? [];
  const currentOutputs = state.outputs.filter((output) =>
    currentIds.includes(output.id),
  );
  const otherCount = state.outputs.length - currentOutputs.length;
  const showCompletion = currentOutputs.length > 0 && !busy && !editingResults;
  const [optionsRef, optionsSize] =
    useElementSize<HTMLElement>(!showCompletion);
  const retry =
    !busy && files.some((file) => fileJobs[file.id] === "failed")
      ? () => process(files.filter((file) => fileJobs[file.id] === "failed"))
      : undefined;
  useLayoutEffect(() => {
    if (showCompletion || !restoreFocus.current) return;
    const target = root.current?.querySelector<HTMLButtonElement>(
      restoreFocus.current === "upload"
        ? ".dropzone-button"
        : ".process-button",
    );
    restoreFocus.current = null;
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > innerHeight)
      window.scrollTo({
        top: Math.max(0, bounds.top + scrollY - 24),
        behavior: "instant",
      });
    target.focus({ preventScroll: true });
  }, [showCompletion]);
  const isPDF = tool.category === "pdf" && !tool.input;
  const isOffice = isOfficeTool(tool.id);
  const multiple = [
    "merge-pdf",
    "images-to-pdf",
    "resize-images",
    "compress-images",
    "convert-images",
    "batch-rename",
  ].includes(tool.id);
  const pageMode =
    tool.id === "organize-pdf"
      ? "organize"
      : tool.id === "rotate-pdf"
        ? "rotate"
        : "select";
  const showGrid = isPDF && tool.id !== "merge-pdf";
  useEffect(() => {
    active.current = true;
    const s = useWorkspace.getState();
    if (s.tool !== tool.id) {
      s.setFiles([]);
      s.update({
        tool: tool.id,
        status: "idle",
        errors: [],
        completed: 0,
        total: 0,
      });
    }
    return () => {
      active.current = false;
      controller.current?.abort();
      const current = useWorkspace.getState();
      if (current.status === "processing" || current.status === "validating")
        current.update({
          status: current.status === "processing" ? "cancelled" : "idle",
        });
    };
  }, [tool.id]);
  useEffect(() => {
    if (!showGrid || !files[0]?.pages) return;
    setEmptySelection(false);
    setPages(
      Array.from({ length: files[0].pages }, (_, index) => ({
        id: crypto.randomUUID(),
        index,
        rotation: 0,
        selected: false,
      })),
    );
  }, [files[0]?.id, showGrid]);
  function set(patch: Partial<Options>, fromGrid = false) {
    if (patch.ranges !== undefined && !fromGrid) {
      setEmptySelection(false);
      if (files[0]?.pages && o.splitMode !== "groups") {
        try {
          const selected = new Set(parseRanges(patch.ranges, files[0].pages));
          setPages((current) =>
            current.map((page) => ({
              ...page,
              selected: selected.has(page.index),
            })),
          );
        } catch {
          /* Keep the last visual selection while a range is incomplete. */
        }
      }
    }
    setO((current) => {
      const next = { ...current, ...patch };
      savedOptions.set(tool.id, next);
      return next;
    });
  }
  async function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    if (!multiple && incoming.length > 1) {
      state.update({
        errors: ["Choose one file for this tool."],
        status: "error",
      });
      return;
    }
    if (incoming.length + (multiple ? files.length : 0) > 100) {
      state.update({
        errors: ["Select at most 100 files per batch."],
        status: "error",
      });
      return;
    }
    if (
      incoming.reduce((n, f) => n + f.size, 0) +
        (multiple ? files.reduce((n, f) => n + f.file.size, 0) : 0) >
      MAX_TOTAL
    ) {
      state.update({
        errors: ["Workspace input is limited to 300 MB."],
        status: "error",
      });
      return;
    }
    state.update({ status: "validating", errors: [] });
    const accepted: InputFile[] = [];
    const errors: string[] = [];
    for (const file of incoming) {
      try {
        if (
          multiple &&
          [...files, ...accepted].some(
            (f) =>
              f.file.name === file.name &&
              f.file.size === file.size &&
              f.file.lastModified === file.lastModified,
          )
        ) {
          errors.push(`${file.name}: already selected.`);
          continue;
        }
        await validateFile(
          file,
          isPDF
            ? "pdf"
            : tool.input || tool.id === "batch-rename"
              ? "any"
              : "image",
        );
        if (tool.input) {
          if (file.size > 20 * 1024 * 1024)
            throw new Error("Office inputs are limited to 20 MB.");
          if (!file.name.toLowerCase().endsWith(`.${tool.input}`))
            throw new Error(
              `Choose a .${tool.input} document. Legacy or macro-enabled Office formats are unsupported.`,
            );
          const { officeWorker } =
            await import("../processing/office/workerClient");
          const validation = new AbortController();
          controller.current = validation;
          await officeWorker<boolean>(
            { type: "validate", file, format: tool.input },
            validation.signal,
          );
          controller.current = null;
        }
        const entry: InputFile = { id: crypto.randomUUID(), file };
        if (isPDF) {
          const { loadPDF } = await import("../processing/pdf");
          entry.pages = (await loadPDF(file)).getPageCount();
        } else if (tool.id !== "batch-rename" && !tool.input) {
          const { decodeImage } = await import("../processing/image");
          const bitmap = await decodeImage(file);
          entry.width = bitmap.width;
          entry.height = bitmap.height;
          bitmap.close();
        }
        accepted.push(entry);
      } catch (e) {
        controller.current = null;
        errors.push(e instanceof Error ? e.message : "File validation failed.");
      }
    }
    if (!active.current) return;
    if (accepted.length) {
      state.beginResults(tool.id, false);
      setFileJobs({});
    }
    state.setFiles(
      multiple ? [...files, ...accepted] : accepted.length ? accepted : files,
    );
    state.update({ status: errors.length ? "error" : "idle", errors });
    setNotice(
      accepted.length
        ? `${accepted.length} ${accepted.length === 1 ? "file" : "files"} added.`
        : "",
    );
  }
  function updatePages(next: PageEdit[]) {
    setPages(next);
    setEmptySelection(next.every((page) => !page.selected));
    if (["extract-pdf", "split-pdf", "pdf-to-images"].includes(tool.id))
      set(
        {
          ranges: next
            .filter((p) => p.selected)
            .map((p) => p.index + 1)
            .join(", "),
        },
        true,
      );
  }
  function reorder(i: number, to: number) {
    const next = [...files];
    const [file] = next.splice(i, 1);
    next.splice(to, 0, file);
    state.setFiles(next);
  }
  async function process(retryFiles?: InputFile[]) {
    const workFiles = retryFiles ?? files;
    if (controller.current || !workFiles.length) return;
    setEditingResults(false);
    state.beginResults(tool.id, !!retryFiles);
    setFileJobs((current) => ({
      ...current,
      ...Object.fromEntries(workFiles.map((f) => [f.id, "queued" as const])),
    }));
    const abortController = new AbortController();
    controller.current = abortController;
    state.update({
      status: "processing",
      errors: [],
      completed: 0,
      total: 0,
      detail: "Preparing files…",
    });
    setNotice("");
    try {
      if (emptySelection && pageMode === "select")
        throw new Error(
          "No pages selected. Select a page or enter a page range.",
        );
      z.object({
        name: z.string().trim().min(1, "Enter an output filename."),
        quality: z.number().min(0.1).max(1),
        start: z.number().int().min(0).max(999999),
        margin: z.number().min(0).max(200),
        percent: z.number().min(1).max(400),
      }).parse(o);
      if (
        isPDF &&
        tool.id !== "merge-pdf" &&
        tool.id !== "organize-pdf" &&
        tool.id !== "rotate-pdf"
      ) {
        if (tool.id === "split-pdf" && o.splitMode === "groups")
          o.ranges.split(";").forEach((g) => parseRanges(g, files[0].pages!));
        else parseRanges(o.ranges, files[0].pages!);
      }
      const { runTool } = await import("../processing/engine");
      const result = await runTool(tool.id, workFiles, o, pages, {
        fileStatus: (id, status) => {
          if (active.current)
            setFileJobs((current) => ({ ...current, [id]: status }));
        },
        signal: abortController.signal,
        progress: (completed, total, detail) => {
          if (active.current) state.update({ completed, total, detail });
        },
      });
      if (!active.current) return;
      if (!result.cancelled && !result.outputs.length && !result.errors.length)
        throw new Error(
          "No files were generated. Review your settings and try again.",
        );
      if (
        result.outputs.some(
          (output) =>
            !(output.blob instanceof Blob) ||
            !output.blob.size ||
            !output.name.trim(),
        )
      )
        throw new Error(
          "The generated output is empty or invalid. Please try again.",
        );
      state.saveResults(tool.id, result.outputs, {
        errors: result.errors,
        cancelled: result.cancelled,
      });
      setFileJobs((current) => ({
        ...current,
        ...Object.fromEntries(
          workFiles
            .filter((f) => !["completed", "failed"].includes(current[f.id]))
            .map((f) => [
              f.id,
              result.cancelled
                ? "cancelled"
                : result.errors.length
                  ? "failed"
                  : "completed",
            ]),
        ),
      }));
      state.update({
        status: result.cancelled
          ? "cancelled"
          : result.errors.length && !result.outputs.length
            ? "error"
            : "success",
        errors: result.errors,
      });
    } catch (e) {
      setFileJobs((current) => ({
        ...current,
        ...Object.fromEntries(
          workFiles.map((file) => [file.id, "failed" as const]),
        ),
      }));
      if (active.current) {
        const errors = [
          e instanceof z.ZodError
            ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" ")
            : e instanceof Error
              ? e.message
              : "Processing failed. Please retry.",
        ];
        state.saveResults(tool.id, [], { errors, cancelled: false });
        state.update({ status: "error", errors });
      }
    } finally {
      controller.current = null;
    }
  }
  return (
    <div ref={root} className="container tool-page">
      <Link to="/tools" className="back-link">
        <ArrowLeft size={16} />
        All tools
      </Link>
      <div className="tool-intro">
        <span className={`tool-icon tone-${tool.icon}`}>
          <ToolIcon name={tool.icon} size={28} />
        </span>
        <div>
          <h1>{tool.title}</h1>
          <p>{tool.description}</p>
        </div>
        <span className="local-label">
          <ShieldCheck size={17} />
          100% on your device
        </span>
      </div>
      {showCompletion ? (
        <CompletionScreen
          tool={tool}
          outputs={currentOutputs}
          outcome={state.resultOutcomes[tool.id]}
          retry={retry}
          review={() => {
            restoreFocus.current = "action";
            setEditingResults(true);
          }}
          another={() => {
            restoreFocus.current = "upload";
            state.beginResults(tool.id, false);
            state.setFiles([]);
            set({ ranges: "" });
            state.update({
              status: "idle",
              errors: [],
              completed: 0,
              total: 0,
              detail: "",
            });
            setPages([]);
            setEmptySelection(false);
            setFileJobs({});
            setNotice("");
            setEditingResults(false);
          }}
        />
      ) : (
        <>
          <div className="workflow-steps">
            <span className={files.length ? "done" : "current"}>
              <b>{files.length ? <CircleCheck size={15} /> : "1"}</b>Select
              files
            </span>
            <i />
            <span
              className={
                currentOutputs.length && !busy
                  ? "done"
                  : files.length
                    ? "current"
                    : ""
              }
            >
              <b>2</b>Make it yours
            </span>
            <i />
            <span className={currentOutputs.length && !busy ? "current" : ""}>
              <b>3</b>Download & done
            </span>
          </div>
          {isOffice && (
            <div className="conversion-notice">
              <strong>About this conversion</strong>
              <p>{officeNotices[tool.id]}</p>
            </div>
          )}
          <p className="sr-only" role="status">
            {notice}
          </p>
          <div className="workspace-grid">
            <section className="workspace-main">
              <div className="section-heading">
                <h2>
                  Your files <span className="count">{files.length}</span>
                </h2>
                {files.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      state.setFiles([]);
                      setPages([]);
                      state.update({ errors: [], status: "idle" });
                    }}
                  >
                    <Trash2 size={15} />
                    Clear files
                  </Button>
                )}
              </div>
              <Dropzone
                multiple={multiple}
                accept={
                  tool.input
                    ? `.${tool.input},${officeMime[tool.input]}`
                    : isPDF
                      ? "application/pdf"
                      : tool.id === "batch-rename"
                        ? "*"
                        : "image/jpeg,image/png,image/webp"
                }
                formatLabel={
                  tool.input
                    ? `${tool.input.toUpperCase()} documents only`
                    : undefined
                }
                limitLabel={
                  tool.input
                    ? "Up to 20 MB · 80 MB expanded · macro-free files"
                    : undefined
                }
                disabled={busy}
                onFiles={addFiles}
                compact={files.length > 0}
              />
              {status === "validating" && (
                <p className="loading" role="status">
                  <LoaderCircle size={18} className="spin" />
                  Checking your files…
                </p>
              )}
              <fieldset disabled={busy} className="file-fieldset">
                <div className="file-list">
                  {files.map((f, i) => (
                    <article
                      className="file-row"
                      key={f.id}
                      draggable={multiple && !busy}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(i))
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = Number(
                          e.dataTransfer.getData("text/plain"),
                        );
                        if (
                          Number.isInteger(from) &&
                          from >= 0 &&
                          from < files.length
                        )
                          reorder(from, i);
                      }}
                    >
                      {f.width ? (
                        <BlobImage
                          blob={f.file}
                          alt={f.file.name}
                          className="file-thumb"
                        />
                      ) : isPDF ? (
                        <PDFThumbnail file={f.file} index={0} />
                      ) : (
                        <FileText size={24} />
                      )}
                      <div className="file-meta">
                        <strong>{f.file.name}</strong>
                        <span>
                          {formatSize(f.file.size)}
                          {f.pages && ` · ${f.pages} pages`}
                          {f.width && ` · ${f.width} × ${f.height} px`}
                        </span>
                      </div>
                      {fileJobs[f.id] && (
                        <span
                          className={`file-status status-${fileJobs[f.id]}`}
                        >
                          {fileJobs[f.id]}
                        </span>
                      )}
                      <div className="file-controls">
                        {multiple && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`Move ${f.file.name} up`}
                              disabled={i === 0 || busy}
                              onClick={() => reorder(i, i - 1)}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Move ${f.file.name} down`}
                              disabled={i === files.length - 1 || busy}
                              onClick={() => reorder(i, i + 1)}
                            >
                              <ArrowDown size={16} />
                            </button>
                          </>
                        )}
                        <button
                          className="icon-button"
                          aria-label={`Remove ${f.file.name}`}
                          onClick={() =>
                            state.setFiles(files.filter((x) => x.id !== f.id))
                          }
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {showGrid && files[0] && (
                  <PageGrid
                    file={files[0].file}
                    pages={pages}
                    set={updatePages}
                    mode={pageMode}
                  />
                )}
                {tool.id === "crop-image" && files[0] && (
                  <Cropper
                    file={files[0].file}
                    crop={o.crop}
                    onChange={(crop) => set({ crop })}
                    width={files[0].width!}
                    height={files[0].height!}
                  />
                )}
                {tool.id === "images-to-pdf" && files.length > 0 && (
                  <PaperPreview input={files[0]} options={o} />
                )}
              </fieldset>
              {!files.length && (
                <div className="workspace-empty">
                  <div className="mini-docs">
                    <FileText />
                    <ArrowRight />
                    <FileText />
                  </div>
                  <h3>A fresh start for your files.</h3>
                  <p>
                    Select {multiple ? "your files" : "a file"} above to get
                    started. Originals always stay untouched.
                  </p>
                </div>
              )}
            </section>
            <aside
              ref={optionsRef}
              data-fits-viewport={
                optionsSize.height > 0 &&
                optionsSize.height <= viewportHeight - 40
              }
              className="options-panel panel"
            >
              <div className="title-with-icon">
                <SlidersHorizontal size={19} />
                <h2>Make it yours</h2>
              </div>
              <fieldset disabled={busy}>
                <ToolOptions id={tool.id} o={o} set={set} files={files} />
              </fieldset>
              <ProcessingAction
                tool={tool}
                process={() => process()}
                cancel={() => controller.current?.abort()}
                retry={retry}
              />
            </aside>
          </div>
        </>
      )}
      {otherCount > 0 && (
        <p className="saved-downloads-link">
          <Link to="/workspace">
            Saved downloads from other tools ({otherCount})
          </Link>
        </p>
      )}
      <div className="workspace-bottom">
        <p>Done for now? Clear your session to release files from memory.</p>
        <ConfirmDialog
          title="Clear your workspace?"
          description="Selected files and generated results will be removed from this session. Download your results first."
          onConfirm={() => {
            state.clear();
            state.update({ tool: tool.id });
            setPages([]);
            setNotice("Workspace cleared.");
          }}
          trigger={
            <Button variant="ghost" disabled={busy}>
              <Trash2 size={16} />
              Clear workspace
            </Button>
          }
        />
      </div>
    </div>
  );
}
