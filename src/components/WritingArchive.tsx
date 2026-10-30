import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import "./WritingArchive.css";

export interface WritingArchivePost {
  id: string;
  title: string;
  description?: string;
  date: string;
  updatedDate?: string;
  tags: string[];
  category: string;
  parent?: string;
  order: number;
  readingMinutes: number;
}

type ViewMode = "outline" | "list" | "calendar";
type WritingNode = WritingArchivePost & { children: WritingNode[] };

interface WritingArchiveProps {
  posts: WritingArchivePost[];
}

const viewOptions: Array<{ id: ViewMode; label: string; index: string }> = [
  { id: "outline", label: "层级", index: "01" },
  { id: "list", label: "清单", index: "02" },
  { id: "calendar", label: "日历", index: "03" },
];

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function dateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function monthStart(date: string) {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function shiftMonth(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function sortPosts(posts: WritingArchivePost[]) {
  return [...posts].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(b.date).valueOf() - new Date(a.date).valueOf();
  });
}

function buildTree(posts: WritingArchivePost[]): WritingNode[] {
  const nodes = new Map<string, WritingNode>(
    posts.map((post) => [post.id, { ...post, children: [] }]),
  );
  const ids = new Set(nodes.keys());
  const roots: WritingNode[] = [];

  posts.forEach((post) => {
    const node = nodes.get(post.id);
    if (!node) return;

    const parent = post.parent ? nodes.get(post.parent) : undefined;
    if (post.parent && ids.has(post.parent) && post.parent !== post.id && parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortBranch = (branch: WritingNode[]) => {
    branch.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(b.date).valueOf() - new Date(a.date).valueOf();
    });
    branch.forEach((node) => sortBranch(node.children));
    return branch;
  };

  return sortBranch(roots);
}

function countNodes(nodes: WritingNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countNodes(node.children),
    0,
  );
}

function OutlineBranch({
  nodes,
  parentPath = "",
}: {
  nodes: WritingNode[];
  parentPath?: string;
}) {
  return (
    <div className={parentPath ? "outline-children" : "outline-roots"}>
      {nodes.map((node, index) => {
        const path = parentPath
          ? `${parentPath}.${index + 1}`
          : String(index + 1).padStart(2, "0");

        return (
          <div className="outline-node" key={node.id}>
            <a
              className="outline-row"
              href={`/writing/${node.id}`}
              style={{ "--outline-depth": parentPath ? 1 : 0 } as CSSProperties}
            >
              <span className="outline-path">{path}</span>
              <span className="outline-copy">
                <span className="outline-meta">
                  {node.category}
                  <span aria-hidden="true">/</span>
                  <time dateTime={node.date}>
                    {shortDateFormatter.format(new Date(node.date))}
                  </time>
                  <span>{node.readingMinutes} min</span>
                </span>
                <strong>{node.title}</strong>
                {node.description ? <span>{node.description}</span> : null}
              </span>
              <span className="outline-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            {node.children.length ? (
              <OutlineBranch nodes={node.children} parentPath={path} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function OutlineView({ posts }: { posts: WritingArchivePost[] }) {
  const categories = useMemo(() => {
    const groups = new Map<string, WritingArchivePost[]>();

    posts.forEach((post) => {
      const group = groups.get(post.category) ?? [];
      group.push(post);
      groups.set(post.category, group);
    });

    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "zh-CN"),
    );
  }, [posts]);

  if (!categories.length) {
    return <EmptyState />;
  }

  return (
    <div className="writing-outline">
      {categories.map(([category, categoryPosts], index) => {
        const tree = buildTree(categoryPosts);

        return (
          <section className="outline-category" key={category}>
            <header>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{category}</h2>
                <p>{countNodes(tree)} notes</p>
              </div>
            </header>
            <OutlineBranch nodes={tree} />
          </section>
        );
      })}
    </div>
  );
}

function ListView({ posts }: { posts: WritingArchivePost[] }) {
  if (!posts.length) {
    return <EmptyState />;
  }

  return (
    <div className="writing-list">
      <div className="writing-list-head" aria-hidden="true">
        <span>No.</span>
        <span>Date</span>
        <span>Note</span>
        <span>Reading</span>
      </div>
      {sortPosts([...posts])
        .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
        .map((post, index) => (
          <a className="writing-list-row" href={`/writing/${post.id}`} key={post.id}>
            <span className="writing-list-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="writing-list-date">
              <time dateTime={post.date}>
                {shortDateFormatter.format(new Date(post.date))}
              </time>
              <span>{post.category}</span>
            </span>
            <span className="writing-list-copy">
              <strong>{post.title}</strong>
              {post.description ? <span>{post.description}</span> : null}
              <span className="writing-list-tags">
                {post.tags.map((tag) => (
                  <i key={tag}>{tag}</i>
                ))}
              </span>
            </span>
            <span className="writing-list-reading">
              {post.readingMinutes} min
              <i aria-hidden="true">↗</i>
            </span>
          </a>
        ))}
    </div>
  );
}

function CalendarView({ posts }: { posts: WritingArchivePost[] }) {
  const latestDate = posts[0]?.date ?? new Date().toISOString();
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(latestDate));
  const [selectedDate, setSelectedDate] = useState(() => latestDate.slice(0, 10));

  const postsByDate = useMemo(() => {
    const grouped = new Map<string, WritingArchivePost[]>();
    posts.forEach((post) => {
      const key = post.date.slice(0, 10);
      const group = grouped.get(key) ?? [];
      group.push(post);
      grouped.set(key, group);
    });
    return grouped;
  }, [posts]);

  const days = useMemo(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const gridStart = new Date(Date.UTC(year, month, 1 - firstWeekday));

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      const key = dateKey(date);

      return {
        key,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month,
        articles: postsByDate.get(key) ?? [],
      };
    });
  }, [postsByDate, visibleMonth]);

  const selectedArticles = postsByDate.get(selectedDate) ?? [];
  const selectedDateLabel = longDateFormatter.format(
    new Date(`${selectedDate}T00:00:00Z`),
  );

  return (
    <div className="writing-calendar">
      <section className="calendar-card" aria-label="笔记日历">
        <header className="calendar-toolbar">
          <div>
            <span>Publication calendar</span>
            <h2>{monthFormatter.format(visibleMonth)}</h2>
          </div>
          <div className="calendar-actions">
            <button
              type="button"
              aria-label="上个月"
              onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                const latest = monthStart(latestDate);
                setVisibleMonth(latest);
                setSelectedDate(latestDate.slice(0, 10));
              }}
            >
              最新
            </button>
            <button
              type="button"
              aria-label="下个月"
              onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            >
              →
            </button>
          </div>
        </header>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const hasPosts = day.articles.length > 0;
            return hasPosts ? (
              <button
                type="button"
                className={[
                  "calendar-day",
                  day.inMonth ? "in-month" : "outside-month",
                  selectedDate === day.key ? "selected" : "",
                  hasPosts ? "has-posts" : "",
                ].join(" ")}
                key={day.key}
                onClick={() => setSelectedDate(day.key)}
                aria-label={`${day.key}，${day.articles.length} 篇笔记`}
              >
                <span>{day.day}</span>
                <i>{day.articles.length}</i>
              </button>
            ) : (
              <span
                className={[
                  "calendar-day",
                  day.inMonth ? "in-month" : "outside-month",
                ].join(" ")}
                key={day.key}
              >
                {day.day}
              </span>
            );
          })}
        </div>
      </section>

      <aside className="calendar-detail" aria-live="polite">
        <span className="calendar-detail-label">Selected date</span>
        <h3>{selectedDateLabel}</h3>
        {selectedArticles.length ? (
          <div className="calendar-results">
            {selectedArticles.map((post) => (
              <a href={`/writing/${post.id}`} key={post.id}>
                <span>{post.category}</span>
                <strong>{post.title}</strong>
                <small>{post.readingMinutes} min read ↗</small>
              </a>
            ))}
          </div>
        ) : (
          <p className="calendar-empty">这一天没有发布笔记。</p>
        )}
      </aside>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="writing-empty">
      <span>∅</span>
      <p>没有找到匹配的笔记。</p>
    </div>
  );
}

