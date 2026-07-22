import { useEditor } from "../state/EditorContext";
import type { OutputTab } from "../types";
import { CanvasPreview } from "./CanvasPreview";

const outputTabs: Array<{ id: OutputTab; label: string }> = [
  { id: "yaml", label: "gallery.yml" },
  { id: "workflow", label: "Action" },
  { id: "markdown", label: "README" },
  { id: "cli", label: "CLI" },
];

export function PreviewPanel() {
  const { state, validation, setOutput } = useEditor();

  return (
    <aside className="preview-column" aria-label="Preview and generated output">
      <section className="preview-card">
        <div className="preview-toolbar">
          <div>
            <span className="eyebrow">Browser preview</span>
            <h2>Live gallery</h2>
          </div>
          <span className={`validation-badge ${validation.valid ? "valid" : "invalid"}`}>
            {validation.valid ? "Ready" : `${Object.keys(validation.errors).length} issue${Object.keys(validation.errors).length === 1 ? "" : "s"}`}
          </span>
        </div>
        <CanvasPreview />
        <p className="preview-disclaimer">
          Browser preview only. Pillow remains authoritative for resampling, raster edges, palette, and final GIF size.
        </p>
      </section>

      <section className="output-card">
        <div className="output-heading">
          <div>
            <span className="eyebrow">Generated setup</span>
            <h2>Copy code</h2>
          </div>
          <button type="button" disabled title="Code generation is implemented in Issue #5">Copy code</button>
        </div>
        <div className="output-tabs" role="tablist" aria-label="Generated output type">
          {outputTabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={state.activeOutput === tab.id}
              key={tab.id}
              onClick={() => setOutput(tab.id)}
            >{tab.label}</button>
          ))}
        </div>
        <div className="output-placeholder" role="tabpanel">
          <code>{validation.valid ? "Code generation continues in Issue #5." : "Fix validation errors to enable generated output."}</code>
        </div>
      </section>
    </aside>
  );
}
