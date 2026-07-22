import { ImageUploader } from "./components/ImageUploader";
import { PreviewPanel } from "./components/PreviewPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useEditor } from "./state/EditorContext";
import type { PresetName } from "./state/editorState";

export function App() {
  const { applyPreset, reset } = useEditor();

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="https://github.com/ChangjoSung/readme-motion-gallery">
          <span className="brand-mark" aria-hidden="true">RMG</span>
          <span><strong>README Motion Gallery</strong><small>Editor · v0.2 development</small></span>
        </a>
        <a className="github-link" href="https://github.com/ChangjoSung/readme-motion-gallery">View on GitHub ↗</a>
      </header>

      <main>
        <section className="intro">
          <span className="eyebrow">Design locally. Publish anywhere.</span>
          <h1>Build a motion gallery for your GitHub README.</h1>
          <p>Choose screenshots, tune every renderer option, and keep the original files on your device.</p>
        </section>

        <div className="editor-layout">
          <div className="controls-column">
            <div className="preset-bar">
              <label htmlFor="preset">Preset</label>
              <select id="preset" defaultValue="balanced" onChange={(event) => applyPreset(event.target.value as PresetName)}>
                <option value="balanced">Balanced</option>
                <option value="compact">Compact grid</option>
                <option value="cinematic">Cinematic</option>
              </select>
              <button type="button" className="secondary-button" onClick={reset}>Reset all</button>
            </div>
            <ImageUploader />
            <SettingsPanel />
          </div>
          <PreviewPanel />
        </div>
      </main>

      <footer>
        Client-only editor · PNG/JPEG files are never uploaded · GIF generation remains deterministic in Python
      </footer>
    </div>
  );
}
