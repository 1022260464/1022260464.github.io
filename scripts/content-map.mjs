import { loadArticles, writeContentMap } from "./content-lib.mjs";

const articles = await loadArticles();
const contentMap = await writeContentMap(articles);

console.log("内容地图");
console.log("");
console.log(contentMap.terminal || "暂无文章");
console.log("");
console.log("已更新 CONTENT_MAP.md");

if (contentMap.warnings.length > 0) {
  console.log("");
  console.log("需要检查：");
  contentMap.warnings.forEach((warning) => console.log(warning));
  process.exitCode = 1;
}
