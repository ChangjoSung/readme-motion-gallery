import Ajv2020, { type ErrorObject } from "ajv/dist/2020";

import schema from "../../../../schema/gallery-config-v1.schema.json";
import type { GalleryConfigV1 } from "../types";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

function errorPath(error: ErrorObject): string {
  const path = error.instancePath.replace(/^\//, "").replaceAll("/", ".");
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty: string }).missingProperty;
    return path ? `${path}.${missing}` : missing;
  }
  return path || "config";
}

export function validateConfig(config: GalleryConfigV1): ValidationResult {
  const valid = validateSchema(config);
  const errors: Record<string, string> = {};
  if (!valid) {
    for (const error of validateSchema.errors ?? []) {
      const path = errorPath(error);
      errors[path] ??= error.message ?? "Invalid value";
    }
  }
  return { valid: Boolean(valid), errors };
}
