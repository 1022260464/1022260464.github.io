import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  countShareNodes,
  getShareDate,
  getShareYears,
  type Share,
} from "../../lib/shares";
import "./ShareGallery.css";

type GalleryMode = "lookbook" | "archive";

interface ShareGalleryProps {
  shares: Share[];
}

const spring = {
  type: "spring",
  stiffness: 210,
  damping: 24,
  mass: 0.8,
} as const;

function ShareLink({
  share,
  children,
  className,
}: {
  share: Share;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <a
      className={className}
      href={share.href ?? `#share-${share.id}`}
      target={share.external ? "_blank" : undefined}
      rel={share.external ? "noreferrer" : undefined}
      aria-label={`${share.title}，${share.source ?? "个人分享"}`}
    >
      {children}
    </a>
  );
}

function LookbookCard({
  share,
  index,
  onOpen,
}: {
  share: Share;
  index: number;
  onOpen: (shareId: string) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const lift = useSpring(0, spring);
  const childCount = countShareNodes(share.children ?? []);
  const date = getShareDate(share.date);

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      shouldReduceMotion ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    rotateX.set(y * -7);
    rotateY.set(x * 9);
    lift.set(-10);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
  };

  return (
    <motion.article
      className="lookbook-card"
      style={{ "--stack-index": index } as CSSProperties}
      initial={{ opacity: 0, y: 34, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: 26, transition: { duration: 0.18 } }}
      transition={{ ...spring, delay: index * 0.065 }}
    >
      <button
        type="button"
        className="lookbook-card-face"
        onClick={() => onOpen(share.id)}
        aria-label={`打开合集：${share.title}，共 ${childCount} 条分享`}
      >
        <motion.span
          className="lookbook-card-inner"
          style={{ rotateX, rotateY, y: lift }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <span className="lookbook-art">
            <img src={share.cover} alt={share.coverAlt} />
            <span className="lookbook-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="lookbook-arrow" aria-hidden="true">
              ↗
            </span>
          </span>
          <span className="lookbook-copy">
            <span className="lookbook-meta">
              <span>{share.category}</span>
              <time dateTime={share.date}>{date.short}</time>
            </span>
            <strong className="lookbook-title">{share.title}</strong>
            <span className="lookbook-source">
              {childCount} nested notes · {share.source}
            </span>
          </span>
        </motion.span>
      </button>
    </motion.article>
  );
}

function Lookbook({
  shares,
  onOpen,
}: {
  shares: Share[];
  onOpen: (shareId: string) => void;
}) {
  const totalShares = countShareNodes(shares);

  return (
    <motion.section
      className="lookbook"
      aria-label="分享 Lookbook"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.38 }}
    >
      <div className="lookbook-caption">
        <span>Selected collections</span>
        <span>
          {String(shares.length).padStart(2, "0")} collections /{" "}
          {String(totalShares).padStart(2, "0")} notes
        </span>
      </div>
      <div className="lookbook-cards">
        {shares.map((share, index) => (
          <LookbookCard
            key={share.id}
            share={share}
            index={index}
            onOpen={onOpen}
          />
        ))}
      </div>
      <span className="lookbook-hint">
        Select a collection to open its archive
      </span>
    </motion.section>
  );
}

