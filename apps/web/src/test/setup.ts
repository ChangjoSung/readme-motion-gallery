import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
