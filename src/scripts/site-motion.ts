import { animate, inView, stagger } from "motion";

const ease = [0.22, 1, 0.36, 1] as const;
const revealed = new WeakSet<Element>();
let revealStops: Array<() => void> = [];
let playbackControls: Array<{ stop: () => void }> = [];

const clearPageEffects = () => {
  revealStops.forEach((stop) => stop());
  playbackControls.forEach((controls) => controls.stop());
  revealStops = [];
  playbackControls = [];
};

const setupMotion = () => {
  clearPageEffects();
  document.documentElement.classList.add("motion-enabled");
  document.documentElement.dataset.motionReady = "true";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.remove("motion-enabled");
    return;
  }

  const enterElements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-enter]"),
  );

  if (enterElements.length > 0) {
    playbackControls.push(
      animate(
        enterElements,
        {
          opacity: [0, 1],
          transform: ["translateY(22px)", "translateY(0px)"],
        },
        {
          duration: 0.72,
          delay: stagger(0.075),
          ease,
        },
      ),
    );
  }

  document.querySelectorAll<HTMLElement>("[data-spin]").forEach((element) => {
    playbackControls.push(
      animate(
        element,
        {
          opacity: [0, 1],
          rotate: [-35, 0],
          scale: [0.72, 1],
        },
        {
          duration: 0.9,
          delay: 0.2,
          ease,
        },
      ),
    );
  });

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
    const stop = inView(
      element,
      (visibleElement) => {
        if (revealed.has(visibleElement)) return;
        revealed.add(visibleElement);

        playbackControls.push(
          animate(
            visibleElement,
            {
              opacity: [0, 1],
              transform: ["translateY(18px)", "translateY(0px)"],
            },
            {
              duration: 0.62,
              ease,
            },
          ),
        );
      },
      { amount: 0.18 },
    );

    revealStops.push(stop);
  });

  requestAnimationFrame(() => {
    document.documentElement.classList.remove("motion-pending");
  });
};

document.addEventListener("astro:before-swap", clearPageEffects);
document.addEventListener("astro:after-swap", () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});
document.addEventListener("astro:page-load", setupMotion);
