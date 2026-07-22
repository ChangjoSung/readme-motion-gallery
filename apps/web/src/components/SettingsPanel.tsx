import { useEditor } from "../state/EditorContext";
import type { LayoutType, RevealMode } from "../types";
import {
  ColorField,
  NumberField,
  RangeNumberField,
  SegmentedField,
  TextField,
  ToggleField,
} from "./controls";

export function SettingsPanel() {
  const { state, validation, setConfig } = useEditor();
  const { config } = state;
  const error = (path: string) => validation.errors[path];

  return (
    <div className="settings-groups">
      <details open>
        <summary><span>Canvas</span><small>Size & background</small></summary>
        <div className="settings-grid">
          <NumberField label="Width" path="canvas.width" value={config.canvas.width} min={320} max={1920} error={error("canvas.width")} onChange={(value) => setConfig("canvas.width", value)} />
          <NumberField label="Height" path="canvas.height" value={config.canvas.height} min={180} max={1080} error={error("canvas.height")} onChange={(value) => setConfig("canvas.height", value)} />
          <ColorField label="Background" path="canvas.background" value={config.canvas.background} error={error("canvas.background")} onChange={(value) => setConfig("canvas.background", value)} />
        </div>
      </details>

      <details open>
        <summary><span>Layout</span><small>Placement & fit</small></summary>
        <div className="settings-stack">
          <SegmentedField<LayoutType> label="Layout type" path="layout.type" value={config.layout.type} options={["grid", "staggered"]} onChange={(value) => setConfig("layout.type", value)} />
          <RangeNumberField label="Margin" path="layout.margin" value={config.layout.margin} min={0} max={200} error={error("layout.margin")} onChange={(value) => setConfig("layout.margin", value)} />
          <RangeNumberField label="Gap" path="layout.gap" value={config.layout.gap} min={0} max={200} error={error("layout.gap")} onChange={(value) => setConfig("layout.gap", value)} />
          <NumberField label="Card aspect ratio" path="layout.card_aspect_ratio" value={config.layout.card_aspect_ratio} min={0.5} max={3} step={0.01} error={error("layout.card_aspect_ratio")} hint="16 ÷ 9 = 1.78" onChange={(value) => setConfig("layout.card_aspect_ratio", value)} />
          <ToggleField label="Preserve image ratio" path="layout.preserve_aspect_ratio" checked={config.layout.preserve_aspect_ratio} hint="Off uses a cover crop" onChange={(value) => setConfig("layout.preserve_aspect_ratio", value)} />
        </div>
      </details>

      <details>
        <summary><span>Card style</span><small>Border & depth</small></summary>
        <div className="settings-stack">
          <RangeNumberField label="Corner radius" path="layout.border_radius" value={config.layout.border_radius} min={0} max={64} error={error("layout.border_radius")} onChange={(value) => setConfig("layout.border_radius", value)} />
          <RangeNumberField label="Border width" path="layout.border_width" value={config.layout.border_width} min={0} max={12} error={error("layout.border_width")} onChange={(value) => setConfig("layout.border_width", value)} />
          <ColorField label="Border color" path="layout.border_color" value={config.layout.border_color} error={error("layout.border_color")} onChange={(value) => setConfig("layout.border_color", value)} />
          <ToggleField label="Shadow" path="layout.shadow" checked={config.layout.shadow} onChange={(value) => setConfig("layout.shadow", value)} />
        </div>
      </details>

      <details>
        <summary><span>Animation</span><small>Wipe & timing</small></summary>
        <div className="settings-stack">
          <div className="fixed-field"><span>Transition</span><code>wipe</code></div>
          <SegmentedField<RevealMode> label="Reveal mode" path="animation.reveal_mode" value={config.animation.reveal_mode} options={["cumulative", "replace"]} onChange={(value) => setConfig("animation.reveal_mode", value)} />
          <RangeNumberField label="Transition" path="animation.transition_ms" value={config.animation.transition_ms} min={100} max={5000} error={error("animation.transition_ms")} hint="milliseconds" onChange={(value) => setConfig("animation.transition_ms", value)} />
          <RangeNumberField label="Hold" path="animation.hold_ms" value={config.animation.hold_ms} min={0} max={10000} error={error("animation.hold_ms")} hint="milliseconds" onChange={(value) => setConfig("animation.hold_ms", value)} />
          <RangeNumberField label="Initial hold" path="animation.initial_hold_ms" value={config.animation.initial_hold_ms} min={0} max={10000} error={error("animation.initial_hold_ms")} hint="milliseconds" onChange={(value) => setConfig("animation.initial_hold_ms", value)} />
          <RangeNumberField label="Final hold" path="animation.final_hold_ms" value={config.animation.final_hold_ms} min={0} max={30000} error={error("animation.final_hold_ms")} hint="milliseconds" onChange={(value) => setConfig("animation.final_hold_ms", value)} />
          <RangeNumberField label="Frames per transition" path="animation.frames_per_transition" value={config.animation.frames_per_transition} min={2} max={12} error={error("animation.frames_per_transition")} onChange={(value) => setConfig("animation.frames_per_transition", value)} />
          <ToggleField label="Scan line" path="animation.scan_line" checked={config.animation.scan_line} onChange={(value) => setConfig("animation.scan_line", value)} />
          <ToggleField label="Loop GIF" path="animation.loop" checked={config.animation.loop} onChange={(value) => setConfig("animation.loop", value)} />
        </div>
      </details>

      <details>
        <summary><span>Output</span><small>File & palette</small></summary>
        <div className="settings-stack">
          <TextField label="GIF path" path="output.path" value={config.output.path} error={error("output.path")} hint="Repository-relative .gif path" onChange={(value) => setConfig("output.path", value)} />
          <NumberField label="Maximum size" path="output.max_size_mb" value={config.output.max_size_mb} min={0.1} max={25} step={0.1} error={error("output.max_size_mb")} hint="MiB" onChange={(value) => setConfig("output.max_size_mb", value)} />
          <RangeNumberField label="Palette colors" path="output.colors" value={config.output.colors} min={32} max={256} error={error("output.colors")} onChange={(value) => setConfig("output.colors", value)} />
          <div className="fixed-field"><span>Config version</span><code>1</code></div>
        </div>
      </details>
    </div>
  );
}
