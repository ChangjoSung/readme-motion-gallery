import type { CSSProperties } from "react";

import { useEditor } from "../state/EditorContext";
import type { OutputTab } from "../types";

const outputTabs: Array<{ id: OutputTab; label: string }> = [
  { id: "yaml", label: "gallery.yml" },
  { id: "workflow", label: "Action" },
  { id: "markdown", label: "README" },
  { id: "cli", label: "CLI" },
];

export function PreviewPanel() {
  const { state, validation, setOutput } = useEditor();
  const { config, localImages } = state;
  const previewStyle = {
    "--preview-bg": config.canvas.background,
    "--preview-border": config.layout.border_color,
    "--preview-radius": `${Math.min(config.layout.border_radius, 28)}px`,
    "--preview-border-width": `${Math.min(config.layout.border_width, 8)}px`,
    "--preview-fit": config.layout.preserve_aspect_ratio ? "contain" : "cover",
  } as CSSProperties;

  return (
    <aside className="preview-column" aria-label="Preview and generated output">
      <section className="preview-card">
        <div className="preview-toolbar">
          <div>
            <span className="eyebrow">Browser preview</span>
            <h2>Gallery draft</h2>
          </div>
          <span className={`validation-badge ${validation.valid ? "valid" : "invalid"}`}>
            {validation.valid ? "Ready" : `${Object.keys(validation.errors).length} issue${Object.keys(validation.errors).length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className={`structural-preview ${config.layout.type}`} style={previewStyle}>
          {localImages.length === 0 ? (
            <div className="empty-preview">
              <span aria-hidden="true">▧</span>
              <strong>Your gallery starts here</strong>
              <p>Add at least one screenshot to see its layout.</p>
            </div>
          ) : (
            localImages.map((image, index) => (
              <figure key={image.id} className={config.layout.shadow ? "with-shadow" : undefined}>
                <img src={image.objectUrl} alt={`Preview ${index + 1}: ${image.file.name}`} />
                <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
              </figure>
            ))
          )}
        </div>
        <div className="preview-meta">
          <span>{config.canvas.width} × {config.canvas.height}</span>
          <span>{config.layout.type}</span>
          <span>{config.animation.reveal_mode}</span>
        </div>
        <p className="preview-disclaimer">Layout draft only. The Python renderer remains the final GIF authority.</p>
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
