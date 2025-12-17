# Landing assets

Put your landing images here.

## Slides

- Folder: `public/assets/landing/slides/`
- (Deprecated) This folder is not used by the app.
- The landing uses only (see `lib/config/landing.ts`):
  - `ui/1.png`
  - `ui/2.png`
  - `ui/3.png`

In Next.js, anything under `public/` is served from `/`.
So `public/assets/...` becomes `/assets/...`.

If a slide image is missing or fails to load, the UI will fall back to a safe gradient background.


