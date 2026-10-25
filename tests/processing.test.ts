// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { unzipSync } from "fflate";
import {
  parseRanges,
  renameFiles,
  safeName,
  uniqueNames,
  validateFile,
  checkPixels,
} from "../src/lib/files";
import { dimensions } from "../src/processing/image";
import { processPDF, loadPDF } from "../src/processing/pdf";
import { archive } from "../src/processing/archive";
import { defaultOptions, type InputFile, type JobContext } from "../src/types";
import { useWorkspace } from "../src/stores/workspace";
const ctx: JobContext = {
  signal: new AbortController().signal,
  progress: () => {},
};
async function fixture(widths: number[]): Promise<InputFile> {
  const pdf = await PDFDocument.create();
  widths.forEach((w) => pdf.addPage([w, 400]));
  return {
    id: crypto.randomUUID(),
    file: new File([new Uint8Array(await pdf.save())], "fixture.pdf", {
      type: "application/pdf",
    }),
  };
}
async function widths(blob: Blob) {
  return (await PDFDocument.load(await blob.arrayBuffer()))
    .getPages()
    .map((p) => p.getWidth());
}
describe("page selection", () => {
  it("preserves requested order and duplicates", () =>
    expect(parseRanges("3, 1-2, 1", 3)).toEqual([2, 0, 1, 0]));
  it("defaults to all pages", () =>
    expect(parseRanges("", 3)).toEqual([0, 1, 2]));
  it.each(["0", "4", "2-1", "1-4", "abc", "1,,2"])(
    "rejects invalid range %s",
    (v) => expect(() => parseRanges(v, 3)).toThrow(),
  );
});
describe("real PDF outputs", () => {
  it("merges in source and page order", async () => {
    const out = await processPDF(
      "merge-pdf",
      [await fixture([200, 210]), await fixture([300])],
      defaultOptions,
      [],
      ctx,
    );
    expect(await widths(out[0].blob)).toEqual([200, 210, 300]);
  });
  it("splits every page into a valid PDF", async () => {
    const out = await processPDF(
      "split-pdf",
      [await fixture([200, 210, 220])],
      { ...defaultOptions, splitMode: "individual" },
      [],
      ctx,
    );
    expect(out).toHaveLength(3);
    expect(await widths(out[1].blob)).toEqual([210]);
  });
  it("splits custom groups", async () => {
    const out = await processPDF(
      "split-pdf",
      [await fixture([200, 210, 220])],
      { ...defaultOptions, splitMode: "groups", ranges: "3,1; 2" },
      [],
      ctx,
    );
    expect(await widths(out[0].blob)).toEqual([220, 200]);
    expect(await widths(out[1].blob)).toEqual([210]);
  });
  it("extracts ordered pages", async () => {
    const out = await processPDF(
      "extract-pdf",
      [await fixture([200, 210, 220])],
      { ...defaultOptions, ranges: "3,1" },
      [],
      ctx,
    );
    expect(await widths(out[0].blob)).toEqual([220, 200]);
  });
  it("organizes, duplicates, and rotates without changing source", async () => {
    const f = await fixture([200, 210]);
    const out = await processPDF(
      "organize-pdf",
      [f],
      defaultOptions,
      [
        { id: "a", index: 1, rotation: 90, selected: false },
        { id: "b", index: 1, rotation: 180, selected: false },
        { id: "c", index: 0, rotation: 0, selected: false },
      ],
      ctx,
    );
    const doc = await PDFDocument.load(await out[0].blob.arrayBuffer());
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([210, 210, 200]);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([
      90, 180, 0,
    ]);
    expect(await widths(f.file)).toEqual([200, 210]);
  });
  it("adds rotation to existing orientation", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 300]).setRotation(degrees(90));
    const f = {
      id: "f",
      file: new File([new Uint8Array(await pdf.save())], "a.pdf"),
    };
    const out = await processPDF(
      "rotate-pdf",
      [f],
      defaultOptions,
      [{ id: "x", index: 0, rotation: 270, selected: true }],
      ctx,
    );
    expect(
      (await PDFDocument.load(await out[0].blob.arrayBuffer()))
        .getPage(0)
        .getRotation().angle,
    ).toBe(0);
  });
  it("rejects unreadable PDF", async () => {
    await expect(loadPDF(new Blob(["bad"]))).rejects.toThrow("damaged");
  });
  it("honors cancellation", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      processPDF("merge-pdf", [await fixture([200])], defaultOptions, [], {
        ...ctx,
        signal: ac.signal,
      }),
    ).rejects.toThrow("cancelled");
  });
});
describe("image sizing and validation", () => {
  it("preserves aspect ratio with width", () =>
    expect(
      dimensions(400, 200, {
        ...defaultOptions,
        dimensionMode: "width",
        width: 100,
      }),
    ).toEqual([100, 50]));
  it("supports height and percentage", () => {
    expect(
      dimensions(400, 200, {
        ...defaultOptions,
        dimensionMode: "height",
        height: 100,
      }),
    ).toEqual([200, 100]);
    expect(
      dimensions(400, 200, {
        ...defaultOptions,
        dimensionMode: "percent",
        percent: 25,
      }),
    ).toEqual([100, 50]);
  });
  it("rejects unsafe canvas sizes", () => {
    expect(() => checkPixels(9000, 5)).toThrow();
    expect(() => checkPixels(8000, 8000)).toThrow();
  });
  it("checks signatures rather than MIME or extension", async () => {
    await expect(
      validateFile(
        new File(["fake"], "test.pdf", { type: "application/pdf" }),
        "pdf",
      ),
    ).rejects.toThrow("valid PDF");
    await expect(
      validateFile(
        new File(["<svg/>"], "photo.png", { type: "image/png" }),
        "image",
      ),
    ).rejects.toThrow("JPEG");
  });
  it("rejects empty input", async () => {
    await expect(
      validateFile(new File([], "empty.txt"), "any"),
    ).rejects.toThrow("empty");
  });
});
describe("names and ZIP output", () => {
  it("cleans unsafe and reserved filenames", () => {
    expect(safeName("../../x<script>.txt")).not.toMatch(/[<>/\\]/);
    expect(safeName("CON.txt")).toBe("_CON.txt");
  });
  it("handles collisions case insensitively", () =>
    expect(uniqueNames(["A.txt", "a.txt", "A.txt"])).toEqual([
      "A.txt",
      "a (2).txt",
      "A (3).txt",
    ]));
  it("renames with numbering and preserved extensions", () =>
    expect(
      renameFiles(["one.JPG", "two.png"], {
        ...defaultOptions,
        prefix: "Portfolio",
        keepName: false,
      }),
    ).toEqual(["Portfolio_001.JPG", "Portfolio_002.png"]));
  it("maps actual bytes to safe unique ZIP names", async () => {
    const blob = await archive([
      { name: "../hello.txt", blob: new Blob(["first"]) },
      { name: "../hello.txt", blob: new Blob(["second"]) },
    ]);
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(zip)).toHaveLength(2);
    expect(Object.keys(zip).every((n) => !n.includes("/"))).toBe(true);
    expect(Object.values(zip).map((v) => new TextDecoder().decode(v))).toEqual([
      "first",
      "second",
    ]);
  });
});
it("records processing state transitions and clears files", () => {
  const s = useWorkspace.getState();
  s.update({ status: "processing", completed: 1, total: 2 });
  expect(useWorkspace.getState().status).toBe("processing");
  s.update({ status: "success" });
  expect(useWorkspace.getState().status).toBe("success");
  s.clear();
  expect(useWorkspace.getState().status).toBe("idle");
  expect(useWorkspace.getState().outputs).toEqual([]);
});
