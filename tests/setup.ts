import "@testing-library/jest-dom/vitest";

if (typeof ResizeObserver === "undefined")
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
