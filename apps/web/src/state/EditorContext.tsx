import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { LocalImage, OutputTab } from "../types";
import { createInitialState, editorReducer, type PresetName } from "./editorState";
import {
  browserImageServices,
  moveImage,
  prepareLocalImages,
  removeImage as removeFromList,
  renumberImages,
} from "./localImages";
import { validateConfig, type ValidationResult } from "./validation";

type EditorContextValue = {
  state: ReturnType<typeof createInitialState>;
  validation: ValidationResult;
  imageError: string | null;
  setConfig: (path: string, value: string | number | boolean) => void;
  addFiles: (files: File[]) => Promise<void>;
  replaceFile: (id: string, file: File) => Promise<void>;
  removeImage: (id: string) => void;
  reorderImage: (fromIndex: number, toIndex: number) => void;
  applyPreset: (preset: PresetName) => void;
  reset: () => void;
  setOutput: (output: OutputTab) => void;
  setPlaying: (playing: boolean) => void;
  setRevealedIndex: (index: number) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialState);
  const [imageError, setImageError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const imageVersionRef = useRef(0);
  const mountedRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      imageVersionRef.current += 1;
      for (const image of stateRef.current.localImages) {
        browserImageServices.revokeObjectURL(image.objectUrl);
      }
    };
  }, []);

  const setConfig = useCallback((path: string, value: string | number | boolean) => {
    dispatch({ type: "set-config", path, value });
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const existing = stateRef.current.localImages;
    const version = imageVersionRef.current;
    const result = await prepareLocalImages(files, existing);
    if (!result.ok) {
      if (mountedRef.current) setImageError(result.message);
      return;
    }
    if (!mountedRef.current || imageVersionRef.current !== version) {
      for (const image of result.images) browserImageServices.revokeObjectURL(image.objectUrl);
      return;
    }
    imageVersionRef.current += 1;
    setImageError(null);
    dispatch({ type: "set-images", images: renumberImages([...existing, ...result.images]) });
  }, []);

  const replaceFile = useCallback(async (id: string, file: File) => {
    const current = stateRef.current.localImages;
    const index = current.findIndex((image) => image.id === id);
    if (index < 0) return;
    const version = imageVersionRef.current;
    const withoutTarget = current.filter((image) => image.id !== id);
    const result = await prepareLocalImages([file], withoutTarget);
    if (!result.ok) {
      if (mountedRef.current) setImageError(result.message);
      return;
    }
    if (!mountedRef.current || imageVersionRef.current !== version) {
      for (const image of result.images) browserImageServices.revokeObjectURL(image.objectUrl);
      return;
    }
    imageVersionRef.current += 1;
    browserImageServices.revokeObjectURL(current[index].objectUrl);
    const next = [...current];
    next[index] = result.images[0];
    setImageError(null);
    dispatch({ type: "set-images", images: renumberImages(next) });
  }, []);

  const removeImage = useCallback((id: string) => {
    const current = stateRef.current.localImages;
    const target = current.find((image) => image.id === id);
    if (!target) return;
    imageVersionRef.current += 1;
    browserImageServices.revokeObjectURL(target.objectUrl);
    setImageError(null);
    dispatch({ type: "set-images", images: removeFromList(current, id) });
  }, []);

  const reorderImage = useCallback((fromIndex: number, toIndex: number) => {
    imageVersionRef.current += 1;
    dispatch({ type: "set-images", images: moveImage(stateRef.current.localImages, fromIndex, toIndex) });
  }, []);

  const reset = useCallback(() => {
    imageVersionRef.current += 1;
    for (const image of stateRef.current.localImages) {
      browserImageServices.revokeObjectURL(image.objectUrl);
    }
    setImageError(null);
    dispatch({ type: "reset" });
  }, []);

  const setPlaying = useCallback((playing: boolean) => {
    dispatch({ type: "set-playing", playing });
  }, []);

  const setRevealedIndex = useCallback((index: number) => {
    dispatch({ type: "set-revealed-index", index });
  }, []);

  const validation = useMemo(() => validateConfig(state.config), [state.config]);
  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      validation,
      imageError,
      setConfig,
      addFiles,
      replaceFile,
      removeImage,
      reorderImage,
      applyPreset: (preset) => dispatch({ type: "apply-preset", preset }),
      reset,
      setOutput: (output) => dispatch({ type: "set-output", output }),
      setPlaying,
      setRevealedIndex,
    }),
    [
      addFiles,
      imageError,
      removeImage,
      reorderImage,
      replaceFile,
      reset,
      setConfig,
      setPlaying,
      setRevealedIndex,
      state,
      validation,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside EditorProvider");
  return context;
}

export type { LocalImage };
