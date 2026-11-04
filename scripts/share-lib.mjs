import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  findMarkdownFiles,
  parseFrontmatter,
  projectRoot,
} from "./content-lib.mjs";

export const shareDir = path.join(projectRoot, "src", "content", "shares");
const publicDir = path.join(projectRoot, "public");

function compareShares(left, right) {
  if (left.order !== right.order) return left.order - right.order;
  return right.date.localeCompare(left.date);
}

export function isLookbookShare(share) {
  return Boolean(share.cover) && share.lookbook !== false;
}

export async function loadShares() {
  const files = (await findMarkdownFiles(shareDir)).sort();
  const shares = await Promise.all(
    files.map(async (filePath) => {
      const source = await readFile(filePath, "utf8");
      const relativePath = path.relative(shareDir, filePath).replaceAll("\\", "/");
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
        description: frontmatter.description || "",
        category: frontmatter.category || "未分类",
        rawCategory: frontmatter.category,
        date: String(frontmatter.date ?? ""),
        source: frontmatter.source || "个人分享",
        order: Number(frontmatter.order ?? 0),
        draft: frontmatter.draft === true,
        lookbook: frontmatter.lookbook,
        lookbookOrder:
          frontmatter.lookbookOrder === undefined
            ? null
            : Number(frontmatter.lookbookOrder),
        rawParentId: frontmatter.parent || null,
        parentId: null,
        parentMissing: false,
        parentCycle: false,
        children: [],
      };
    }),
  );

  const byId = new Map(shares.map((share) => [share.id, share]));
  const bySlug = new Map();

  for (const share of shares) {
    const matches = bySlug.get(share.slug) ?? [];
    matches.push(share);
    bySlug.set(share.slug, matches);
  }

  for (const share of shares) {
    if (!share.rawParentId) continue;

    const exactMatch = byId.get(share.rawParentId);
    const slugMatches = bySlug.get(share.rawParentId) ?? [];
    const parent =
      exactMatch ??
      (slugMatches.length === 1 ? slugMatches[0] : null);

    if (!parent) {
      share.parentMissing = true;
      continue;
    }

    share.parentId = parent.id;
  }

  for (const share of shares) {
    const seen = new Set([share.id]);
    let current = share;

    while (current.parentId) {
      if (seen.has(current.parentId)) {
        share.parentId = null;
        share.parentCycle = true;
        break;
      }

      seen.add(current.parentId);
      current = byId.get(current.parentId);
      if (!current) break;
    }
  }

  for (const share of shares) {
    if (!share.parentId) continue;
    const parent = byId.get(share.parentId);
    if (!parent || parent.id === share.id) continue;

    parent.children.push(share);
  }

  shares.sort(compareShares);
  shares.forEach((share) => share.children.sort(compareShares));

  const getHierarchyPath = (share, trail = new Set()) => {
    if (!share.parentId || trail.has(share.parentId)) return share.title;
    const parent = byId.get(share.parentId);
    if (!parent) return share.title;

    const nextTrail = new Set(trail);
    nextTrail.add(share.id);
    return `${getHierarchyPath(parent, nextTrail)} / ${share.title}`;
  };

  shares.forEach((share) => {
    share.hierarchyPath = getHierarchyPath(share);
  });

  const lookbookShares = shares
    .filter((share) => !share.parentId && isLookbookShare(share))
    .sort((left, right) => {
      const orderDifference =
        (left.lookbookOrder ?? left.order) -
        (right.lookbookOrder ?? right.order);
      if (orderDifference !== 0) return orderDifference;
      return right.date.localeCompare(left.date);
    });
  const lookbookRanks = new Map(
    lookbookShares.map((share, index) => [share.id, index + 1]),
  );
  shares.forEach((share) => {
    share.lookbookRank = lookbookRanks.get(share.id) ?? null;
  });

  return shares;
}

export async function validateShareAssets(shares) {
  const warnings = [];

  for (const share of shares) {
    if (!share.cover) continue;

    if (share.cover.startsWith("/")) {
      const publicPath = path.join(publicDir, share.cover.slice(1));
      try {
        await access(publicPath);
      } catch {
        warnings.push(
          `- \`${share.relativePath}\`：找不到封面 \`${share.cover}\``,
        );
      }
    }

    if (!share.coverAlt) {
      warnings.push(`- \`${share.relativePath}\`：有封面但缺少 coverAlt`);
    }
  }

  return warnings;
}

