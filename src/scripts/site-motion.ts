import { animate, inView, scroll, stagger } from "motion";

const ease = [0.22, 1, 0.36, 1] as const;
const revealed = new WeakSet<Element>();
let revealStops: Array<() => void> = [];
let scrollStops: Array<() => void> = [];
let interactionStops: Array<() => void> = [];
let playbackControls: Array<{ stop: () => void }> = [];
let typewriterTimers: number[] = [];

const clearPageEffects = () => {
  revealStops.forEach((stop) => stop());
  scrollStops.forEach((stop) => stop());
  interactionStops.forEach((stop) => stop());
  playbackControls.forEach((controls) => controls.stop());
  typewriterTimers.forEach((timer) => window.clearTimeout(timer));
  revealStops = [];
  scrollStops = [];
  interactionStops = [];
  playbackControls = [];
  typewriterTimers = [];
};

const splitText = (element: HTMLElement) => {
  if (element.dataset.splitReady === "true") return [];

  const text = element.textContent?.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const fragment = document.createDocumentFragment();
  const characters: HTMLElement[] = [];

  element.setAttribute("aria-label", text);
  element.textContent = "";

  Array.from(text).forEach((character) => {
    const span = document.createElement("span");
    span.className = "motion-char";
    span.setAttribute("aria-hidden", "true");
    span.textContent = character === " " ? "\u00a0" : character;
    fragment.append(span);
    characters.push(span);
  });

  element.append(fragment);
  element.dataset.splitReady = "true";
  return characters;
};

const scheduleTypewriter = (callback: () => void, delay: number) => {
  const timer = window.setTimeout(callback, delay);
  typewriterTimers.push(timer);
};

const getTypewriterDelay = (text: string, index: number) => {
  const character = text[index] ?? "";
  const previousCharacter = text[index - 1] ?? "";
  const isCjk = /[\u3400-\u9fff\u3040-\u30ff]/u.test(character);
  const isLatin = /[a-z0-9]/i.test(character);
  const previousLatinRun =
    text.slice(0, index).match(/[a-z0-9]+$/i)?.[0].length ?? 0;

  let delay = isCjk ? 48 : isLatin ? 34 : 42;

  if (isLatin && previousLatinRun > 0) {
    delay *= Math.max(0.62, 1 - Math.min(previousLatinRun, 8) * 0.045);
  }

  if (isLatin && !/[a-z0-9]/i.test(previousCharacter)) delay += 24;
  if (/\s/u.test(character)) delay = 82;
  if (/[，、；：]/u.test(character)) delay += 120;
  if (/[。！？.!?]/u.test(character)) delay += 210;
  if (/[—…]/u.test(character)) delay += 150;
  if (/[×+]/u.test(character)) delay += 64;

  const rhythm = 0.86 + ((index * 47 + character.codePointAt(0)!) % 23) / 100;
  return Math.round(delay * rhythm);
};

const setupTypewriter = () => {
  document.querySelectorAll<HTMLElement>("[data-typewriter]").forEach((element) => {
    if (element.dataset.typewriterReady === "true") return;

    const text = element.textContent?.replace(/\s+/g, " ").trim();
    if (!text) return;

    const characters = Array.from(text);
    const fragment = document.createDocumentFragment();
    const characterElements: HTMLElement[] = [];

    element.setAttribute("aria-label", text);
    element.textContent = "";

    characters.forEach((character) => {
      const span = document.createElement("span");
      span.className = "typewriter-char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = character;
      fragment.append(span);
      characterElements.push(span);
    });

    const caret = document.createElement("span");
    caret.className = "typewriter-caret";
    caret.setAttribute("aria-hidden", "true");
    fragment.append(caret);
    element.append(fragment);
    element.dataset.typewriterReady = "true";
    element.classList.add("typewriter-ready");

    const positionCaret = (character?: HTMLElement) => {
      if (!character) return;
      const elementRect = element.getBoundingClientRect();
      const characterRect = character.getBoundingClientRect();
      caret.style.left = `${characterRect.right - elementRect.left}px`;
      caret.style.top = `${characterRect.top - elementRect.top + characterRect.height * 0.12}px`;
      caret.style.height = `${characterRect.height * 0.76}px`;
    };

    const startTyping = () => {
      if (element.dataset.typewriterStarted === "true") return;
      element.dataset.typewriterStarted = "true";

      const caretBlink = animate(
        caret,
        { opacity: [1, 1, 0, 0, 1] },
        { duration: 1.05, repeat: Infinity, ease: "linear" },
      );
      playbackControls.push(caretBlink);
      const firstCharacterRect = characterElements[0]?.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      if (firstCharacterRect) {
        caret.style.left = `${firstCharacterRect.left - elementRect.left}px`;
        caret.style.top = `${firstCharacterRect.top - elementRect.top + firstCharacterRect.height * 0.12}px`;
        caret.style.height = `${firstCharacterRect.height * 0.76}px`;
      }

      let elapsed = Number(element.dataset.typewriterDelay ?? 220);

      characterElements.forEach((characterElement, index) => {
        const delay = getTypewriterDelay(text, index);
        elapsed += delay;

        scheduleTypewriter(() => {
          positionCaret(characterElement);
          playbackControls.push(
            animate(
              characterElement,
              {
                opacity: [0, 1],
                transform: ["translateY(0.16em)", "translateY(0)"],
                filter: ["blur(1.6px)", "blur(0px)"],
              },
              { duration: 0.13, ease: "ease-out" },
            ),
          );
        }, elapsed);
      });

      scheduleTypewriter(() => {
        caretBlink.stop();
        playbackControls.push(
          animate(caret, { opacity: 0 }, { duration: 0.45, ease: "ease-out" }),
        );
      }, elapsed + 1500);
    };

    const stop = inView(element, startTyping, { amount: 0.2 });
    revealStops.push(stop);
  });
};

