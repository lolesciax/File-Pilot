import { useLayoutEffect, useRef } from "react";
import { RotateCcw, SlidersHorizontal, ShieldCheck } from "lucide-react";
import type { Tool, OutputFile } from "../types";
import type { ResultOutcome } from "../stores/workspace";
import { completionMessages, downloadLabel } from "../lib/completion";
import { Results } from "./Results";
import { Button } from "./ui/button";

export function CompletionScreen({
  tool,
  outputs,
  outcome,
  another,
  review,
  retry,
}: {
  tool: Tool;
  outputs: OutputFile[];
  outcome?: ResultOutcome;
  another: () => void;
  review: () => void;
  retry?: () => void;
}) {
  const screen = useRef<HTMLElement>(null);
  const revision = outputs.map((output) => output.id).join(",");
  const partial = !!outcome?.errors.length || !!outcome?.cancelled;
  useLayoutEffect(() => {
    const heading = screen.current?.querySelector<HTMLHeadingElement>("h2");
    const action = screen.current?.querySelector<HTMLButtonElement>(
      ".result-primary-action button",
    );
    if (!heading || !action) return;
    const top = screen.current!.getBoundingClientRect().top;
    const bottom = action.getBoundingClientRect().bottom;
    const height = window.visualViewport?.height ?? innerHeight;
    if (top < 16 || bottom > height - 16)
      window.scrollTo({
        top: Math.max(0, top + window.scrollY - 24),
        behavior: "instant",
      });
    heading.focus({ preventScroll: true });
  }, [revision]);
  return (
    <section
      ref={screen}
      className="completion-screen panel"
      aria-label={`${tool.title} results`}
      data-state={partial ? "partial" : "completed"}
    >
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {partial ? "Processing stopped with issues." : "Processing completed."}{" "}
        {outputs.length} {outputs.length === 1 ? "file is" : "files are"} ready
        to download.
      </p>
      <Results
        outputs={outputs}
        completion
        partial={partial}
        title={
          outcome?.cancelled
            ? "Processing was cancelled"
            : partial
              ? "Some files are ready"
              : "Your files are ready"
        }
        message={
          partial
            ? "Download the available files below. Review the issues before continuing."
            : completionMessages[tool.id]
        }
        issues={outcome?.errors}
        singleLabel={downloadLabel(outputs[0])}
      />
      <div className="completion-secondary">
        {retry && (
          <Button variant="outline" onClick={retry}>
            Retry failed files
          </Button>
        )}
        <Button variant="outline" onClick={another}>
          <RotateCcw size={17} />
          Process Another File
        </Button>
        <Button variant="ghost" onClick={review}>
          <SlidersHorizontal size={16} />
          Review files and settings
        </Button>
      </div>
      <p className="secure-note">
        <ShieldCheck size={14} />
        Processed locally. Your originals stay untouched.
      </p>
    </section>
  );
}