function ArchiveIndexBranch({
  nodes,
  activeShare,
  parentPath = "",
  depth = 0,
}: {
  nodes: Share[];
  activeShare: string;
  parentPath?: string;
  depth?: number;
}) {
  return (
    <div className={depth === 0 ? "archive-index-groups" : "archive-index-nest"}>
      {nodes.map((node, index) => {
        const path =
          depth === 0
            ? String(index + 1).padStart(2, "0")
            : `${parentPath}.${index + 1}`;

        return (
          <div className="archive-index-node" key={node.id}>
            <a
              className={activeShare === node.id ? "active" : undefined}
              href={`#share-${node.id}`}
              aria-current={activeShare === node.id ? "true" : undefined}
              style={{ "--index-depth": depth } as CSSProperties}
            >
              <span className="archive-index-sequence">{path}</span>
              <strong>{node.title}</strong>
              <time dateTime={node.date}>{getShareDate(node.date).value}</time>
            </a>
            {node.children?.length ? (
              <ArchiveIndexBranch
                nodes={node.children}
                activeShare={activeShare}
                parentPath={path}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ArchiveLeaf({
  share,
  path,
  depth,
}: {
  share: Share;
  path: string;
  depth: number;
}) {
  const date = getShareDate(share.date);

  return (
    <motion.article
      className="archive-leaf"
      id={`share-${share.id}`}
      data-share-id={share.id}
      style={{ "--branch-depth": depth } as CSSProperties}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={spring}
    >
      <ShareLink share={share} className="archive-leaf-link">
        <span className="archive-branch-marker" aria-hidden="true">
          <i></i>
        </span>
        <span className="archive-leaf-sequence">{path}</span>
        <span className="archive-leaf-copy">
          <span className="archive-leaf-meta">
            {share.category} · {share.source}
          </span>
          <strong>{share.title}</strong>
          <span className="archive-leaf-description">
            {share.description}
          </span>
        </span>
        <time className="archive-leaf-date" dateTime={share.date}>
          {date.value}
        </time>
        <span className="archive-leaf-arrow" aria-hidden="true">
          ↗
        </span>
      </ShareLink>
    </motion.article>
  );
}

function ArchiveNode({
  share,
  path,
  depth,
}: {
  share: Share;
  path: string;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const nodeCount = countShareNodes(share.children ?? []);
  const date = getShareDate(share.date);

  if (!share.children?.length) {
    return <ArchiveLeaf share={share} path={path} depth={depth} />;
  }

  return (
    <article
      className={depth === 0 ? "archive-group" : "archive-group nested"}
      id={`share-${share.id}`}
      data-share-id={share.id}
      style={{ "--branch-depth": depth } as CSSProperties}
    >
      <button
        type="button"
        className="archive-group-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="archive-branch-marker" aria-hidden="true">
          <i></i>
        </span>
        <span className="archive-sequence">{path}</span>
        <span className="archive-thumb">
          <img src={share.cover} alt="" />
        </span>
        <span className="archive-group-copy">
          <span className="archive-meta">
            {share.category} · {nodeCount} nested notes
          </span>
          <strong>{share.title}</strong>
          <span className="archive-description">{share.description}</span>
        </span>
        <time className="archive-group-date" dateTime={share.date}>
          {date.value}
        </time>
        <span className="archive-expand" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            className="archive-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="archive-children-inner">
              {share.children.map((child, index) => (
                <ArchiveNode
                  key={child.id}
                  share={child}
                  path={`${path}.${index + 1}`}
                  depth={depth + 1}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}

function Archive({
  shares,
  yearLabel,
  pendingShare,
  onTargetReached,
}: {
  shares: Share[];
  yearLabel: string;
  pendingShare: string | null;
  onTargetReached: () => void;
}) {
  const [activeShare, setActiveShare] = useState(shares[0]?.id ?? "");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rows = Array.from(
      list.querySelectorAll<HTMLElement>("[data-share-id]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setActiveShare(visible.target.getAttribute("data-share-id") ?? "");
        }
      },
      { rootMargin: "-16% 0px -62% 0px", threshold: [0.08, 0.28, 0.55] },
    );

    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pendingShare) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById(`share-${pendingShare}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      onTargetReached();
    }, 430);

    return () => window.clearTimeout(timer);
  }, [pendingShare, onTargetReached]);

  return (
    <motion.section
      className="archive"
      aria-label="分享归档"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.32 }}
    >
      <aside className="archive-index" aria-label="分享索引">
        <span className="archive-index-label">Index / {yearLabel}</span>
        <nav>
          <ArchiveIndexBranch nodes={shares} activeShare={activeShare} />
        </nav>
      </aside>

      <div className="archive-list" ref={listRef}>
        <div className="archive-list-head">
          <span>Collections / nested entries</span>
          <span>Newest first</span>
        </div>
        {shares.map((share, index) => (
          <ArchiveNode
            key={share.id}
            share={share}
            path={String(index + 1).padStart(2, "0")}
            depth={0}
          />
        ))}
      </div>
    </motion.section>
  );
}

export default function ShareGallery({ shares }: ShareGalleryProps) {
  const [mode, setMode] = useState<GalleryMode>("lookbook");
  const [pendingShare, setPendingShare] = useState<string | null>(null);
  const totalShares = countShareNodes(shares);
  const yearLabel = getShareYears(shares).join(" / ");

  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMode("archive");
    }
  }, []);

  const openCollection = (shareId: string) => {
    setPendingShare(shareId);
    setMode("archive");
  };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="share-gallery">
          <div className="gallery-toolbar">
            <p>
              <span>Personal collection</span>
              <span>
                {shares.length} collections / {totalShares} entries
              </span>
            </p>
            <div
              className="gallery-mode-switch"
              role="group"
              aria-label="切换分享展示方式"
            >
              <button
                type="button"
                aria-pressed={mode === "lookbook"}
                className={mode === "lookbook" ? "active" : undefined}
                onClick={() => setMode("lookbook")}
              >
                {mode === "lookbook" && (
                  <motion.span
                    className="gallery-mode-background"
                    layoutId="gallery-mode-background"
                    transition={spring}
                  />
                )}
                <span>Lookbook</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "archive"}
                className={mode === "archive" ? "active" : undefined}
                onClick={() => setMode("archive")}
              >
                {mode === "archive" && (
                  <motion.span
                    className="gallery-mode-background"
                    layoutId="gallery-mode-background"
                    transition={spring}
                  />
                )}
                <span>Archive</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "lookbook" ? (
              <Lookbook
                key="lookbook"
                shares={shares}
                onOpen={openCollection}
              />
            ) : (
              <Archive
                key="archive"
                shares={shares}
                yearLabel={yearLabel}
                pendingShare={pendingShare}
                onTargetReached={() => setPendingShare(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
