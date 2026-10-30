import { animate } from "motion";

let cleanup: (() => void) | undefined;

const setupLanding = () => {
	cleanup?.();
	cleanup = undefined;

	const shell = document.querySelector<HTMLElement>("[data-landing]");
	if (!shell || shell.dataset.motionReady === "true") return;
	shell.dataset.motionReady = "true";

	const scene = document.querySelector<HTMLElement>("[data-landing-scene]");
	const parallaxLayer = document.querySelector<HTMLElement>(
		"[data-orbit-parallax]",
	);
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	document
		.querySelectorAll<HTMLElement>("[data-landing-reveal]")
		.forEach((element, index) => {
			if (reducedMotion) {
				element.style.opacity = "1";
				element.style.transform = "none";
				return;
			}

			animate(
				element,
				{
					opacity: [0, 1],
					transform: ["translateY(18px)", "translateY(0)"],
				},
				{
					duration: 0.78,
					delay: 0.08 + index * 0.08,
					ease: [0.22, 1, 0.36, 1],
				},
			);
		});

	if (
		!scene ||
		!parallaxLayer ||
		reducedMotion ||
		!window.matchMedia("(hover: hover) and (pointer: fine)").matches
	) {
		return;
	}

	const controller = new AbortController();
	const { signal } = controller;
	let targetX = 0;
	let targetY = 0;
	let currentX = 0;
	let currentY = 0;
	let frame = 0;

	const renderParallax = () => {
		currentX += (targetX - currentX) * 0.1;
		currentY += (targetY - currentY) * 0.1;
		parallaxLayer.style.translate = `${currentX}px ${currentY}px`;

		if (
			Math.abs(targetX - currentX) > 0.05 ||
			Math.abs(targetY - currentY) > 0.05
		) {
			frame = requestAnimationFrame(renderParallax);
		} else {
			frame = 0;
		}
	};

	const startParallax = () => {
		if (frame) return;
		frame = requestAnimationFrame(renderParallax);
	};

	const onPointerMove = (event: PointerEvent) => {
		const rect = scene.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		targetX = (x - 0.5) * 12;
		targetY = (y - 0.5) * 10;
		startParallax();
	};

	const resetParallax = () => {
		targetX = 0;
		targetY = 0;
		startParallax();
	};

	const contract = () => scene.classList.add("is-contracted");
	const release = () => scene.classList.remove("is-contracted");

	scene.addEventListener("pointermove", onPointerMove, { signal });
	scene.addEventListener("pointerleave", resetParallax, { signal });
	scene.addEventListener("pointerdown", contract, { signal });
	window.addEventListener("pointerup", release, { signal });
	window.addEventListener("pointercancel", release, { signal });

	cleanup = () => {
		cancelAnimationFrame(frame);
		controller.abort();
		scene.classList.remove("is-contracted");
	};
};

document.addEventListener("astro:before-swap", () => {
	cleanup?.();
	cleanup = undefined;
});
document.addEventListener("astro:page-load", setupLanding);
setupLanding();
