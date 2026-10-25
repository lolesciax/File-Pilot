import { create } from "zustand";
import type { InputFile, OutputFile } from "../types";
import { MAX_TOTAL, uniqueNames } from "../lib/files";
export type JobStatus =
  "idle" | "validating" | "processing" | "success" | "error" | "cancelled";
export interface ResultOutcome {
  errors: string[];
  cancelled: boolean;
}
interface Workspace {
  files: InputFile[];
  outputs: OutputFile[];
  resultIds: Record<string, string[]>;
  resultOutcomes: Record<string, ResultOutcome>;
  status: JobStatus;
  completed: number;
  total: number;
  detail: string;
  errors: string[];
  tool: string;
  setFiles: (files: InputFile[]) => void;
  beginResults: (tool: string, retry: boolean) => void;
  saveResults: (
    tool: string,
    outputs: OutputFile[],
    outcome?: ResultOutcome,
  ) => void;
  update: (
    value: Partial<
      Pick<
        Workspace,
        "status" | "completed" | "total" | "detail" | "errors" | "tool"
      >
    >,
  ) => void;
  clear: () => void;
}
export const useWorkspace = create<Workspace>((set) => ({
  files: [],
  outputs: [],
  resultIds: {},
  resultOutcomes: {},
  status: "idle",
  completed: 0,
  total: 0,
  detail: "",
  errors: [],
  tool: "",
  setFiles: (files) => set({ files }),
  beginResults: (tool, retry) =>
    set((state) => {
      if (retry) return state;
      const replaced = new Set(state.resultIds[tool] ?? []);
      return {
        outputs: state.outputs.filter((output) => !replaced.has(output.id)),
        resultIds: { ...state.resultIds, [tool]: [] },
        resultOutcomes: {
          ...state.resultOutcomes,
          [tool]: { errors: [], cancelled: false },
        },
      };
    }),
  saveResults: (tool, incoming, outcome = { errors: [], cancelled: false }) =>
    set((state) => {
      const ids = new Set(state.resultIds[tool] ?? []);
      // Retries extend this batch; a full run clears it before processing.
      const current = state.outputs.filter((output) => ids.has(output.id));
      const combined = [
        ...current,
        ...incoming.filter((output) => !ids.has(output.id)),
      ];
      const names = uniqueNames(combined.map((output) => output.name));
      const batch = combined.map((output, index) => ({
        ...output,
        name: names[index],
      }));
      const outputs = [
        ...state.outputs.filter((output) => !ids.has(output.id)),
        ...batch,
      ];
      if (
        outputs.reduce((size, output) => size + output.blob.size, 0) > MAX_TOTAL
      )
        throw new Error(
          "Saved results exceed 300 MB. Download and clear the workspace before retrying.",
        );
      return {
        outputs,
        resultIds: {
          ...state.resultIds,
          [tool]: batch.map((output) => output.id),
        },
        resultOutcomes: { ...state.resultOutcomes, [tool]: outcome },
      };
    }),
  update: (value) => set(value),
  clear: () =>
    set({
      files: [],
      outputs: [],
      resultIds: {},
      resultOutcomes: {},
      status: "idle",
      completed: 0,
      total: 0,
      detail: "",
      errors: [],
      tool: "",
    }),
}));
