import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  blogDir,
  loadArticles,
  writeContentMap,
} from "./content-lib.mjs";
import {
  buildHierarchyOptions,
  findHierarchyOption,
  printHierarchyOptions,
} from "./interactive-lib.mjs";
import { createShareMap, loadShares } from "./share-lib.mjs";

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
      await rl.question(`文件名/网址 slug（小写英文、数字、连字符）${suffix}：`)
    ).trim();
    const slug = answer || suggested;

    if (!slug) {
      console.log("中文标题需要手动填写一个英文 slug。");
      continue;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      console.log("slug 只能使用小写英文、数字和单个连字符。");
      continue;
    }

    return slug;
  }
};

const articlePath = (slug) => path.join(blogDir, `${slug}.md`);

try {
  const articles = await loadArticles();
  const categories = [...new Set(articles.map((article) => article.category))].sort(
    (left, right) => left.localeCompare(right, "zh-CN"),
  );

  console.log("新建文章");
  console.log("");

  const title = await askRequired("文章标题：");
  const slug = await askSlug(title);
  const outputPath = articlePath(slug);

  try {
    await access(outputPath);
    throw new Error(`文章已存在：${path.relative(process.cwd(), outputPath)}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const description = (
    await rl.question("文章摘要（可留空）：")
  ).trim();

  console.log("选择所属模块：");
  categories.forEach((name, index) => {
    const count = articles.filter((article) => article.category === name).length;
    console.log(`${String(index + 1).padStart(2, "0")}. ${name} (${count} 篇)`);
  });
  console.log("00. 新建模块");

  let category = "";

  while (!category) {
    const answer = (
      await rl.question("模块编号或新模块名称 [未分类]：")
    ).trim();

    if (!answer) {
      category = "未分类";
      continue;
    }

    if (["0", "00", "new", "新建"].includes(answer.toLowerCase())) {
      category = await askRequired("新模块名称：");
      continue;
    }

    if (/^\d+$/.test(answer)) {
      const index = Number(answer) - 1;
      if (index >= 0 && index < categories.length) {
        category = categories[index];
      } else {
        console.log("模块编号无效。");
      }
      continue;
    }

    category = answer;
  }

  const isNewCategory = !categories.includes(category);

  const parentOptions = buildHierarchyOptions(
    articles.filter((article) => article.category === category),
  );
  printHierarchyOptions(parentOptions, `“${category}”下可选上级文章`);

  let parentArticle = null;

  while (true) {
    const answer = (
      await rl.question("上级路径、编号或 ID（回车表示顶级）：")
    ).trim();

    if (!answer) break;

    parentArticle = findHierarchyOption(parentOptions, answer)?.item ?? null;

    if (parentArticle) break;
    console.log("没有找到对应文章，请重新输入。");
  }

  if (parentArticle) {
    console.log(
      `已选择上级：${parentArticle.hierarchyPath} (id: ${parentArticle.id})`,
    );
  } else {
    console.log("已选择上级：无（顶级文章）");
  }

  const tagAnswer = (
    await rl.question("标签，使用逗号分隔（可留空）：")
  ).trim();
  const tags = tagAnswer
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  const cover = (
    await rl.question("封面路径，例如 /images/cover.webp（可留空）：")
  ).trim();
  const coverAlt = cover
    ? (await rl.question("封面替代文本（可留空）：")).trim()
    : "";

  const draftAnswer = (
    await rl.question("先保存为草稿？[Y/n]：")
  ).trim().toLowerCase();
  const draft = !["n", "no", "否"].includes(draftAnswer);

  const siblingArticles = articles.filter(
    (article) =>
      article.category === category &&
      (article.parentId ?? null) === (parentArticle?.id ?? null),
  );
  const order =
    Math.max(0, ...siblingArticles.map((article) => article.order ?? 0)) + 1;

  const frontmatter = [
    "---",
    `title: ${quoteYaml(title)}`,
    ...(description ? [`description: ${quoteYaml(description)}`] : []),
    `pubDate: ${today()}`,
    `tags: [${tags.map(quoteYaml).join(", ")}]`,
    `category: ${quoteYaml(category)}`,
    ...(parentArticle ? [`parent: ${quoteYaml(parentArticle.id)}`] : []),
    `order: ${order}`,
    `draft: ${draft}`,
    ...(cover ? [`cover: ${quoteYaml(cover)}`] : []),
    ...(coverAlt ? [`coverAlt: ${quoteYaml(coverAlt)}`] : []),
    "---",
    "",
  ];

  const source = [
    ...frontmatter,
    "在这里开始写正文。",
    "",
    "## 小节标题",
    "",
  ].join("\n");

  await mkdir(blogDir, { recursive: true });
  await writeFile(outputPath, source, { encoding: "utf8", flag: "wx" });
  const shareMap = createShareMap(await loadShares());
  const contentMap = await writeContentMap(await loadArticles(), shareMap);

  console.log("");
  console.log(`已创建：${path.relative(process.cwd(), outputPath)}`);
  console.log(`模块：${category}${isNewCategory ? "（新模块）" : ""}`);
  console.log(
    `上级：${
      parentArticle
        ? `${parentArticle.title} (id: ${parentArticle.id})`
        : "无"
    }`,
  );
  console.log(`顺序：${order}`);
  console.log(`状态：${draft ? "草稿" : "发布"}`);
  console.log(`网址：/writing/${slug}/`);
  console.log("已更新：CONTENT_MAP.md");

  if (contentMap.warnings.length > 0) {
    console.log("");
    console.log("内容提醒：");
    contentMap.warnings.forEach((warning) => console.log(warning));
  }

  console.log("");
  console.log("下一步：打开 Markdown 写正文，然后运行 pnpm run dev 预览。");
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
