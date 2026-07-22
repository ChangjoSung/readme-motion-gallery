import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../App";
import { previewSourceServices } from "../preview/usePreviewSources";
import { EditorProvider } from "../state/EditorContext";
import { browserImageServices } from "../state/localImages";

function noOpCanvasContext() {
  const methods = new Map<string | symbol, ReturnType<typeof vi.fn>>();
  return new Proxy({}, {
    get(_target, property) {
      if (!methods.has(property)) methods.set(property, vi.fn());
      return methods.get(property);
    },
    set() { return true; },
  }) as CanvasRenderingContext2D;
}

describe("live Canvas preview", () => {
  it("updates without reload and exposes playback, seek, and frame metadata", async () => {
    const user = userEvent.setup();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(noOpCanvasContext());
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(browserImageServices, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(browserImageServices, "decodeImage").mockResolvedValue({ width: 1280, height: 720 });
    vi.spyOn(browserImageServices, "createId").mockReturnValue("preview-image");
    vi.spyOn(previewSourceServices, "create").mockResolvedValue({
      source: {} as CanvasImageSource,
      width: 1280,
      height: 720,
      close: vi.fn(),
    });
    render(<EditorProvider><App /></EditorProvider>);

    await user.upload(
      screen.getByLabelText(/Add PNG or JPEG files/),
      new File(["pixels"], "preview.png", { type: "image/png" }),
    );
    const canvas = screen.getByTestId("preview-canvas");
    await waitFor(() => expect(screen.getByRole("button", { name: "Play" })).toBeEnabled());
    expect(canvas).toHaveAttribute("width", "1280");
    expect(screen.getByText("8 GIF frames")).toBeInTheDocument();

    const width = screen.getByLabelText("Width");
    await user.clear(width);
    await user.type(width, "640");
    expect(canvas).toHaveAttribute("width", "640");

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("slider", { name: "Preview timeline" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Restart" })).toBeEnabled();
  });
});
