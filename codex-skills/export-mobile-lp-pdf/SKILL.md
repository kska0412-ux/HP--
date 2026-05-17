---
name: export-mobile-lp-pdf
description: Convert Codex-built smartphone landing pages into shareable phone-page PDFs and optional split JPG previews. Use when a user has an LP HTML file, full-length mobile screenshot, vertical PNG/JPG/WebP, or generated image slices and wants a Google Drive/SMS-friendly PDF that opens at readable smartphone viewport size instead of a tiny ultra-tall preview.
---

# Export Mobile LP PDF

## Purpose

Create a mobile-readable sales/preview PDF from an LP made in Codex. Prefer this over one ultra-tall PDF or JPG when the output will be sent through Google Drive, SMS, LINE, email, or sales outreach.

The target result is a multipage PDF where each page is a phone viewport, usually `430x932`, so Google Drive and mobile PDF viewers show the LP at a useful size without pinch-zooming.

## Workflow

1. Identify the best source:
   - Full-length PNG/JPG/WebP from a verified LP preview: use it directly. This is the most reliable path.
   - `index.html`, `preview.html`, localhost URL, or public URL: capture directly when browser automation is allowed; otherwise first export a full-page screenshot with Browser/Chrome, then rerun this skill on that image.
   - Full-length PNG/JPG/WebP: use it directly.
   - Directory of LP slices: stitch the images in filename order.
2. Run `scripts/export_mobile_lp_pdf.cjs`.
3. Verify the first page visually. It should resemble a normal phone screenshot, not a tiny vertical strip.
4. Share the phone-page PDF for Google Drive/SMS. If the user needs image-only sharing, share the generated split JPG folder.

## Quick Commands

Use bundled Node and packages when available:

```bash
NODE_PATH="/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/path/to/export-mobile-lp-pdf/scripts/export_mobile_lp_pdf.cjs \
--input /path/to/lp-or-image \
--output /path/to/lp-phone-view.pdf \
--slice-dir /path/to/phone-slices
```

For HTML, when browser automation is allowed:

```bash
NODE_PATH="/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/path/to/export-mobile-lp-pdf/scripts/export_mobile_lp_pdf.cjs \
--input /path/to/index.html \
--output /path/to/lp-phone-view.pdf \
--viewport-width 430 \
--page-height 932
```

For a generated long preview image:

```bash
NODE_PATH="/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
/Users/kameda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
/path/to/export-mobile-lp-pdf/scripts/export_mobile_lp_pdf.cjs \
--input /path/to/lumore-full-preview.png \
--output /path/to/lumore-lp-phone-view.pdf \
--slice-dir /path/to/phone-slices
```

## Defaults

- `--viewport-width 430`
- `--page-height 932`
- `--background #ffffff`
- `--quality 88`
- `--scale 2` for HTML screenshots

Use `390x844` for a smaller iPhone-style preview, or keep `430x932` when the user wants the same readable size as the Lu more PDF.

## Output Guidance

Use names that make the share intent obvious:

- `share/lp-phone-view.pdf`
- `share/phone-slices/01.jpg`, `02.jpg`, etc.

Avoid sending:

- one ultra-tall PDF page
- one ultra-tall JPG through Google Drive

Those often open as a tiny vertical strip on mobile.

## Verification

After exporting, inspect the first generated JPG or render/open the first PDF page. The hero should fill the screen width like a phone screenshot. If it does not:

- confirm the source image is not already surrounded by black viewer margins;
- recapture from the HTML/source, not from a phone gallery screenshot;
- rerun with the intended `--viewport-width` and `--page-height`;
- if using a directory of slices, confirm the filenames sort in the intended vertical order.

If direct HTML capture fails with a browser permission error, do not fight the PDF step. Produce or locate a full-page mobile screenshot first, then use that screenshot as `--input`; this is also the cleanest path for Google Drive preview quality.
