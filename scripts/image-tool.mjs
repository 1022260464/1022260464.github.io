import {
  access,
  copyFile,
  mkdir,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const publicDir = path.join(projectRoot, "public");
const defaultOutputDir = path.join(publicDir, "images");

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".tif",
  ".tiff",
  ".svg",
]);

const formatExtensions = {
  webp: ".webp",
  avif: ".avif",
  jpeg: ".jpg",
  png: ".png",
};

function printHelp() {
  console.log(`图片处理工具

单个文件：
  pnpm image:single -- "D:\\Pictures\\cover.png"
  pnpm image:single -- "cover.png" --name article-cover --width 1400

批量目录：
  pnpm image:batch -- "D:\\Pictures\\article"
  pnpm image:batch -- "article" --output public/images/article --quality 80

通用参数：
  --output <dir>       输出目录
  --format <type>      webp、avif、jpeg、png，默认 webp
  --width <px>         最大宽度，默认 1600
  --height <px>        最大高度，可选
  --quality <1-100>    有损格式质量，默认 82
  --fit <mode>         inside、cover、contain，默认 inside
  --name <filename>    单张输出文件名，不包含扩展名
  --alt <text>         单张 Markdown 的替代文本
  --no-recursive       批量模式不扫描子目录
  --force              覆盖已有输出
  --dry-run            只显示计划，不写入文件

默认输出到 public/images。SVG 未指定 --format 时会保留原格式。
`);
}

function normalizeFormat(value) {
  const format = value.toLowerCase();
  if (format === "jpg") return "jpeg";
  if (!formatExtensions[format]) {
    throw new Error(`不支持的输出格式：${value}`);
  }
  return format;
}

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (!["single", "batch"].includes(command)) {
    throw new Error(`未知命令：${command}`);
  }

  const options = {
    format: "webp",
    formatProvided: false,
    width: 1600,
    height: null,
    quality: 82,
    fit: "inside",
    recursive: true,
    force: false,
    dryRun: false,
    name: null,
    alt: null,
    output: null,
    input: null,
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "--help" || token === "-h") {
      return { command: "help" };
    }

    if (token === "--no-recursive") {
      options.recursive = false;
      continue;
    }

    if (token === "--force") {
      options.force = true;
      continue;
    }

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = tokens[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`参数 ${token} 缺少值`);
      }
      index += 1;

      if (key === "output") options.output = value;
      else if (key === "format") {
        options.format = normalizeFormat(value);
        options.formatProvided = true;
      } else if (key === "width") options.width = Number(value);
      else if (key === "height") options.height = Number(value);
      else if (key === "quality") options.quality = Number(value);
      else if (key === "fit") options.fit = value;
      else if (key === "name") options.name = value;
      else if (key === "alt") options.alt = value;
      else throw new Error(`未知参数：${token}`);
      continue;
    }

    if (options.input) {
      throw new Error(`无法识别多余参数：${token}`);
    }

    options.input = token;
  }

  if (!options.input) {
    throw new Error("请提供输入文件或目录");
  }

  if (
    !Number.isInteger(options.width) ||
    options.width <= 0 ||
    (options.height !== null &&
      (!Number.isInteger(options.height) || options.height <= 0))
  ) {
    throw new Error("width 和 height 必须是正整数");
  }

  if (
    !Number.isInteger(options.quality) ||
    options.quality < 1 ||
    options.quality > 100
  ) {
    throw new Error("quality 必须在 1 到 100 之间");
  }

  if (!["inside", "cover", "contain"].includes(options.fit)) {
    throw new Error("fit 只能是 inside、cover 或 contain");
  }

  return { command, options };
}

function resolvePath(value) {
  return path.resolve(process.cwd(), value);
}

