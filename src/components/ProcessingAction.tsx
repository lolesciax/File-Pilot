import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "../stores/workspace";
import type { Tool } from "../types";
import { Button } from "./ui/button";
import { ToolIcon } from "./ToolIcon";

export function ProcessingAction({
  tool,
  retry,
  process,
  cancel,
}: {
  tool: Tool;
  retry?: () => void;
  process: () => void;
  cancel: () => void;
}) {
  const { status, errors, completed, total, detail, files } = useWorkspace();
  const busy = status === "processing" || status === "validating";
  const phase = busy
    ? status
    : errors.length
      ? "failed"
      : status === "cancelled"
        ? "cancelled"
        : "ready";
  return (
    <div className="process-action" data-state={phase}>
      <p className="processing-state" role="status">
        {phase === "validating"
          ? "Checking files…"
          : phase === "processing"
            ? "Processing…"
            : phase === "failed"
              ? "Failed"
              : phase === "cancelled"
                ? "Cancelled"
                : "Ready"}
      </p>
      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <AlertCircle size={19} />
          <div>
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
      <Button
        className="process-button"
        onClick={retry && errors.length ? retry : process}
        disabled={!files.length || busy}
      >
        {busy ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          <ToolIcon name={tool.icon} size={18} />
        )}
        {busy
          ? "Working…"
          : retry && errors.length
            ? "Retry failed files"
            : errors.length
              ? "Try again"
              : tool.action}
        {!busy && <ArrowRight size={17} />}
      </Button>
      {status === "processing" && (
        <>
          <p role="status" className="processing-detail">
            {detail}
          </p>
          {total > 0 && (
            <>
              <progress
                aria-label="Processing progress"
                value={completed}
                max={total}
              />
              <p className="hint">
                {completed} of {total} completed
              </p>
            </>
          )}
          <Button variant="outline" onClick={cancel}>
            Cancel processing
          </Button>
        </>
      )}
      <p className="secure-note">
        <ShieldCheck size={14} />
        Private, local, and free. Always.
      </p>
    </div>
  );
}
