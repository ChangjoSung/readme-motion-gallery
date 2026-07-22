import type { ChangeEvent, ReactNode } from "react";

type CommonProps = {
  label: string;
  path: string;
  error?: string;
  hint?: string;
};

function Field({ label, path, error, hint, children }: CommonProps & { children: ReactNode }) {
  const messageId = `${path.replaceAll(".", "-")}-message`;
  return (
    <div className="field">
      <div className="field-heading">
        <label htmlFor={path}>{label}</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
      {error && (
        <span className="field-error" id={messageId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function accessibility(path: string, error?: string) {
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${path.replaceAll(".", "-")}-message` : undefined,
  };
}

export function NumberField({
  label,
  path,
  value,
  min,
  max,
  step = 1,
  error,
  hint,
  onChange,
}: CommonProps & {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} path={path} error={error} hint={hint}>
      <input
        id={path}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        {...accessibility(path, error)}
      />
    </Field>
  );
}

export function RangeNumberField(props: Parameters<typeof NumberField>[0]) {
  const { label, path, value, min, max, step = 1, error, hint, onChange } = props;
  return (
    <Field label={label} path={path} error={error} hint={hint}>
      <div className="range-number">
        <input
          aria-label={`${label} slider`}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          {...accessibility(path, error)}
        />
        <input
          id={path}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          {...accessibility(path, error)}
        />
      </div>
    </Field>
  );
}

export function ColorField({
  label,
  path,
  value,
  error,
  onChange,
}: CommonProps & { value: string; onChange: (value: string) => void }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  return (
    <Field label={label} path={path} error={error}>
      <div className="color-field">
        <input aria-label={`${label} picker`} type="color" value={value} onChange={handleChange} />
        <input id={path} type="text" value={value} onChange={handleChange} {...accessibility(path, error)} />
      </div>
    </Field>
  );
}

export function TextField({
  label,
  path,
  value,
  error,
  hint,
  onChange,
}: CommonProps & { value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label} path={path} error={error} hint={hint}>
      <input
        id={path}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...accessibility(path, error)}
      />
    </Field>
  );
}

export function ToggleField({
  label,
  path,
  checked,
  hint,
  onChange,
}: CommonProps & { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="toggle-field">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <label className="switch">
        <input id={path} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
        <span className="sr-only">Toggle {label}</span>
      </label>
    </div>
  );
}

export function SegmentedField<T extends string>({
  label,
  path,
  value,
  options,
  onChange,
}: CommonProps & { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented">
        {options.map((option) => (
          <label key={option} className={value === option ? "selected" : undefined}>
            <input
              type="radio"
              name={path}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
