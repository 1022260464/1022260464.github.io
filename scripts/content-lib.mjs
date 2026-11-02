import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(scriptsDir, "..");
export const blogDir = path.join(projectRoot, "src", "content", "blog");
export const contentMapPath = path.join(projectRoot, "CONTENT_MAP.md");

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (!value) return "";

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  if (/^-?\d+$/.test(value)) return Number(value);

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];

    return inner
      .split(",")
      .map((item) => parseScalar(item))
      .filter((item) => item !== "");
  }

  return value;
}

function parseFrontmatter(source, relativePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new Error(`Article is missing frontmatter: ${relativePath}`);
  }

  const data = {};

  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!field) continue;

    const [, key, rawValue = ""] = field;
    data[key] = parseScalar(rawValue);
  }

  return data;
}

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function compareArticles(left, right) {
  const orderDifference = (left.order ?? 0) - (right.order ?? 0);
  if (orderDifference !== 0) return orderDifference;

  const leftDate = Date.parse(String(left.pubDate ?? ""));
  const rightDate = Date.parse(String(right.pubDate ?? ""));
  const safeLeftDate = Number.isNaN(leftDate) ? 0 : leftDate;
  const safeRightDate = Number.isNaN(rightDate) ? 0 : rightDate;

  if (safeLeftDate !== safeRightDate) {
    return safeRightDate - safeLeftDate;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

export async function loadArticles() {
  const files = (await findMarkdownFiles(blogDir)).sort();
  const articles = await Promise.all(
    files.map(async (filePath) => {
      const source = await readFile(filePath, "utf8");
      const relativePath = path.relative(blogDir, filePath).replaceAll("\\", "/");
      const id = relativePath.replace(/\.md$/i, "");
      const frontmatter = parseFrontmatter(source, relativePath);

      return {
        ...frontmatter,
        id,
        slug: path.basename(id),
        relativePath,
        filePath,
        rawTitle: frontmatter.title,
        title: frontmatter.title || id,
        category: frontmatter.category || "未分类",
        rawCategory: frontmatter.category,
        order: Number(frontmatter.order ?? 0),
        draft: frontmatter.draft === true,
        rawParentId: frontmatter.parent || null,
        parentId: null,
        parentMissing: false,
        parentCycle: false,
        parentCategoryMismatch: false,
        children: [],
      };
    }),
  );

  const byId = new Map(articles.map((article) => [article.id, article]));
  const bySlug = new Map();

  for (const article of articles) {
    const matches = bySlug.get(article.slug) ?? [];
    matches.push(article);
    bySlug.set(article.slug, matches);
  }

  for (const article of articles) {
    if (!article.rawParentId) continue;

    const exactMatch = byId.get(article.rawParentId);
    const slugMatches = bySlug.get(article.rawParentId) ?? [];
    const parent =
      exactMatch ??
      (slugMatches.length === 1 ? slugMatches[0] : null);

    if (!parent) {
      article.parentMissing = true;
      continue;
    }

    article.parentId = parent.id;
  }

  for (const article of articles) {
    const seen = new Set([article.id]);
    let current = article;

    while (current.parentId) {
      if (seen.has(current.parentId)) {
        article.parentId = null;
        article.parentCycle = true;
        break;
      }

      seen.add(current.parentId);
      current = byId.get(current.parentId);
      if (!current) break;
    }
  }

  for (const article of articles) {
    if (!article.parentId) continue;

    const parent = byId.get(article.parentId);
    if (!parent) continue;

    if (parent.category !== article.category) {
      article.parentCategoryMismatch = true;
      continue;
    }

    parent.children.push(article);
  }

  articles.sort(compareArticles);
  articles.forEach((article) => article.children.sort(compareArticles));

  const getHierarchyPath = (article, trail = new Set()) => {
    if (!article.parentId || trail.has(article.parentId)) {
      return article.title;
    }

    const parent = byId.get(article.parentId);
    if (!parent) return article.title;

    const nextTrail = new Set(trail);
    nextTrail.add(article.id);
    return `${getHierarchyPath(parent, nextTrail)} / ${article.title}`;
  };

  for (const article of articles) {
    article.hierarchyPath = getHierarchyPath(article);
  }

  return articles;
}

export function validateArticles(articles) {
  const errors = [];
  const warnings = [];
  const siblingOrders = new Map();
  const slugs = new Map();

  for (const article of articles) {
    if (typeof article.rawTitle !== "string" || !article.rawTitle.trim()) {
      errors.push(`- \`${article.relativePath}\`：缺少 title`);
    }

    if (
      !article.pubDate ||
      Number.isNaN(Date.parse(String(article.pubDate)))
    ) {
      errors.push(`- \`${article.relativePath}\`：pubDate 缺失或格式无效`);
    }

    if (!Number.isInteger(article.order) || article.order < 1) {
      warnings.push(
        `- \`${article.relativePath}\`：order 应为大于 0 的整数`,
      );
    }

    if (article.parentMissing) {
      errors.push(
        `- \`${article.relativePath}\`：找不到 parent \`${article.rawParentId}\``,
      );
    }

    if (article.parentCycle) {
      errors.push(`- \`${article.relativePath}\`：parent 存在循环引用`);
    }

    if (article.parentCategoryMismatch) {
      errors.push(
        `- \`${article.relativePath}\`：文章与父文章的 category 不一致`,
      );
    }

    if (!article.rawCategory) {
      warnings.push(
        `- \`${article.relativePath}\`：缺少 category，按“未分类”处理`,
      );
    }

    const siblingKey = `${article.category}\0${article.parentId ?? ""}\0${article.order}`;
    const siblingMatches = siblingOrders.get(siblingKey) ?? [];
    siblingMatches.push(article);
    siblingOrders.set(siblingKey, siblingMatches);

    const slugMatches = slugs.get(article.slug) ?? [];
    slugMatches.push(article);
    slugs.set(article.slug, slugMatches);
  }

  for (const matches of siblingOrders.values()) {
    if (matches.length > 1) {
      const paths = matches
        .map((article) => `\`${article.relativePath}\``)
        .join("、");
      warnings.push(`- 同级文章存在重复 order：${paths}`);
    }
  }

  for (const [slug, matches] of slugs.entries()) {
    if (matches.length > 1) {
      warnings.push(
        `- 文件名 \`${slug}.md\` 重复，按内容搜索时可能产生歧义`,
      );
    }
  }

  return { errors, warnings };
}

function getCategoryGroups(articles) {
  const categories = new Map();

  for (const article of articles) {
    const category = article.category || "未分类";
    const group = categories.get(category) ?? [];
    group.push(article);
    categories.set(category, group);
  }

  return [...categories.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
    .map(([name, items]) => {
      const itemIds = new Set(items.map((item) => item.id));
      const roots = items
        .filter(
          (item) =>
            !item.parentId ||
            !itemIds.has(item.parentId) ||
            item.parentCategoryMismatch,
        )
        .sort(compareArticles);

      return { name, items, roots };
    });
}

function escapeMarkdownText(value) {
  return String(value).replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function createMarkdownNode(article, depth) {
  const indent = "  ".repeat(depth);
  const order = String(article.order ?? 0).padStart(2, "0");
  const draftLabel = article.draft ? " `草稿`" : "";
  const target = `./src/content/blog/${article.relativePath}`;
  const line = `${indent}- \`${order}\` [${escapeMarkdownText(article.title)}](<${target}>) · \`id: ${article.id}\`${draftLabel}`;
  const children = article.children
    .slice()
    .sort(compareArticles)
    .flatMap((child) => createMarkdownNode(child, depth + 1));

  return [line, ...children];
}

function createTerminalNode(article, prefix, isLast) {
  const connector = isLast ? "└─" : "├─";
  const order = String(article.order ?? 0).padStart(2, "0");
  const draftLabel = article.draft ? " [草稿]" : "";
  const children = article.children.slice().sort(compareArticles);
  const lines = [
    `${prefix}${connector} ${order} ${article.title} [id: ${article.id}]${draftLabel}`,
  ];
  const childPrefix = `${prefix}${isLast ? "   " : "│  "}`;

  children.forEach((child, index) => {
    lines.push(
      ...createTerminalNode(
        child,
        childPrefix,
        index === children.length - 1,
      ),
    );
  });

  return lines;
}

export function createContentMap(articles) {
  const groups = getCategoryGroups(articles);
  const lines = [
    "# 内容地图",
    "",
    "> 此文件由 `pnpm content:map` 自动生成，请勿手动编辑。",
    `> 共 ${articles.length} 篇文章，${groups.length} 个模块。`,
    "",
  ];

  for (const group of groups) {
    lines.push(`## ${group.name}`, "");

    for (const root of group.roots) {
      lines.push(...createMarkdownNode(root, 0));
    }

    if (group.roots.length === 0) {
      lines.push("- 暂无顶级文章");
    }

    lines.push("");
  }

  const validation = validateArticles(articles);
  const warnings = [...validation.errors, ...validation.warnings];

  if (warnings.length > 0) {
    lines.push("## 需要检查", "", ...warnings, "");
  }

  return {
    markdown: `${lines.join("\n").trimEnd()}\n`,
    terminal: groups.map((group) => {
      const tree = group.roots.flatMap((root, index) =>
        createTerminalNode(root, "", index === group.roots.length - 1),
      );

      return [`${group.name}`, ...tree].join("\n");
    }).join("\n\n"),
    warnings,
  };
}

export async function writeContentMap(articles) {
  const contentMap = createContentMap(articles);
  await writeFile(contentMapPath, contentMap.markdown, "utf8");
  return contentMap;
}
