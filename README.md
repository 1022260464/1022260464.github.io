# 0x330

一个使用 Astro 构建的个人网站，包含首页、文章归档、个人分享 Gallery、Markdown 文章详情、关于页和 RSS。

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
cover: "/images/article-cover.jpg"
coverAlt: "文章封面的替代文本"
---

正文从此开始。
```

文件名为文章网址，例如 `my-first-post.md` 会生成
`/writing/my-first-post/`。设置 `draft: true` 后不会出现在文章列表和构建结果中。

## 页面动画

站点使用 `motion` 驱动动画，逻辑集中在 `src/scripts/site-motion.ts`。在需要动画的元素上添加属性即可：

```html
<!-- 页面首次加载时错峰进入 -->
<h1 data-enter>标题</h1>

<!-- 滚动进入视口时出现 -->
<article data-reveal>内容</article>

<!-- 逐字拆分并依次出现 -->
<h1 data-split="chars">逐字出现的标题</h1>

<!-- 旋转缩放进入，适合装饰性图标 -->
<svg data-spin>...</svg>

<!-- 桌面端鼠标悬停时的轻微倾斜和磁性跟随 -->
<div data-tilt>卡片</div>
<a data-magnetic>按钮</a>
```

`prefers-reduced-motion: reduce` 开启时，页面会跳过动画并直接显示内容。页面之间的切换由 Astro 的 `ClientRouter` 完成。

文章设置 `cover` 后会显示封面，并自动启用遮罩展开和滚动视差。封面图片放在 `public/images`，路径从 `/images/...` 开始。

## 个人分享

分享模块位于 `/gallery`，与文章内容完全分开。桌面端默认显示 3D 楼梯
Lookbook，可切换到带粘性索引的 Archive 列表；手机端默认显示 Archive。

在 `src/lib/shares.ts` 中维护分享条目：

```ts
{
  id: "unique-id",
  title: "分享标题",
  description: "列表中的简短说明",
  category: "Design",
  displayDate: "10 / 30",
  year: "2026",
  href: "https://example.com",
  source: "来源名称",
  cover: "/images/shares/cover.svg",
  coverAlt: "封面图片描述",
  external: true,
}
```

站内链接将 `external` 省略或设为 `false`。分享封面放在
`public/images/shares`，交互组件位于 `src/components/gallery`。

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