export default function WritingArchive({ posts }: WritingArchiveProps) {
  const [view, setView] = useState<ViewMode>("outline");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("全部");

  const tags = useMemo(
    () => ["全部", ...Array.from(new Set(posts.flatMap((post) => post.tags)))],
    [posts],
  );
  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");

    return posts.filter((post) => {
      const matchesTag = activeTag === "全部" || post.tags.includes(activeTag);
      const haystack = [
        post.title,
        post.description ?? "",
        post.category,
        ...post.tags,
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return matchesTag && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeTag, posts, query]);

  const totalReadingMinutes = posts.reduce(
    (total, post) => total + post.readingMinutes,
    0,
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="writing-archive">
        <div className="archive-dashboard">
          <div className="archive-stats">
            <span>
              <strong>{String(posts.length).padStart(2, "0")}</strong>
              notes
            </span>
            <span>
              <strong>{String(tags.length - 1).padStart(2, "0")}</strong>
              topics
            </span>
            <span>
              <strong>{totalReadingMinutes}</strong>
              min reading
            </span>
            <a className="archive-rss" href="/writing.xml">
              RSS ↗
            </a>
          </div>
          <div className="archive-view-switch" role="group" aria-label="切换笔记视图">
            {viewOptions.map((option) => (
              <button
                type="button"
                className={view === option.id ? "active" : undefined}
                aria-pressed={view === option.id}
                onClick={() => setView(option.id)}
                key={option.id}
              >
                {view === option.id ? (
                  <motion.span
                    className="archive-view-background"
                    layoutId="writing-view-background"
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  />
                ) : null}
                <span>{option.index}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="archive-filters">
          <label className="archive-search">
            <span>Search archive</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、标签或分类"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="清除搜索">
                ×
              </button>
            ) : null}
          </label>
          <div className="archive-tags" aria-label="按标签筛选">
            {tags.map((tag) => (
              <button
                type="button"
                className={activeTag === tag ? "active" : undefined}
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(tag)}
                key={tag}
              >
                {tag}
              </button>
            ))}
          </div>
          <span className="archive-result-count" aria-live="polite">
            {String(filteredPosts.length).padStart(2, "0")} results
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="archive-view"
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "outline" ? <OutlineView posts={filteredPosts} /> : null}
            {view === "list" ? <ListView posts={filteredPosts} /> : null}
            {view === "calendar" ? <CalendarView posts={filteredPosts} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
