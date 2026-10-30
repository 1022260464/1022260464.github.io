# 0x330

一个使用 Astro 构建的个人网站，包含全屏入口页、首页、文章归档、个人分享 Gallery、Markdown 文章详情、关于页和 RSS。

## 页面结构

- `/`：独立的浅色全屏入口页，使用 CSS 轨道与圆形行星动画，不显示站点侧边栏。
- `/home/`：原来的个人网站首页。
- `/writing/`、`/gallery/`、`/about/`：内容页面。

从入口页点击“进入网站”后，会通过竖向幕布过渡到 `/home/`。站内使用
`ClientRouter` 的页面导航也会复用该过渡。相关实现位于
`src/components/PageCurtain.astro`。

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
category: "建站手记"
order: 1
draft: false
cover: "/images/article-cover.jpg"
coverAlt: "文章封面的替代文本"
---

正文从此开始。
```

文件名为文章网址，例如 `my-first-post.md` 会生成
`/writing/my-first-post/`。设置 `draft: true` 后不会出现在文章列表和构建结果中。

文章可以通过以下字段形成层级：

```yaml
category: "建站手记"     # 顶层分类
parent: "building-in-public" # 上级文章的 id，也就是不带 .md 的文件名
order: 2                 # 同一层级内的排序
```

`parent` 可省略。设置后出现的嵌套关系会同时显示在文章归档的“层级”
视图和文章详情页侧栏中。文章页还提供按月查看的日历、时间清单、搜索和
标签筛选。

## 页面动画

站点使用 `motion` 驱动动画，逻辑集中在 `src/scripts/site-motion.ts`。在需要动画的元素上添加属性即可：

```html
<!-- 页面首次加载时错峰进入 -->
<h1 data-enter>标题</h1>

<!-- 滚动进入视口时出现 -->
<article data-reveal>内容</article>

<!-- 自然逐字输入，适合说明文字 -->
<p data-typewriter>一段说明文字</p>

<!-- 逐字拆分并依次出现 -->
<h1 data-split="chars">逐字出现的标题</h1>

<!-- 旋转缩放进入，适合装饰性图标 -->
<svg data-spin>...</svg>

<!-- 桌面端鼠标悬停时的轻微倾斜和磁性跟随 -->
<div data-tilt>卡片</div>
<a data-magnetic>按钮</a>
```

`prefers-reduced-motion: reduce` 开启时，页面会跳过动画并直接显示内容。页面之间的切换由 Astro 的 `ClientRouter` 完成，幕布效果不依赖 WebGPU。

文章设置 `cover` 后会显示封面，并自动启用遮罩展开和滚动视差。封面图片放在 `public/images`，路径从 `/images/...` 开始。

## 个人分享

分享模块位于 `/gallery`，与文章内容完全分开。桌面端默认显示 3D 楼梯
Lookbook，可切换到带粘性索引的 Archive 列表；手机端默认显示 Archive。

在 `src/lib/shares.ts` 中维护分享树。每个顶层条目是一组分享，
通过递归的 `children` 支持任意层级：

```ts
{
  id: "collection-id",
  title: "分享合集",
  description: "合集说明",
  category: "Design",
  date: "2026-10-30",
  source: "来源名称",
  cover: "/images/shares/cover.svg",
  coverAlt: "封面图片描述",
  children: [
    {
      id: "entry-id",
      title: "层级中的一条分享",
      description: "简短说明",
      category: "Note",
      date: "2026-10-29",
      href: "https://example.com",
      source: "Example",
      cover: "/images/shares/entry-cover.svg",
      coverAlt: "条目封面描述",
      external: true,
      children: [],
    },
  ],
}
```

Lookbook 展示顶层合集；Archive 展示完整树并可逐层展开。站内链接将
`external` 省略或设为 `false`。日期统一使用 `YYYY-MM-DD`，页面和索引会
自动格式化显示。分享封面放在 `public/images/shares`，交互组件位于
`src/components/gallery`。

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
