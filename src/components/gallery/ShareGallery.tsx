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
import type { Share } from "../../lib/shares";
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
      href={share.href}
      target={share.external ? "_blank" : undefined}
      rel={share.external ? "noreferrer" : undefined}
      aria-label={`${share.title}，来自 ${share.source}`}
    >
      {children}
    </a>
  );
}

function LookbookCard({
  share,
  index,
}: {
  share: Share;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const lift = useSpring(0, spring);

  const handlePointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
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
      <ShareLink share={share} className="lookbook-card-face">
        <motion.div
          className="lookbook-card-inner"
          style={{ rotateX, rotateY, y: lift }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <div className="lookbook-art">
            <img src={share.cover} alt={share.coverAlt} />
            <span className="lookbook-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="lookbook-arrow" aria-hidden="true">
              ↗
            </span>
          </div>
          <div className="lookbook-copy">
            <p>
              <span>{share.category}</span>
              <span>{share.displayDate}</span>
            </p>
            <h2>{share.title}</h2>
            <span className="lookbook-source">{share.source}</span>
          </div>
        </motion.div>
      </ShareLink>
    </motion.article>
  );
}

function Lookbook({ shares }: { shares: Share[] }) {
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
        <span>Selected visual notes</span>
        <span>{String(shares.length).padStart(2, "0")} entries</span>
      </div>
      <div className="lookbook-cards">
        {shares.map((share, index) => (
          <LookbookCard key={share.id} share={share} index={index} />
        ))}
      </div>
      <span className="lookbook-hint">Move across the collection</span>
    </motion.section>
  );
}

function ArchiveItem({
  share,
  index,
}: {
  share: Share;
  index: number;
}) {
  return (
    <motion.article
      className="archive-row"
      id={`share-${share.id}`}
      data-share-id={share.id}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...spring, delay: Math.min(index * 0.035, 0.18) }}
    >
      <ShareLink share={share} className="archive-row-link">
        <span className="archive-sequence">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="archive-thumb">
          <img src={share.cover} alt="" />
        </span>
        <span className="archive-content">
          <span className="archive-meta">
            {share.category} · {share.displayDate} · {share.year}
          </span>
          <strong>{share.title}</strong>
          <span className="archive-description">{share.description}</span>
        </span>
        <span className="archive-source">
          {share.source}
          <i aria-hidden="true">↗</i>
        </span>
      </ShareLink>
    </motion.article>
  );
}

function Archive({ shares }: { shares: Share[] }) {
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
      { rootMargin: "-18% 0px -58% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

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
        <span className="archive-index-label">Index / 2026</span>
        <nav>
          {shares.map((share, index) => (
            <a
              key={share.id}
              className={activeShare === share.id ? "active" : undefined}
              href={`#share-${share.id}`}
              aria-current={activeShare === share.id ? "true" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{share.title}</strong>
            </a>
          ))}
        </nav>
      </aside>

      <div className="archive-list" ref={listRef}>
        <div className="archive-list-head">
          <span>Archive</span>
          <span>Newest first</span>
        </div>
        {shares.map((share, index) => (
          <ArchiveItem key={share.id} share={share} index={index} />
        ))}
      </div>
    </motion.section>
  );
}

export default function ShareGallery({ shares }: ShareGalleryProps) {
  const [mode, setMode] = useState<GalleryMode>("lookbook");

  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMode("archive");
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="share-gallery">
          <div className="gallery-toolbar">
            <p>
              <span>Personal collection</span>
              <span>Five things worth keeping</span>
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
              <Lookbook key="lookbook" shares={shares} />
            ) : (
              <Archive key="archive" shares={shares} />
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