export function validateShares(shares) {
  const errors = [];
  const warnings = [];
  const siblingOrders = new Map();
  const slugs = new Map();

  for (const share of shares) {
    if (typeof share.rawTitle !== "string" || !share.rawTitle.trim()) {
      errors.push(`- \`${share.relativePath}\`：缺少 title`);
    }

    if (!share.description.trim()) {
      warnings.push(`- \`${share.relativePath}\`：缺少 description`);
    }

    if (!share.rawCategory) {
      warnings.push(`- \`${share.relativePath}\`：缺少 category`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(share.date)) {
      errors.push(`- \`${share.relativePath}\`：date 必须是 YYYY-MM-DD`);
    }

    if (!Number.isInteger(share.order) || share.order < 1) {
      warnings.push(`- \`${share.relativePath}\`：order 应为大于 0 的整数`);
    }

    if (share.parentMissing) {
      errors.push(
        `- \`${share.relativePath}\`：找不到 parent \`${share.rawParentId}\``,
      );
    }

    if (share.parentCycle) {
      errors.push(`- \`${share.relativePath}\`：parent 存在循环引用`);
    }

    if (share.external === true && !share.href) {
      warnings.push(`- \`${share.relativePath}\`：外部链接缺少 href`);
    }

    if (share.lookbook === true && !share.cover) {
      warnings.push(
        `- \`${share.relativePath}\`：设置 lookbook: true 但没有 cover`,
      );
    }

    if (share.parentId && share.lookbook === true) {
      warnings.push(
        `- \`${share.relativePath}\`：子分享不会进入顶部 Lookbook`,
      );
    }

    const siblingKey = `${share.parentId ?? ""}\0${share.order}`;
    const siblingMatches = siblingOrders.get(siblingKey) ?? [];
    siblingMatches.push(share);
    siblingOrders.set(siblingKey, siblingMatches);

    const slugMatches = slugs.get(share.slug) ?? [];
    slugMatches.push(share);
    slugs.set(share.slug, slugMatches);
  }

  for (const matches of siblingOrders.values()) {
    if (matches.length > 1) {
      const paths = matches
        .map((share) => `\`${share.relativePath}\``)
        .join("、");
      warnings.push(`- 同级分享存在重复 order：${paths}`);
    }
  }

  for (const [slug, matches] of slugs.entries()) {
    if (matches.length > 1) {
      warnings.push(`- 文件名 \`${slug}.md\` 重复`);
    }
  }

  return { errors, warnings };
}

function createMarkdownNode(share, depth) {
  const indent = "  ".repeat(depth);
  const order = String(share.order ?? 0).padStart(2, "0");
  const draftLabel = share.draft ? " `草稿`" : "";
  const lookbookLabel = share.lookbookRank
    ? ` · Lookbook ${String(share.lookbookRank).padStart(2, "0")}`
    : "";
  const target = `./src/content/shares/${share.relativePath}`;
  const line = `${indent}- \`${order}\` [${share.title}](<${target}>) · \`id: ${share.id}\` · \`category: ${share.category}\`${lookbookLabel}${draftLabel}`;
  const children = share.children
    .slice()
    .sort(compareShares)
    .flatMap((child) => createMarkdownNode(child, depth + 1));
  return [line, ...children];
}

function createTerminalNode(share, prefix, isLast) {
  const connector = isLast ? "└─" : "├─";
  const order = String(share.order ?? 0).padStart(2, "0");
  const draftLabel = share.draft ? " [草稿]" : "";
  const lookbookLabel = share.lookbookRank ? " [Lookbook]" : "";
  const children = share.children.slice().sort(compareShares);
  const lines = [
    `${prefix}${connector} ${order} ${share.title} [id: ${share.id}] [${share.category}]${lookbookLabel}${draftLabel}`,
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

export function createShareMap(shares) {
  const roots = shares.filter((share) => !share.parentId).sort(compareShares);
  const lines = [
    "## 分享",
    "",
    `> ${roots.length} 个顶层目录，共 ${shares.length} 条分享。`,
    "",
  ];

  roots.forEach((root) => {
    lines.push(...createMarkdownNode(root, 0));
  });

  const validation = validateShares(shares);
  const warnings = [...validation.errors, ...validation.warnings];

  return {
    markdown: `${lines.join("\n").trimEnd()}\n`,
    terminal: ["分享", ...roots.flatMap((root, index) =>
      createTerminalNode(root, "", index === roots.length - 1),
    )].join("\n"),
    warnings,
  };
}