function sanitizeName(value) {
  const normalized = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized || "image";
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function getWebPath(outputPath) {
  if (!isInside(publicDir, outputPath)) {
    return outputPath.replaceAll("\\", "/");
  }

  return `/${path.relative(publicDir, outputPath).replaceAll("\\", "/")}`;
}

function createMarkdownSnippet(webPath, alt) {
  return `![${alt}](<${webPath}>)`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createLazyImageSnippet(result, alt) {
  const safeAlt = escapeHtml(alt);
  const dimensions =
    result.width && result.height
      ? ` width="${result.width}" height="${result.height}"`
      : "";

  return `<figure>
  <img src="${escapeHtml(result.webPath)}" alt="${safeAlt}"${dimensions} loading="lazy" decoding="async" />
  <figcaption>${safeAlt}</figcaption>
</figure>`;
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectImages(directory, recursive) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory() && recursive) {
      files.push(...(await collectImages(fullPath, true)));
    } else if (
      entry.isFile() &&
      imageExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function processImage({
  sourcePath,
  outputPath,
  options,
  preserveSvg,
}) {
  if (sourcePath === outputPath) {
    throw new Error(`拒绝覆盖输入文件本身：${sourcePath}`);
  }

  if ((await pathExists(outputPath)) && !options.force) {
    return {
      status: "skipped",
      sourcePath,
      outputPath,
      reason: "输出已存在，使用 --force 覆盖",
    };
  }

  if (options.dryRun) {
    return {
      status: "planned",
      sourcePath,
      outputPath,
    };
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  if (preserveSvg) {
    await copyFile(sourcePath, outputPath);
  } else {
    const metadata = await sharp(sourcePath, {
      animated: true,
      limitInputPixels: false,
    }).metadata();
    const animated = (metadata.pages ?? 1) > 1;
    let pipeline = sharp(sourcePath, {
      animated,
      limitInputPixels: false,
    }).rotate();

    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width || undefined,
        height: options.height || undefined,
        fit: options.fit,
        withoutEnlargement: true,
        background: "#ffffff",
      });
    }

    if (options.format === "jpeg") {
      pipeline = pipeline
        .flatten({ background: "#ffffff" })
        .jpeg({
          quality: options.quality,
          mozjpeg: true,
          progressive: true,
        });
    } else if (options.format === "webp") {
      pipeline = pipeline.webp({
        quality: options.quality,
        effort: 5,
        smartSubsample: true,
      });
    } else if (options.format === "avif") {
      pipeline = pipeline.avif({
        quality: options.quality,
        effort: 4,
      });
    } else {
      pipeline = pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      });
    }

    await pipeline.toFile(outputPath);
  }

  const [sourceStats, outputStats, outputMetadata] = await Promise.all([
    stat(sourcePath),
    stat(outputPath),
    sharp(outputPath).metadata(),
  ]);

  return {
    status: "processed",
    sourcePath,
    outputPath,
    webPath: getWebPath(outputPath),
    sourceBytes: sourceStats.size,
    outputBytes: outputStats.size,
    width: outputMetadata.width,
    height: outputMetadata.height,
    format: outputMetadata.format,
  };
}

function printResult(result, options) {
  if (result.status === "skipped") {
    console.log(`跳过：${result.sourcePath}`);
    console.log(`      ${result.reason}`);
    return;
  }

  if (result.status === "planned") {
    console.log(`计划：${result.sourcePath} -> ${result.outputPath}`);
    return;
  }

  const reduction = 100 - (result.outputBytes / result.sourceBytes) * 100;
  console.log(`完成：${result.outputPath}`);
  console.log(
    `      ${result.width} × ${result.height}，${(result.outputBytes / 1024).toFixed(1)} KB，体积减少 ${reduction.toFixed(1)}%`,
  );

  if (options.alt) {
    console.log("");
    console.log("Markdown：");
    console.log(createMarkdownSnippet(result.webPath, options.alt));
    console.log("");
    console.log("懒加载 HTML：");
    console.log(createLazyImageSnippet(result, options.alt));
  }
}

