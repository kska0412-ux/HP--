#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const Module = require("module");

const bundledNodeModules = path.join(
  os.homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"
);
if (fs.existsSync(bundledNodeModules)) {
  process.env.NODE_PATH = [bundledNodeModules, process.env.NODE_PATH]
    .filter(Boolean)
    .join(path.delimiter);
  Module._initPaths();
}

const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function usage() {
  console.log(`Usage:
  export_mobile_lp_pdf.cjs --input <html|url|image|directory> --output <pdf>

Options:
  --slice-dir <dir>          Also write phone-page JPG slices
  --viewport-width <px>      Output/page width, default 430
  --page-height <px>         Output/page height, default 932
  --background <hex>         Padding background, default #ffffff
  --quality <1-100>          JPG quality, default 88
  --scale <number>           HTML screenshot deviceScaleFactor, default 2
  --tmp-dir <dir>            Temporary capture directory
`);
}

function parseArgs(argv) {
  const args = {
    viewportWidth: 430,
    pageHeight: 932,
    background: "#ffffff",
    quality: 88,
    scale: 2,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--")) {
      throw new Error(`Unexpected argument: ${key}`);
    }
    if (key === "--help" || key === "-h") {
      args.help = true;
      return args;
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    i += 1;

    switch (key) {
      case "--input":
        args.input = value;
        break;
      case "--output":
        args.output = value;
        break;
      case "--slice-dir":
        args.sliceDir = value;
        break;
      case "--viewport-width":
        args.viewportWidth = Number(value);
        break;
      case "--page-height":
        args.pageHeight = Number(value);
        break;
      case "--background":
        args.background = value;
        break;
      case "--quality":
        args.quality = Number(value);
        break;
      case "--scale":
        args.scale = Number(value);
        break;
      case "--tmp-dir":
        args.tmpDir = value;
        break;
      default:
        throw new Error(`Unknown option: ${key}`);
    }
  }

  return args;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function ensurePositiveNumber(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function isUrl(input) {
  return /^https?:\/\//i.test(input);
}

function isHtml(input) {
  if (isUrl(input)) return true;
  return [".html", ".htm"].includes(path.extname(input).toLowerCase());
}

function isImage(input) {
  return IMAGE_EXTS.has(path.extname(input).toLowerCase());
}

async function captureHtml(input, options) {
  const tmpBase =
    options.tmpDir ||
    path.join(path.dirname(path.resolve(options.output)), ".mobile-lp-pdf-tmp");
  fs.mkdirSync(tmpBase, { recursive: true });
  const tmpRoot = fs.mkdtempSync(path.join(tmpBase, "capture-"));
  const previousTmpDir = process.env.TMPDIR;
  process.env.TMPDIR = tmpRoot;

  let chromium;
  try {
    chromium = require("playwright").chromium;
  } catch (error) {
    if (previousTmpDir === undefined) {
      delete process.env.TMPDIR;
    } else {
      process.env.TMPDIR = previousTmpDir;
    }
    throw new Error(
      "HTML capture requires the playwright package. Use a long screenshot image instead, or run with bundled NODE_PATH."
    );
  }

  const screenshotPath = path.join(tmpRoot, "full-page.png");
  const url = isUrl(input) ? input : pathToFileURL(path.resolve(input)).href;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: {
        width: options.viewportWidth,
        height: options.pageHeight,
      },
      deviceScaleFactor: options.scale,
      isMobile: true,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: "png",
      animations: "disabled",
    });
  } catch (error) {
    const firstLine = String(error.message || error).split("\n")[0];
    throw new Error(
      `HTML capture could not launch or control a browser: ${firstLine}. ` +
        "Use a full-page mobile screenshot/long PNG as --input, or rerun in an environment where browser automation is allowed."
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    if (previousTmpDir === undefined) {
      delete process.env.TMPDIR;
    } else {
      process.env.TMPDIR = previousTmpDir;
    }
  }

  return screenshotPath;
}

async function normalizeImage(imagePath, width) {
  const meta = await sharp(imagePath).metadata();
  const densityScale = meta.density && meta.density > 96 ? meta.density / 96 : 1;
  const actualWidth = Math.round((meta.width || width) / densityScale);
  const needsResize = actualWidth !== width || densityScale !== 1;

  const pipeline = sharp(imagePath, { limitInputPixels: false }).rotate();
  if (needsResize) {
    pipeline.resize({ width, withoutEnlargement: false });
  }
  return pipeline.png().toBuffer();
}

