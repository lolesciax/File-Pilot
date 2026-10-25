import { afterEach, describe, expect, it } from "vitest";
import { useWorkspace } from "../src/stores/workspace";
import type { OutputFile } from "../src/types";
const output = (id: string, name = "report.docx"): OutputFile => ({
  id,
  name,
  blob: new Blob([id]),
});
afterEach(() => useWorkspace.getState().clear());
describe("current result batches", () => {
  it("retains partial outcomes with their batch across tool navigation and resets them for a new job", () => {
    const s = useWorkspace.getState();
    s.saveResults("resize-images", [output("partial", "image.png")], {
      errors: ["One image failed"],
      cancelled: false,
    });
    s.update({ tool: "merge-pdf", status: "idle", errors: [] });
    expect(
      useWorkspace.getState().resultOutcomes["resize-images"].errors,
    ).toEqual(["One image failed"]);
    s.beginResults("resize-images", true);
    expect(useWorkspace.getState().outputs).toHaveLength(1);
    s.saveResults("resize-images", [output("recovered", "other.png")]);
    expect(
      useWorkspace.getState().resultOutcomes["resize-images"].errors,
    ).toEqual([]);
    s.beginResults("resize-images", false);
    expect(useWorkspace.getState().resultIds["resize-images"]).toEqual([]);
    s.clear();
    expect(useWorkspace.getState().resultOutcomes).toEqual({});
  });
  it("replaces repeated conversions without suffixing against old runs or removing other tools", () => {
    const s = useWorkspace.getState();
    s.beginResults("merge-pdf", false);
    s.saveResults("merge-pdf", [output("other", "report.pdf")]);
    s.beginResults("pdf-to-word", false);
    s.saveResults("pdf-to-word", [output("first")]);
    s.beginResults("pdf-to-word", false);
    s.saveResults("pdf-to-word", [output("second")]);
    expect(useWorkspace.getState().outputs.map((item) => item.id)).toEqual([
      "other",
      "second",
    ]);
    expect(useWorkspace.getState().resultIds["pdf-to-word"]).toEqual([
      "second",
    ]);
    expect(useWorkspace.getState().outputs[1].name).toBe("report.docx");
  });
  it("merges retry successes into the batch exactly once and handles genuine filename collisions", () => {
    const s = useWorkspace.getState();
    s.beginResults("resize-images", false);
    s.saveResults("resize-images", [output("a", "image.png")]);
    s.beginResults("resize-images", true);
    s.saveResults("resize-images", [
      output("a", "image.png"),
      output("b", "image.png"),
    ]);
    expect(useWorkspace.getState().resultIds["resize-images"]).toEqual([
      "a",
      "b",
    ]);
    expect(
      new Set(useWorkspace.getState().outputs.map((item) => item.name)).size,
    ).toBe(2);
  });
  it("does not leave stale success results when a replacement run fails", () => {
    const s = useWorkspace.getState();
    s.saveResults("pdf-to-word", [output("old")]);
    s.beginResults("pdf-to-word", false);
    s.update({ status: "error", errors: ["Conversion failed"] });
    expect(useWorkspace.getState().outputs).toEqual([]);
    expect(useWorkspace.getState().resultIds["pdf-to-word"]).toEqual([]);
  });
  it("rejects excess saved data atomically and clears batch bookkeeping", () => {
    const s = useWorkspace.getState();
    s.saveResults("pdf-to-word", [output("good")]);
    expect(() =>
      s.saveResults("pdf-to-word", [
        {
          id: "large",
          name: "large.pdf",
          blob: { size: 301 * 1024 * 1024 } as Blob,
        },
      ]),
    ).toThrow("300 MB");
    expect(useWorkspace.getState().resultIds["pdf-to-word"]).toEqual(["good"]);
    s.clear();
    expect(useWorkspace.getState().resultIds).toEqual({});
    expect(useWorkspace.getState().outputs).toEqual([]);
  });
});
