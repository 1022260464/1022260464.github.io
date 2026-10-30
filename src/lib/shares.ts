export interface Share {
  id: string;
  title: string;
  description: string;
  category: string;
  displayDate: string;
  year: string;
  href: string;
  source: string;
  cover: string;
  coverAlt: string;
  external?: boolean;
}

export const shares: Share[] = [
  {
    id: "motion-as-tone",
    title: "让动画成为界面的语气",
    description:
      "不是每个元素都要飞入。好的动效更像标点，控制轻重、停顿和注意力。",
    category: "Motion",
    displayDate: "10 / 30",
    year: "2026",
    href: "https://motion.dev/docs/react",
    source: "Motion",
    cover: "/images/shares/motion-language.svg",
    coverAlt: "蓝色背景上的同心圆、弹簧曲线与黄色方块",
    external: true,
  },
  {
    id: "blank-page-start",
    title: "从一张空白页开始",
    description:
      "先把真实的内容放进去，再让结构和视觉慢慢变得准确。",
    category: "Notes",
    displayDate: "10 / 30",
    year: "2026",
    href: "/writing/building-in-public",
    source: "站内文章",
    cover: "/images/from-blank-page.svg",
    coverAlt: "网格纸张上由圆形、线条和星形组成的抽象构图",
  },
  {
    id: "astro-islands",
    title: "静态页面，也可以局部鲜活",
    description:
      "Astro 的 Islands 让内容保持静态，只给真正需要交互的部分加载 JavaScript。",
    category: "Astro",
    displayDate: "10 / 28",
    year: "2026",
    href: "https://docs.astro.build/en/concepts/islands/",
    source: "Astro Docs",
    cover: "/images/shares/astro-islands.svg",
    coverAlt: "绿色网格上分布着几何形状和一条连接两岸的路径",
    external: true,
  },
  {
    id: "quiet-interface",
    title: "安静界面里的信息层级",
    description:
      "减少颜色与装饰之后，字号、留白和节奏反而承担了更重要的表达。",
    category: "Design",
    displayDate: "10 / 24",
    year: "2026",
    href: "/writing/notes-on-design",
    source: "站内文章",
    cover: "/images/shares/quiet-layout.svg",
    coverAlt: "奶油色网格上由细线、圆点与红色标签构成的版式草图",
  },
  {
    id: "personal-web",
    title: "个人网站不需要像作品集",
    description:
      "它也可以是一张持续使用的桌子，允许草稿、收藏和未完成的想法同时存在。",
    category: "Inspiration",
    displayDate: "10 / 21",
    year: "2026",
    href: "https://onur.dev",
    source: "onur.dev",
    cover: "/images/shares/personal-web.svg",
    coverAlt: "深色背景上的错位窗口、星形和橙色圆点",
    external: true,
  },
];