async function stitchDirectory(dirPath, width, background) {
  const files = fs
    .readdirSync(dirPath)
    .filter((file) => IMAGE_EXTS.has(path.extname(file).toLowerCase()))
    .sort(naturalCompare)
    .map((file) => path.join(dirPath, file));

  if (!files.length) {
    throw new Error(`No PNG/JPG/WebP images found in directory: ${dirPath}`);
  }

  const normalized = [];
  let totalHeight = 0;
  for (const file of files) {
    const buffer = await normalizeImage(file, width);
    const meta = await sharp(buffer).metadata();
    normalized.push({ input: buffer, top: totalHeight, left: 0 });
    totalHeight += meta.height;
  }

  return sharp({
    create: {
      width,
      height: totalHeight,
      channels: 4,
      background,
    },
  })
    .composite(normalized)
    .png()
    .toBuffer();
}

async function loadLongImage(input, options) {
  if (isUrl(input) || isHtml(input)) {
    const screenshotPath = await captureHtml(input, options);
    return normalizeImage(screenshotPath, options.viewportWidth);
  }

  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input not found: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    return stitchDirectory(resolved, options.viewportWidth, options.background);
  }

  if (!isImage(resolved)) {
    throw new Error(
      "Input must be an HTML file, URL, image file, or directory of images"
    );
  }

  return normalizeImage(resolved, options.viewportWidth);
}

async function buildPages(longBuffer, options) {
  const meta = await sharp(longBuffer).metadata();
  const width = options.viewportWidth;
  const sourceHeight = meta.height;
  const pageCount = Math.ceil(sourceHeight / options.pageHeight);
  const pages = [];

  for (let index = 0; index < pageCount; index += 1) {
    const top = index * options.pageHeight;
    const cropHeight = Math.min(options.pageHeight, sourceHeight - top);
    const crop = await sharp(longBuffer, { limitInputPixels: false })
      .extract({ left: 0, top, width, height: cropHeight })
      .png()
      .toBuffer();

    const page = await sharp({
      create: {
        width,
        height: options.pageHeight,
        channels: 3,
        background: options.background,
      },
    })
      .composite([{ input: crop, left: 0, top: 0 }])
      .jpeg({ quality: options.quality, mozjpeg: true })
      .toBuffer();

    pages.push(page);
  }

  return pages;
}

async function writePdf(pages, outputPath, options) {
  const pdf = await PDFDocument.create();

  for (const pageBuffer of pages) {
    const image = await pdf.embedJpg(pageBuffer);
    const page = pdf.addPage([options.viewportWidth, options.pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: options.viewportWidth,
      height: options.pageHeight,
    });
  }

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, await pdf.save());
}

function writeSlices(pages, sliceDir) {
  if (!sliceDir) return;
  fs.mkdirSync(sliceDir, { recursive: true });
  pages.forEach((page, index) => {
    const filename = `${String(index + 1).padStart(2, "0")}.jpg`;
    fs.writeFileSync(path.join(sliceDir, filename), page);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  if (!args.input || !args.output) {
    usage();
    throw new Error("--input and --output are required");
  }

  ensurePositiveNumber("--viewport-width", args.viewportWidth);
  ensurePositiveNumber("--page-height", args.pageHeight);
  ensurePositiveNumber("--quality", args.quality);
  ensurePositiveNumber("--scale", args.scale);

  const longBuffer = await loadLongImage(args.input, args);
  const longMeta = await sharp(longBuffer).metadata();
  const pages = await buildPages(longBuffer, args);
  await writePdf(pages, args.output, args);
  writeSlices(pages, args.sliceDir);

  console.log(
    JSON.stringify(
      {
        input: args.input,
        output: path.resolve(args.output),
        sliceDir: args.sliceDir ? path.resolve(args.sliceDir) : null,
        source: {
          width: longMeta.width,
          height: longMeta.height,
        },
        page: {
          width: args.viewportWidth,
          height: args.pageHeight,
          count: pages.length,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[export-mobile-lp-pdf] ${error.message}`);
  process.exit(1);
});