async function runSingle(options) {
  const inputPath = resolvePath(options.input);
  const inputStats = await stat(inputPath);
  if (!inputStats.isFile()) {
    throw new Error("single 模式的输入必须是文件");
  }

  const extension = path.extname(inputPath).toLowerCase();
  if (!imageExtensions.has(extension)) {
    throw new Error(`不支持的图片格式：${extension}`);
  }

  const outputDirectory = options.output
    ? resolvePath(options.output)
    : defaultOutputDir;
  const baseName = options.name
    ? sanitizeName(path.basename(options.name, path.extname(options.name)))
    : sanitizeName(path.basename(inputPath, extension));
  const preserveSvg = extension === ".svg" && !options.formatProvided;
  const outputExtension = preserveSvg
    ? ".svg"
    : formatExtensions[options.format];
  const outputPath = path.join(outputDirectory, `${baseName}${outputExtension}`);

  const result = await processImage({
    sourcePath: inputPath,
    outputPath,
    options,
    preserveSvg,
  });

  printResult(result, options);

  if (result.status === "processed" && !options.alt) {
    console.log("");
    console.log("Markdown：");
    console.log(
      createMarkdownSnippet(
        result.webPath,
        path.basename(inputPath, extension),
      ),
    );
    console.log("");
    console.log("懒加载 HTML：");
    console.log(
      createLazyImageSnippet(
        result,
        path.basename(inputPath, extension),
      ),
    );
  }
}

async function runBatch(options) {
  const inputDirectory = resolvePath(options.input);
  const inputStats = await stat(inputDirectory);
  if (!inputStats.isDirectory()) {
    throw new Error("batch 模式的输入必须是目录");
  }

  const outputDirectory = options.output
    ? resolvePath(options.output)
    : path.join(defaultOutputDir, sanitizeName(path.basename(inputDirectory)));
  const files = (await collectImages(inputDirectory, options.recursive)).filter(
    (filePath) => !isInside(outputDirectory, filePath),
  );

  if (files.length === 0) {
    throw new Error("目录中没有找到支持的图片");
  }

  console.log(`批量处理：${files.length} 个文件`);

  const results = [];

  for (const [index, sourcePath] of files.entries()) {
    const extension = path.extname(sourcePath).toLowerCase();
    const relativePath = path.relative(inputDirectory, sourcePath);
    const relativeDirectory = path.dirname(relativePath);
    const baseName = sanitizeName(path.basename(sourcePath, extension));
    const preserveSvg = extension === ".svg" && !options.formatProvided;
    const outputExtension = preserveSvg
      ? ".svg"
      : formatExtensions[options.format];
    const outputPath = path.join(
      outputDirectory,
      relativeDirectory === "." ? "" : relativeDirectory,
      `${baseName}${outputExtension}`,
    );

    console.log(`[${index + 1}/${files.length}] ${relativePath}`);

    const result = await processImage({
      sourcePath,
      outputPath,
      options,
      preserveSvg,
    });
    printResult(result, options);
    results.push({ relativePath, ...result });
  }

  if (!options.dryRun) {
    const processed = results.filter((result) => result.status === "processed");
    const manifestPath = path.join(outputDirectory, "image-manifest.json");
    const snippetsPath = path.join(outputDirectory, "image-snippets.md");
    const snippets = [
      "# 图片 Markdown 片段",
      "",
      ...processed.flatMap((result) => [
        `## ${result.relativePath}`,
        "",
        "```html",
        createLazyImageSnippet(
          result,
          path.basename(result.sourcePath, path.extname(result.sourcePath)),
        ),
        "```",
        "",
      ]),
    ].join("\n");

    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          sourceDirectory: inputDirectory,
          outputDirectory,
          format: options.format,
          width: options.width,
          height: options.height,
          quality: options.quality,
          fit: options.fit,
          images: processed,
          skipped: results.filter((result) => result.status === "skipped"),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(snippetsPath, `${snippets.trimEnd()}\n`, "utf8");

    console.log("");
    console.log(`输出目录：${outputDirectory}`);
    console.log(`Markdown 片段：${snippetsPath}`);
    console.log(`处理清单：${manifestPath}`);
  }
}

try {
  const parsed = parseArguments(process.argv.slice(2));

  if (parsed.command === "help") {
    printHelp();
  } else if (parsed.command === "single") {
    await runSingle(parsed.options);
  } else {
    await runBatch(parsed.options);
  }
} catch (error) {
  console.error(`错误：${error.message}`);
  console.error("运行 pnpm image:single -- --help 查看用法。");
  process.exitCode = 1;
}
