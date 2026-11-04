# 0x330

一个使用 Astro 构建的个人网站，包含全屏入口页、首页、文章归档、个人分享 Gallery、Markdown 文章详情、关于页和 RSS。

## 快速导航

- [页面结构](#页面结构)
- [本地开发](#本地开发)
- [文字内容维护流程](#文字内容维护流程)
- [文字内容目录结构](#文字内容目录结构)
- [快捷新建、层级查看与检查](#快捷新建层级查看与检查)
- [图片处理](#图片处理)
- [快速定位文字](#快速定位文字)
- [日常最短流程](#日常最短流程)
- [源码与线上分支](#源码与线上分支)
- [新建文章](#新建文章)
- [页面动画](#页面动画)
- [个人分享](#个人分享)
- [发布](#发布)

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

## 文字内容维护流程

当前主题样式与交互已经定稿。日常更新默认只修改文字和数据内容，不改动画、
布局、组件结构或视觉参数。开始编辑前先同步源码分支：

```powershell
git switch astro
git pull --rebase origin astro
```

### 文字内容目录结构

只需要记住下面这棵内容目录树。文章正文与页面固定文案分开维护：

```text
项目根目录/
├─ CONTENT_MAP.md               # 自动生成的文字内容层级地图
├─ scripts/
│  ├─ new-post.mjs              # pnpm new:post
│  ├─ new-share.mjs             # pnpm new:share
│  ├─ content-map.mjs           # pnpm content:map
│  ├─ content-check.mjs         # pnpm content:check
│  ├─ content-lib.mjs           # 文章读取与层级解析
│  ├─ share-lib.mjs             # 分享读取、校验与 Lookbook 规则
│  └─ image-tool.mjs            # 单张和批量图片处理
└─ src/
   ├─ content/
   │  ├─ blog/                  # 文章正文
   │  │  ├─ building-in-public.md
   │  │  ├─ notes-on-design.md
   │  │  └─ why-astro.md
   │  └─ shares/                # 分享条目，每篇一个 Markdown
   ├─ lib/
   │  ├─ site.ts                # 网站名称、简介、邮箱、导航
   │  ├─ shares.ts              # 分享类型、日期和 Lookbook 筛选
   │  └─ share-content.ts       # 读取 Markdown 并构建分享树
   ├─ pages/
   │  ├─ index.astro            # 全屏入口页文字
   │  ├─ home/
   │  │  └─ index.astro         # 首页文字
   │  ├─ about.astro            # 关于页文字
   │  ├─ gallery.astro          # 分享页开场文字
   │  └─ writing/
   │     ├─ index.astro         # 笔记归档页标题与介绍
   │     └─ [slug].astro        # 文章详情页固定文案
   └─ components/
      ├─ Sidebar.astro          # 桌面侧栏状态与页脚文字
      ├─ MobileHeader.astro     # 移动端菜单文字
      └─ WritingArchive.tsx     # 归档页搜索、日历和空状态文字
```

`dist/`、`.astro/` 和 `node_modules/` 都是生成目录或依赖目录，不直接修改。
文章详情页的正文、标题和摘要来自 `src/content/blog/*.md`；
`src/pages/writing/[slug].astro` 只保存“上一篇”“下一篇”等固定界面文字。

### 快捷新建、层级查看与检查

日常新建文章优先使用交互式命令：

```powershell
pnpm new:post
```

按提示填写标题、文件名、模块、上级文章、标签和可选封面。模块部分可以：

- 输入编号选择已有模块
- 输入 `0` 新建模块
- 直接输入一个不存在的模块名称

选择上级文章时，终端会按 `01`、`01.01` 的形式显示树状层级和文章 ID，
可以直接输入层级路径或 ID。创建完成后还会再次回显所选模块、父文章 ID、
自动顺序和最终网址。

脚本会自动：

- 创建 `src/content/blog/<slug>.md`
- 写入 `category`、`parent`、`order`、日期和草稿状态
- 计算同一模块、同一父级下的下一个 `order`
- 更新 `CONTENT_MAP.md`

新建分享使用：

```powershell
pnpm new:share
```

脚本会处理分类、日期、来源、链接、封面、上层目录、同级顺序、Lookbook
开关和草稿状态。上层目录同样按树状层级显示，可用 `02.01` 这样的路径
或分享 ID 选择，并自动更新内容地图。

需要重新查看文章和分享的模块、目录及父子关系时运行：

```powershell
pnpm content:map
```

终端会输出文章和分享的完整层级树，同时刷新根目录的 `CONTENT_MAP.md`。
层级树会显示内容 `id`，Markdown 中的名称可以直接点击打开对应源文件。
该文件由脚本生成，不应手动编辑，否则会被下次生成覆盖。

提交或发布前统一检查文章与分享数据：

```powershell
pnpm content:check
```

检查内容包括重复 `order`、重复文件名、缺失父级、父子循环、模块不一致、
缺失标题、无效日期、缺失封面和外部链接配置。

### 日常写作功能

`pnpm new:post` 已覆盖以下基础字段：

| 功能 | 自动处理方式 |
| --- | --- |
| 标题 | 交互输入，写入 `title` |
| 网址和文件名 | 交互输入英文 `slug` |
| 摘要 | 可选，写入 `description` |
| 模块 | 选择已有模块或新建 `category` |
| 父文章 | 显示路径与 ID，写入 `parent` |
| 排序 | 自动计算同级下一个 `order` |
| 标签 | 逗号分隔，写入 `tags` |
| 发布日期 | 自动写入当天 `pubDate` |
| 草稿 | 默认 `draft: true`，不会出现在线上 |
| 封面 | 可选路径和替代文本 |

正文写完后建议执行：

```powershell
pnpm content:check
pnpm content:map
pnpm run dev
```

确认内容和层级无误后，把 `draft` 改为 `false`，再按发布流程提交和部署。

### 图片处理

单张图片：

```powershell
pnpm image:single -- "D:\Pictures\cover.png"
```

默认会输出到 `public/images`，转换为 WebP，最长边限制为 1600px，质量为 82，
并保持原始宽高比。需要指定文件名、尺寸或替代文本时：

```powershell
pnpm image:single -- "D:\Pictures\agent-cover.png" `
  --name agent-cover `
  --width 1400 `
  --quality 82 `
  --alt "Agent 工具调用流程"
```

批量处理整个目录：

```powershell
pnpm image:batch -- "D:\Pictures\article-images" `
  --output public/images/article-slug `
  --width 1400 `
  --quality 82
```

批量模式会递归扫描子目录，保留相对目录结构，并生成：

- `image-manifest.json`：源文件、输出文件、尺寸、体积和跳过原因
- `image-snippets.md`：可直接粘贴到文章中的懒加载 HTML

常用参数：

| 参数 | 说明 |
| --- | --- |
| `--output <dir>` | 指定输出目录 |
| `--format webp\|avif\|jpeg\|png` | 输出格式，默认 WebP |
| `--width <px>` | 最大宽度，默认 1600 |
| `--height <px>` | 最大高度，可选 |
| `--quality <1-100>` | 有损格式质量，默认 82 |
| `--fit inside\|cover\|contain` | 缩放方式，默认保持完整画面 |
| `--name <filename>` | 单张输出名称 |
| `--alt <text>` | 单张图片替代文本 |
| `--no-recursive` | 批量模式不进入子目录 |
| `--force` | 覆盖已有输出 |
| `--dry-run` | 只列出处理计划，不写入文件 |

图片写入博客时建议：

- 普通照片和截图优先使用 WebP，最长边 `1200–1600px`
- 文字较多的图表可使用 `--quality 86`
- 图标和线稿优先保留 SVG
- 文章图片使用脚本生成的 `loading="lazy"` 和 `decoding="async"`
- 不直接覆盖源图片；仅在确认后使用 `--force`

### 快速定位文字

| 要修改的内容 | 文件 |
| --- | --- |
| 新增或修改文章正文、标题与摘要 | `src/content/blog/*.md` |
| 网站标题、简介、邮箱与导航名称 | `src/lib/site.ts` |
| 首页文字 | `src/pages/home/index.astro` |
| 全屏入口页文字 | `src/pages/index.astro` |
| 关于页文字 | `src/pages/about.astro` |
| 分享页开场文字 | `src/pages/gallery.astro` |
| 笔记归档页标题与介绍 | `src/pages/writing/index.astro` |
| 分享条目的标题、说明、分类与层级 | `src/content/shares/*.md` |
| 文章详情的目录、翻页和标签固定文字 | `src/pages/writing/[slug].astro` |
| 归档页搜索、视图切换与空状态文字 | `src/components/WritingArchive.tsx` |
| 桌面端身份状态和页脚文字 | `src/components/Sidebar.astro` |
| 移动端菜单文字 | `src/components/MobileHeader.astro` |

不知道一句话来自哪个文件时，可以直接在源码中搜索原文：

```powershell
rg -n "要查找的文字" src
```

例如查找首页中的“持续学习”：

```powershell
rg -n "持续学习" src/content src/lib src/pages src/components
```

搜索结果会显示文件路径和行号，用编辑器打开对应文件即可定位。

在 `.astro` 文件中修改页面文案时，只改标签之间的可见文字。保留现有的
`class`、`data-*`、`aria-*`、组件标签和 `<style>` 内容，避免破坏页面动画。

常规文章和页面更新不修改以下目录或文件：

- `src/styles/`
- `src/layouts/`
- `src/scripts/`
- `public/` 下的图片和视觉资源
- 页面内的 `<style>` 样式块
- 组件的 JSX、属性、事件和样式逻辑

只有确实需要修改侧栏、移动菜单或归档页等界面固定文案时，才进入上表列出的
组件文件，并且只修改标签之间的可见文字。

### 日常最短流程

修改完成后，核心发布流程只有四步：

```powershell
git add -- <本次修改的文件>
git commit -m "content: 更新页面文字"
git push origin astro
pnpm run deploy
```

需要一边修改一边查看效果时，可以在编辑前启动本地服务。该命令只用于预览，
不会发布网站：

```powershell
pnpm run dev
```

提交后打开 `http://localhost:4321/` 检查对应页面；检查完成后回到终端，
按 `Ctrl + C` 停止服务。

### 源码与线上分支

发布需要同时更新两个分支：

- `astro` 保存源码、Markdown、页面和配置。
- `gh-pages` 保存构建后的 HTML、CSS、JavaScript 和静态资源。
- GitHub Pages 线上展示的是 `gh-pages` 分支，而不是 `astro` 源码。

`git push origin astro` 只把源码上传到 GitHub，不会更新线上网站。
`pnpm run deploy` 会执行 `astro build && gh-pages -d dist --nojekyll`，
重新构建并把 `dist` 推送到 `gh-pages`。因此不需要在发布前单独运行
`pnpm run build`。

### 可选检查

内容较多或修改了 Markdown frontmatter 时，可以额外运行：

```powershell
git diff --check
git diff --name-only
pnpm run build
```

- `git diff --check` 检查空格、冲突标记等格式问题。
- `git diff --name-only` 列出修改过的文件，用来确认没有误改样式。
- `pnpm run build` 提前验证内容能否生成静态页面。

如果 `git diff --name-only` 中出现样式、组件、布局或脚本文件，应先确认这些
改动是否确实属于本次内容更新；纯文字任务不应包含这些文件。

## 新建文章

推荐先运行 `pnpm new:post`。需要手工创建时，再按下面的结构编写文件。

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

新建分享：

```powershell
pnpm new:share
```

分享内容与文章一样，使用 `src/content/shares` 下的 Markdown 文件维护。
每个文件对应一个目录或分享条目：

```md
---
title: "前端工具收藏"
description: "平时使用和关注的前端工具。"
category: "前端开发"
date: "2026-11-02"
source: "个人收藏"
cover: "/images/shares/frontend-tools.svg"
coverAlt: "前端工具收藏封面"
parent: "可选的上层分享-id"
order: 1
lookbook: true
lookbookOrder: 1
draft: false
---
```

常用字段：

| 字段 | 作用 |
| --- | --- |
| `title` | 目录或分享标题 |
| `description` | Archive 列表中的说明 |
| `category` | 分类标签，不负责目录分组 |
| `date` | 日期，格式为 `YYYY-MM-DD` |
| `source` | 来源名称 |
| `href` | 点击分享后的链接 |
| `external` | 是否为外部链接，默认 `false` |
| `cover` / `coverAlt` | 可选封面和替代文本 |
| `parent` | 上层分享的文件 ID；省略表示顶层目录 |
| `order` | 同级展示顺序 |
| `lookbook` | 是否允许进入 Lookbook |
| `lookbookOrder` | Lookbook 单独排序 |
| `draft` | 草稿不会出现在线上 |

目录层级由 `parent` 决定，不需要创建多层文件夹。Archive 会展示全部条目，
左侧目录和正文分组都可以逐层折叠。

Lookbook 默认规则：

- 有 `cover` 且没有设置 `lookbook: false` 的顶层分享才会显示
- 没有封面的分享仍会出现在 Archive，但不会进入 Lookbook
- 设置 `lookbook: false` 可以主动从 Lookbook 隐藏
- 使用 `lookbookOrder` 调整卡片顺序，数字越小越靠前

`category` 当前只是显示标签，不会自动把相同分类合并成目录，也不会自动应用
分类专属颜色。分享封面放在 `public/images/shares`，交互组件位于
`src/components/gallery`。

## 发布

源码保存在 `astro` 分支，GitHub Pages 展示 `gh-pages` 分支中的构建结果。
建议先用本地预览检查文字；`pnpm run deploy` 会自动完成生产构建。

```powershell
git add -- <本次修改的文件>
git commit -m "content: 更新页面文字"
git push origin astro
pnpm run deploy
```

`pnpm run deploy` 会重新构建 `dist` 并把结果推送到 `gh-pages`。发布完成后
检查 `https://1022260464.github.io/` 以及本次修改涉及的页面。GitHub Pages
可能有短暂缓存，未立即更新时等待片刻后再强制刷新。

## 设计说明

站点视觉参考了编辑式排版、纸张网格和克制的单色界面，但代码、组件、文案与视觉细节均为本项目独立实现。未复制参考项目的源码、图片或个人内容。
