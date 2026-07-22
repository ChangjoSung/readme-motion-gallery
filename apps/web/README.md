# Web editor

The browser editor implements the accepted version 1 contract in
[`docs/web-editor-contract-v1.md`](../../docs/web-editor-contract-v1.md).

## Development

```bash
cd apps/web
pnpm install --frozen-lockfile
pnpm dev
```

Run the automated checks with:

```bash
pnpm test
pnpm build
```

## Current boundary

This app currently provides the responsive editor shell, every version 1 setting, local PNG/JPEG image
management, schema validation, presets, and resource cleanup. Canvas animation preview, generated project code,
starter bundles, CI, and deployment are delivered by the follow-up milestone issues.

Selected image bytes stay in memory in the active browser tab. The editor does not upload or persist them.