const setupReadingProgress = () => {
  const progress = document.querySelector<HTMLElement>(
    ".reading-progress span",
  );
  if (!progress) return;

  const controls = animate(
    progress,
    { scaleX: [0, 1] },
    { ease: "linear" },
  );
  playbackControls.push(controls);
  scrollStops.push(scroll(controls, { axis: "y" }));
};

const setupCoverMotion = () => {
  const cover = document.querySelector<HTMLElement>("[data-cover]");
  const image = cover?.querySelector<HTMLImageElement>("img");
  if (!cover || !image) return;

  playbackControls.push(
    animate(
      cover,
      {
        opacity: [0, 1],
        clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"],
      },
      {
        duration: 1.05,
        delay: 0.3,
        ease,
      },
    ),
  );

  scrollStops.push(
    scroll(
      (progress) => {
        image.style.transform = `translate3d(0, ${(progress - 0.5) * 20}px, 0) scale(1.08)`;
      },
      {
        target: cover,
        offset: ["start end", "end start"],
      },
    ),
  );
};

const setupSvgDrawing = () => {
  document.querySelectorAll<SVGPathElement>("[data-draw]").forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    playbackControls.push(
      animate(
        path,
        { strokeDashoffset: [length, 0] },
        {
          duration: 0.85,
          delay: 0.18,
          ease,
        },
      ),
    );
  });
};

const setupPointerEffects = () => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((element) => {
    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      animate(
        element,
        {
          rotateX: -((y / rect.height) - 0.5) * 3.2,
          rotateY: ((x / rect.width) - 0.5) * 3.2,
          transformPerspective: 800,
        },
        { duration: 0.22, ease: "ease-out" },
      );
    };

    const onPointerLeave = () => {
      animate(
        element,
        { rotateX: 0, rotateY: 0 },
        { duration: 0.45, ease },
      );
    };

    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);
    interactionStops.push(() => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
    });
  });

  document
    .querySelectorAll<HTMLElement>("[data-magnetic]")
    .forEach((element) => {
      const onPointerMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);

        animate(
          element,
          { x: x * 0.12, y: y * 0.12 },
          { duration: 0.22, ease: "ease-out" },
        );
      };

      const onPointerLeave = () => {
        animate(element, { x: 0, y: 0 }, { duration: 0.45, ease });
      };

      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerleave", onPointerLeave);
      interactionStops.push(() => {
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerleave", onPointerLeave);
      });
    });
};

const setupMotion = () => {
  clearPageEffects();
  document.documentElement.classList.add("motion-enabled");
  document.documentElement.dataset.motionReady = "true";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.remove("motion-enabled");
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-split]").forEach((element) => {
    const characters = splitText(element);
    if (characters.length === 0) return;

    element.style.opacity = "1";
    playbackControls.push(
      animate(
        characters,
        {
          opacity: [0, 1],
          transform: [
            "translateY(0.45em) rotate(2deg)",
            "translateY(0px) rotate(0deg)",
          ],
        },
        {
          duration: 0.62,
          delay: stagger(0.024),
          ease,
        },
      ),
    );
  });

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

  setupReadingProgress();
  setupCoverMotion();
  setupSvgDrawing();
  setupPointerEffects();
  setupTypewriter();

  requestAnimationFrame(() => {
    document.documentElement.classList.remove("motion-pending");
    window.dispatchEvent(new Event("scroll"));
  });
};

document.addEventListener("astro:before-swap", clearPageEffects);
document.addEventListener("astro:after-swap", () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});
document.addEventListener("astro:page-load", setupMotion);
