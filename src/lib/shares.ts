export interface Share {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  href?: string;
  source?: string;
  cover: string;
  coverAlt: string;
  external?: boolean;
  children?: Share[];
}

export function getShareDate(date: string) {
  const [year = "", month = "", day = ""] = date.split("-");

  return {
    year,
    month,
    day,
    value: `${year}.${month}.${day}`,
    short: `${month} / ${day}`,
  };
}

export function countShareNodes(nodes: Share[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countShareNodes(node.children ?? []),
    0,
  );
}

export function getShareYears(nodes: Share[]): string[] {
  const years = new Set<string>();

  const visit = (items: Share[]) => {
    items.forEach((item) => {
      years.add(item.date.slice(0, 4));
      visit(item.children ?? []);
    });
  };

  visit(nodes);
  return Array.from(years).sort().reverse();
}

export const shares: Share[] = [
  {
    id: "interaction-language",
    title: "让动画成为界面的语气",
    description:
      "不是每个元素都要飞入。好的动效更像标点，控制轻重、停顿和注意力。",
    category: "Motion",
    date: "2026-10-30",
    source: "Motion",
    cover: "/images/shares/motion-language.svg",
    coverAlt: "蓝色背景上的同心圆、弹簧曲线与黄色方块",
    children: [
      {
        id: "spring-is-not-default",
        title: "弹簧不是默认答案",
        description:
          "先判断动作需要的是物理惯性、节奏提示，还是单纯的视觉连续性。",
        category: "Note",
        date: "2026-10-30",
        href: "https://motion.dev/docs/react-transitions",
        source: "Motion Docs",
        cover: "/images/shares/motion-language.svg",
        coverAlt: "蓝色背景上的弹簧曲线",
        external: true,
      },
      {
        id: "reduced-motion-path",
        title: "给减少动态效果的人留一条路",
        description:
          "动画应该是增强，而不是访问内容的必要条件；同时保留清晰的完成状态。",
        category: "Accessibility",
        date: "2026-10-29",
        href: "https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion",
        source: "MDN",
        cover: "/images/shares/motion-language.svg",
        coverAlt: "蓝色背景上的同心圆",
        external: true,
      },
    ],
  },
  {
    id: "blank-page-start",
    title: "从一张空白页开始",
    description:
      "先把真实的内容放进去，再让结构和视觉慢慢变得准确。",
    category: "Notes",
    date: "2026-10-30",
    source: "站内文章",
    cover: "/images/from-blank-page.svg",
    coverAlt: "网格纸张上由圆形、线条和星形组成的抽象构图",
    children: [
      {
        id: "publish-before-ready",
        title: "不必等到完整再发布",
        description:
          "先发布一个真实可用的版本，让内容和结构在持续维护中逐渐清晰。",
        category: "Essay",
        date: "2026-10-30",
        href: "/writing/building-in-public",
        source: "站内文章",
        cover: "/images/from-blank-page.svg",
        coverAlt: "网格纸张上的抽象构图",
      },
      {
        id: "first-site-structure",
        title: "个人网站的第一版结构",
        description:
          "首页、文章、分享与关于四个入口，先保证内容有地方持续生长。",
        category: "Process",
        date: "2026-10-27",
        href: "/writing",
        source: "站内归档",
        cover: "/images/from-blank-page.svg",
        coverAlt: "网格纸张上的抽象构图",
      },
    ],
  },
  {
    id: "astro-islands",
    title: "静态页面，也可以局部鲜活",
    description:
      "Astro 的 Islands 让内容保持静态，只给真正需要交互的部分加载 JavaScript。",
    category: "Astro",
    date: "2026-10-28",
    source: "Astro Docs",
    cover: "/images/shares/astro-islands.svg",
    coverAlt: "绿色网格上分布着几何形状和一条连接两岸的路径",
    children: [
      {
        id: "content-stays-static",
        title: "内容继续由 HTML 承担",
        description:
          "文章和归档首先是一份静态文档，搜索、访问和降级都不依赖客户端运行时。",
        category: "Architecture",
        date: "2026-10-28",
        href: "https://docs.astro.build/en/concepts/why-astro/",
        source: "Astro Docs",
        cover: "/images/shares/astro-islands.svg",
        coverAlt: "绿色网格上的几何构图",
        external: true,
      },
      {
        id: "gallery-is-one-island",
        title: "Gallery 只加载一个 React 岛",
        description:
          "导航、文章和分享索引仍然由 Astro 输出，只有 Lookbook 的切换逻辑需要水合。",
        category: "Implementation",
        date: "2026-10-28",
        href: "https://docs.astro.build/en/concepts/islands/",
        source: "Astro Islands",
        cover: "/images/shares/astro-islands.svg",
        coverAlt: "绿色网格上的几何构图",
        external: true,
      },
    ],
  },
  {
    id: "quiet-interface",
    title: "安静界面里的信息层级",
    description:
      "减少颜色与装饰之后，字号、留白和节奏反而承担了更重要的表达。",
    category: "Design",
    date: "2026-10-24",
    source: "站内文章",
    cover: "/images/shares/quiet-layout.svg",
    coverAlt: "奶油色网格上由细线、圆点与红色标签构成的版式草图",
    children: [
      {
        id: "hierarchy-without-decoration",
        title: "不靠装饰建立层级",
        description:
          "优先使用字号、字重、间距和位置，让海报感来自结构本身。",
        category: "Essay",
        date: "2026-10-24",
        href: "/writing/notes-on-design",
        source: "站内文章",
        cover: "/images/shares/quiet-layout.svg",
        coverAlt: "奶油色布局草图",
      },
      {
        id: "grid-as-rhythm",
        title: "网格不是背景，是节奏",
        description:
          "弱化到几乎看不见的网格能帮助对齐，同时不抢走正文的注意力。",
        category: "Observation",
        date: "2026-10-22",
        href: "/about",
        source: "设计笔记",
        cover: "/images/shares/quiet-layout.svg",
        coverAlt: "奶油色布局草图",
      },
    ],
  },
  {
    id: "personal-web",
    title: "个人网站不需要像作品集",
    description:
      "它也可以是一张持续使用的桌子，允许草稿、收藏和未完成的想法同时存在。",
    category: "Inspiration",
    date: "2026-10-21",
    source: "onur.dev",
    cover: "/images/shares/personal-web.svg",
    coverAlt: "深色背景上的错位窗口、星形和橙色圆点",
    children: [
      {
        id: "website-as-desk",
        title: "把网站当作长期使用的工作台",
        description:
          "允许不同形态的内容共存，而不是把所有内容压成统一的项目卡片。",
        category: "Reference",
        date: "2026-10-21",
        href: "https://onur.dev",
        source: "onur.dev",
        cover: "/images/shares/personal-web.svg",
        coverAlt: "深色背景上的错位窗口",
        external: true,
      },
      {
        id: "digital-garden",
        title: "数字花园与公开笔记",
        description:
          "内容可以持续修订，公开的不一定必须是已经完成的最终作品。",
        category: "Reference",
        date: "2026-10-20",
        href: "https://maggieappleton.com/garden-history",
        source: "Maggie Appleton",
        cover: "/images/shares/personal-web.svg",
        coverAlt: "深色背景上的几何装饰",
        external: true,
      },
    ],
  },
];
