import { loadArticles, validateArticles } from "./content-lib.mjs";
import {
  loadShares,
  validateShareAssets,
  validateShares,
} from "./share-lib.mjs";

const articles = await loadArticles();
const articleValidation = validateArticles(articles);
const shares = await loadShares();
const shareValidation = validateShares(shares);
const shareAssetWarnings = await validateShareAssets(shares);
const errors = [...articleValidation.errors, ...shareValidation.errors];
const warnings = [
  ...articleValidation.warnings,
  ...shareValidation.warnings,
  ...shareAssetWarnings,
];
const categories = new Set(articles.map((article) => article.category));
const drafts = articles.filter((article) => article.draft).length;
const shareDrafts = shares.filter((share) => share.draft).length;

console.log("内容检查");
console.log("");
console.log(`文章：${articles.length}`);
console.log(`模块：${categories.size}`);
console.log(`草稿：${drafts}`);
console.log(`分享：${shares.length}`);
console.log(`分享草稿：${shareDrafts}`);

if (errors.length === 0 && warnings.length === 0) {
  console.log("");
  console.log("没有发现问题。");
} else {
  if (errors.length > 0) {
    console.log("");
    console.log("错误：");
    errors.forEach((error) => console.log(error));
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("提醒：");
    warnings.forEach((warning) => console.log(warning));
  }
}

if (errors.length > 0) {
  process.exitCode = 1;
}
