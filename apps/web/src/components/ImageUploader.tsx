import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import { useEditor } from "../state/EditorContext";
import { MAX_IMAGE_COUNT } from "../state/localImages";

export function ImageUploader() {
  const { state, imageError, addFiles, replaceFile, removeImage, reorderImage } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFiles = async (files: FileList | null) => {
    if (files) await addFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  const drop = (event: DragEvent<HTMLLIElement>, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex !== null) reorderImage(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const reorderWithKeyboard = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
    reorderImage(index, nextIndex);
  };

  return (
    <section className="panel-section upload-section" aria-labelledby="images-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Local input</span>
          <h2 id="images-heading">Screenshots</h2>
        </div>
        <span className="count-badge">{state.localImages.length} / {MAX_IMAGE_COUNT}</span>
      </div>

      <label className="drop-zone">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          multiple
          onChange={(event) => void selectFiles(event.target.files)}
          disabled={state.localImages.length >= MAX_IMAGE_COUNT}
        />
        <span className="drop-zone-icon" aria-hidden="true">＋</span>
        <strong>Add PNG or JPEG files</strong>
        <small>Up to 10 images · 25 MiB each · 100 MiB total</small>
      </label>

      <p className="privacy-note">
        <span aria-hidden="true">●</span> Your image bytes stay in this browser tab. Nothing is uploaded.
      </p>
      {imageError && <p className="upload-error" role="alert">{imageError}</p>}

      {state.localImages.length > 0 && (
        <ol className="image-list" aria-label="Selected screenshots">
          {state.localImages.map((image, index) => (
            <li
              key={image.id}
              draggable
              tabIndex={0}
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => drop(event, index)}
              onKeyDown={(event) => reorderWithKeyboard(event, index)}
            >
              <span className="drag-handle" aria-hidden="true">⠿</span>
              <img src={image.objectUrl} alt="" />
              <span className="image-meta">
                <strong>{image.file.name}</strong>
                <small>{image.width} × {image.height}</small>
                <code>{image.generatedPath}</code>
              </span>
              <span className="image-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${image.file.name} up`}
                  disabled={index === 0}
                  onClick={() => reorderImage(index, index - 1)}
                >↑</button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${image.file.name} down`}
                  disabled={index === state.localImages.length - 1}
                  onClick={() => reorderImage(index, index + 1)}
                >↓</button>
                <label className="icon-button replace-button" aria-label={`Replace ${image.file.name}`}>
                  ↻
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void replaceFile(image.id, file);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={`Remove ${image.file.name}`}
                  onClick={() => removeImage(image.id)}
                >×</button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {state.localImages.length > 1 && (
        <p className="keyboard-hint">Drag items or press Alt + ↑/↓ to change reveal order.</p>
      )}
    </section>
  );
}
