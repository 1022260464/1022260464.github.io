# 0x330

一个使用 Astro 构建的个人网站，包含首页、文章归档、Markdown 文章详情、关于页和 RSS。

## 本地开发

```powershell
pnpm install
pnpm run dev
```

打开 `http://localhost:4321/`。生产构建和本地预览：

```powershell
pnpm run build
pnpm run preview
```

## 新建文章

在 `src/content/blog` 中新建 `.md` 文件：

```md
---
title: "文章标题"
description: "用于列表和搜索引擎的一句话简介"
pubDate: 2026-10-30
tags: ["随笔", "设计"]
draft: false
---

正文从此开始。
```

文件名为文章网址，例如 `my-first-post.md` 会生成
`/writing/my-first-post/`。设置 `draft: true` 后不会出现在文章列表和构建结果中。

## 发布

源码保存在 `astro` 分支，GitHub Pages 展示 `gh-pages` 分支中的构建结果。

```powershell
git add src public astro.config.mjs package.json pnpm-lock.yaml
git commit -m "post: 更新文章"
git push
pnpm run deploy
```

## 设计说明

站点视觉参考了编辑式排版、纸张网格和克制的单色界面，但代码、组件、文案与视觉细节均为本项目独立实现。未复制参考项目的源码、图片或个人内容。
