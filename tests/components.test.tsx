import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../src/features/Home";
import Settings from "../src/features/Settings";
import { Dropzone } from "../src/components/Dropzone";
import { ConfirmDialog } from "../src/components/ui/dialog";
afterEach(cleanup);
describe("tool discovery and settings", () => {
  it("searches working tool routes", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "resize" },
    });
    expect(screen.getByRole("link", { name: /Resize images/ })).toHaveAttribute(
      "href",
      "/tool/resize-images",
    );
    expect(
      screen.queryByRole("link", { name: /Merge PDF/ }),
    ).not.toBeInTheDocument();
  });
  it("changes and persists theme preference", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("filepilot-theme")).toBe("dark");
  });
});
describe("upload and confirmation", () => {
  it("accepts file picker and drop events", () => {
    const onFiles = vi.fn();
    render(
      <Dropzone
        accept="application/pdf"
        multiple
        disabled={false}
        onFiles={onFiles}
      />,
    );
    const f = new File(["pdf"], "a.pdf");
    fireEvent.change(screen.getByLabelText("Select files"), {
      target: { files: [f] },
    });
    expect(onFiles).toHaveBeenCalledWith([f]);
    fireEvent.drop(
      screen.getByText("Drop your files here").closest(".dropzone")!,
      { dataTransfer: { files: [f] } },
    );
    expect(onFiles).toHaveBeenCalledTimes(2);
  });
  it("requires a focused confirmation before clearing", () => {
    const confirm = vi.fn();
    render(
      <ConfirmDialog
        title="Clear session?"
        description="Removes results"
        trigger={<button>Clear</button>}
        onConfirm={confirm}
      />,
    );
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear workspace" }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});
