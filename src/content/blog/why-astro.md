---
title: "为什么用 Astro 重做这个网站"
description: "内容优先、默认零客户端 JavaScript，以及足够自由的页面结构。"
pubDate: 2026-10-28
tags: ["Astro", "前端"]
draft: false
---

我希望个人网站首先是一个适合阅读的地方，其次才是一个可以展示技术的地方。

Astro 把内容放在页面构建的中心：文章可以是 Markdown，列表和文章详情会在构建时生成静态 HTML。对于博客来说，这种模型简单、快速，也更容易长期维护。

## 保留选择权

静态生成并不意味着只能使用固定模板。页面布局、CSS 和交互仍然可以自由设计；以后需要 React、Vue 或其他组件时，也可以按页面逐步加入。

```astro
---
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
---

<ul>
  {posts.map((post) => <li>{post.data.title}</li>)}
</ul>
```

这种结构让我可以把注意力放回内容本身：

- 新文章只需要一个 Markdown 文件；
- 页面样式和内容分开维护；
- 构建结果可以直接发布到 GitHub Pages；
- 不依赖运行时服务器或数据库。

技术选择最终应该服务于表达。选择 Astro，是因为它给设计留下空间，同时没有让写作流程变复杂。
