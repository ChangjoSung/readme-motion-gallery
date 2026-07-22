import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";
import { EditorProvider } from "./state/EditorContext";
import { browserImageServices } from "./state/localImages";

function renderApp() {
  return render(<EditorProvider><App /></EditorProvider>);
}

describe("editor shell", () => {
  it("exposes the complete settings groups and responsive editor regions", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Screenshots" })).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.getByText("Layout")).toBeInTheDocument();
    expect(screen.getByText("Card style")).toBeInTheDocument();
    expect(screen.getByText("Animation")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Preview and generated output" })).toBeInTheDocument();
    expect(screen.getByText("Your image bytes stay in this browser tab. Nothing is uploaded.")).toBeInTheDocument();
    for (const control of [
      "Width",
      "Height",
      "Background",
      "Layout type",
      "Margin",
      "Gap",
      "Card aspect ratio",
      "Preserve image ratio",
      "Corner radius",
      "Border width",
      "Border color",
      "Shadow",
      "Reveal mode",
      "Transition",
      "Hold",
      "Initial hold",
      "Final hold",
      "Frames per transition",
      "Scan line",
      "Loop GIF",
      "GIF path",
      "Maximum size",
      "Palette colors",
    ]) {
      expect(screen.getAllByText(control).length).toBeGreaterThan(0);
    }
  });

  it("keeps image bytes local and revokes object URLs on remove", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(browserImageServices, "createObjectURL").mockReturnValue("blob:local-image");
    vi.spyOn(browserImageServices, "decodeImage").mockResolvedValue({ width: 640, height: 360 });
    const revoke = vi.spyOn(browserImageServices, "revokeObjectURL");
    vi.spyOn(browserImageServices, "createId").mockReturnValue("local-image");
    renderApp();

    const file = new File(["private bytes"], "game.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/Add PNG or JPEG files/), file);
    expect(await screen.findByText("screenshots/01.png")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove game.png" }));
    expect(revoke).toHaveBeenCalledWith("blob:local-image");
    expect(screen.queryByText("screenshots/01.png")).not.toBeInTheDocument();
  });

  it("revokes remaining object URLs when the editor unmounts", async () => {
    const user = userEvent.setup();
    vi.spyOn(browserImageServices, "createObjectURL").mockReturnValue("blob:on-unmount");
    vi.spyOn(browserImageServices, "decodeImage").mockResolvedValue({ width: 640, height: 360 });
    const revoke = vi.spyOn(browserImageServices, "revokeObjectURL");
    vi.spyOn(browserImageServices, "createId").mockReturnValue("unmount-image");
    const view = renderApp();
    await user.upload(
      screen.getByLabelText(/Add PNG or JPEG files/),
      new File(["private bytes"], "keep.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText("screenshots/01.jpg")).toBeInTheDocument();
    view.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:on-unmount");
  });

  it("revokes the previous URL when an image is replaced and the current URL on reset", async () => {
    const user = userEvent.setup();
    vi.spyOn(browserImageServices, "createObjectURL")
      .mockReturnValueOnce("blob:original")
      .mockReturnValueOnce("blob:replacement");
    vi.spyOn(browserImageServices, "decodeImage").mockResolvedValue({ width: 640, height: 360 });
    const revoke = vi.spyOn(browserImageServices, "revokeObjectURL");
    vi.spyOn(browserImageServices, "createId").mockReturnValueOnce("original").mockReturnValueOnce("replacement");
    renderApp();

    await user.upload(
      screen.getByLabelText(/Add PNG or JPEG files/),
      new File(["first"], "first.png", { type: "image/png" }),
    );
    await user.upload(
      screen.getByLabelText("Replace first.png"),
      new File(["second"], "second.jpg", { type: "image/jpeg" }),
    );
    expect(revoke).toHaveBeenCalledWith("blob:original");
    expect(await screen.findByText("screenshots/01.jpg")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(revoke).toHaveBeenCalledWith("blob:replacement");
    expect(screen.queryByText("screenshots/01.jpg")).not.toBeInTheDocument();
  });
});
