import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  loadArticles,
  writeContentMap,
} from "./content-lib.mjs";
import {
  buildHierarchyOptions,
  findHierarchyOption,
  printHierarchyOptions,
} from "./interactive-lib.mjs";
import {
  createShareMap,
  isLookbookShare,
  loadShares,
  shareDir,
} from "./share-lib.mjs";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const askRequired = async (message) => {
  while (true) {
    const answer = (await rl.question(message)).trim();
    if (answer) return answer;
    console.log("这一项不能为空。");
  }
};

const createSlug = (title) =>
  title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const quoteYaml = (value) => JSON.stringify(value);

const askSlug = async (title) => {
  const suggested = createSlug(title);

  while (true) {
    const suffix = suggested ? ` [${suggested}]` : "";
    const answer = (
      await rl.question(`文件名/分享 ID（小写英文、数字、连字符）${suffix}：`)
    ).trim();
    const slug = answer || suggested;

    if (!slug) {
      console.log("中文标题需要手动填写一个英文 ID。");
      continue;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      console.log("分享 ID 只能使用小写英文、数字和单个连字符。");
      continue;
    }

    return slug;
  }
};

const sharePath = (slug) => path.join(shareDir, `${slug}.md`);

try {
  const shares = await loadShares();
  const categories = [...new Set(shares.map((share) => share.category))].sort(
    (left, right) => left.localeCompare(right, "zh-CN"),
  );

  console.log("新建分享");
  console.log("");

  const title = await askRequired("分享标题：");
  const slug = await askSlug(title);
  const outputPath = sharePath(slug);

  try {
    await access(outputPath);
    throw new Error(`分享已存在：${path.relative(process.cwd(), outputPath)}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const description = await askRequired("分享说明：");

  console.log("选择分类：");
  categories.forEach((name, index) => {
    const count = shares.filter((share) => share.category === name).length;
    console.log(`${String(index + 1).padStart(2, "0")}. ${name} (${count} 条)`);
  });
  console.log("00. 新分类");

  let category = "";

  while (!category) {
    const answer = (
      await rl.question("分类编号或新分类名称 [未分类]：")
    ).trim();

    if (!answer) {
      category = "未分类";
      continue;
    }

    if (["0", "00", "new", "新建"].includes(answer.toLowerCase())) {
      category = await askRequired("新分类名称：");
      continue;
    }

    if (/^\d+$/.test(answer)) {
      const index = Number(answer) - 1;
      if (index >= 0 && index < categories.length) {
        category = categories[index];
      } else {
        console.log("分类编号无效。");
      }
      continue;
    }

    category = answer;
  }

  const date =
    (await rl.question(`日期 [${today()}]：`)).trim() || today();
  const source =
    (await rl.question("来源 [个人分享]：")).trim() || "个人分享";
  const href = (
    await rl.question("分享链接（可留空）：")
  ).trim();
  let external = false;

  if (href) {
    const externalAnswer = (
      await rl.question(
        `外部链接？[${/^https?:\/\//i.test(href) ? "Y/n" : "y/N"}]：`,
      )
    ).trim().toLowerCase();
    external = externalAnswer
      ? !["n", "no", "否"].includes(externalAnswer)
      : /^https?:\/\//i.test(href);
  }

  const cover = (
    await rl.question("封面路径，例如 /images/shares/cover.webp（可留空）：")
  ).trim();
  const coverAlt = cover
    ? (await rl.question("封面替代文本：")).trim()
    : "";

  const parentOptions = buildHierarchyOptions(shares);
  printHierarchyOptions(parentOptions, "可选上层目录");

  let parentShare = null;

  while (true) {
    const answer = (
      await rl.question("上层路径、编号或 ID（回车表示顶层）：")
    ).trim();

    if (!answer) break;

    parentShare = findHierarchyOption(parentOptions, answer)?.item ?? null;

    if (parentShare) break;
    console.log("没有找到对应分享，请重新输入。");
  }

  const siblingShares = shares.filter(
    (share) => (share.parentId ?? null) === (parentShare?.id ?? null),
  );
  const order =
    Math.max(0, ...siblingShares.map((share) => share.order ?? 0)) + 1;

  let lookbook = false;
  let lookbookOrder;

  if (!parentShare && cover) {
    const lookbookAnswer = (
      await rl.question("在 Lookbook 展示？[Y/n]：")
    ).trim().toLowerCase();
    lookbook = !["n", "no", "否"].includes(lookbookAnswer);

    if (lookbook) {
      const lookbookShares = shares.filter(
        (share) => !share.parentId && isLookbookShare(share),
      );
      lookbookOrder =
        Math.max(
          0,
          ...lookbookShares.map(
            (share) => share.lookbookOrder ?? share.order ?? 0,
          ),
        ) + 1;
    }
  }

  const draftAnswer = (
    await rl.question("先保存为草稿？[Y/n]：")
  ).trim().toLowerCase();
  const draft = !["n", "no", "否"].includes(draftAnswer);

  const frontmatter = [
    "---",
    `title: ${quoteYaml(title)}`,
    `description: ${quoteYaml(description)}`,
    `category: ${quoteYaml(category)}`,
    `date: ${quoteYaml(date)}`,
    `source: ${quoteYaml(source)}`,
    ...(href ? [`href: ${quoteYaml(href)}`] : []),
    ...(external ? ["external: true"] : []),
    ...(cover ? [`cover: ${quoteYaml(cover)}`] : []),
    ...(coverAlt ? [`coverAlt: ${quoteYaml(coverAlt)}`] : []),
    ...(parentShare ? [`parent: ${quoteYaml(parentShare.id)}`] : []),
    `order: ${order}`,
    `lookbook: ${lookbook}`,
    ...(lookbookOrder ? [`lookbookOrder: ${lookbookOrder}`] : []),
    `draft: ${draft}`,
    "---",
    "",
  ].join("\n");

  await mkdir(shareDir, { recursive: true });
  await writeFile(outputPath, frontmatter, { encoding: "utf8", flag: "wx" });

  const updatedShares = await loadShares();
  const contentMap = await writeContentMap(
    await loadArticles(),
    createShareMap(updatedShares),
  );

  console.log("");
  console.log(`已创建：${path.relative(process.cwd(), outputPath)}`);
  console.log(`分类：${category}`);
  console.log(
    `上层：${
      parentShare ? `${parentShare.title} (id: ${parentShare.id})` : "无"
    }`,
  );
  console.log(`顺序：${order}`);
  console.log(`Lookbook：${lookbook ? `是，顺序 ${lookbookOrder}` : "否"}`);
  console.log(`状态：${draft ? "草稿" : "发布"}`);
  console.log("已更新：CONTENT_MAP.md");

  if (contentMap.warnings.length > 0) {
    console.log("");
    console.log("内容提醒：");
    contentMap.warnings.forEach((warning) => console.log(warning));
  }

  console.log("");
  console.log("下一步：pnpm content:check，然后运行 pnpm run dev 预览。");
} catch (error) {
  if (error.code === "ABORT_ERR") {
    console.log("");
    console.log("已取消。");
  } else {
    throw error;
  }
} finally {
  rl.close();
}
