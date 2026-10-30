import { useReducedMotion, type Transition } from "motion/react";
import * as motion from "motion/react-client";
import "./MotionPath.css";

const path =
  "M 239 17 C 142 17 48.5 103 48.5 213.5 C 48.5 324 126 408 244 408 C 362 408 412 319 412 213.5 C 412 108 334 68.5 244 68.5 C 154 68.5 102.68 135.079 99 213.5 C 95.32 291.921 157 350 231 345.5 C 305 341 357.5 290 357.5 219.5 C 357.5 149 314 121 244 121 C 174 121 151.5 167 151.5 213.5 C 151.5 260 176 286.5 224.5 286.5 C 273 286.5 296.5 253 296.5 218.5 C 296.5 184 270 177 244 177 C 218 177 197 198 197 218.5 C 197 239 206 250.5 225.5 250.5 C 245 250.5 253 242 253 218.5";

const pathTransition: Transition = {
  duration: 10,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};

const satellites = [
  { kind: "star", size: 30, duration: 34, begin: -0.5 },
  { kind: "warm", size: 26, duration: 36, begin: -4.5 },
  { kind: "star", size: 24, duration: 32, begin: -7.8 },
  { kind: "ring", size: 28, duration: 38, begin: -11.8 },
  { kind: "star", size: 28, duration: 33, begin: -15.8 },
  { kind: "blue", size: 24, duration: 37, begin: -19.8 },
  { kind: "star", size: 24, duration: 31, begin: -23 },
  { kind: "star", size: 26, duration: 39.5, begin: -27.8 },
] as const;

export default function MotionPath() {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { ...pathTransition, duration: 0, repeat: 0 }
    : pathTransition;

  return (
    <div className="motion-path-visual" aria-hidden="true">
      <svg viewBox="0 0 451 437" role="presentation">
        <defs>
          <linearGradient
            id="spiral-stroke"
            x1="48"
            y1="26"
            x2="404"
            y2="390"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4d8dff" />
            <stop offset="0.32" stopColor="#8c6cff" />
            <stop offset="0.58" stopColor="#ed68a8" />
            <stop offset="0.8" stopColor="#ff8b55" />
            <stop offset="1" stopColor="#ffd75c" />
          </linearGradient>
          <linearGradient
            id="mini-star-paint"
            x1="4"
            y1="2.5"
            x2="20"
            y2="21.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4d8dff" />
            <stop offset="0.3" stopColor="#8c6cff" />
            <stop offset="0.56" stopColor="#ed68a8" />
            <stop offset="0.78" stopColor="#ff8b55" />
            <stop offset="1" stopColor="#ffd75c" />
          </linearGradient>
          <radialGradient id="planet-warm" cx="0.32" cy="0.28" r="0.78">
            <stop stopColor="#fff4c7" />
            <stop offset="0.3" stopColor="#ffba63" />
            <stop offset="1" stopColor="#f06c76" />
          </radialGradient>
          <radialGradient id="planet-blue" cx="0.32" cy="0.28" r="0.78">
            <stop stopColor="#e5fbff" />
            <stop offset="0.34" stopColor="#69b9e8" />
            <stop offset="1" stopColor="#4d68ce" />
          </radialGradient>
          <radialGradient id="planet-ring" cx="0.32" cy="0.28" r="0.78">
            <stop stopColor="#f6e9ff" />
            <stop offset="0.4" stopColor="#b983dc" />
            <stop offset="1" stopColor="#6f56bd" />
          </radialGradient>

          <symbol id="spiral-star" viewBox="0 0 24 24">
            <path
              d="M12 2.15C12.9 8.7 15.3 11.1 21.85 12C15.3 12.9 12.9 15.3 12 21.85C11.1 15.3 8.7 12.9 2.15 12C8.7 11.1 11.1 8.7 12 2.15Z"
              fill="url(#mini-star-paint)"
            />
            <path
              d="M12 6.2C12.5 10.2 13.8 11.5 17.8 12C13.8 12.5 12.5 13.8 12 17.8C11.5 13.8 10.2 12.5 6.2 12C10.2 11.5 11.5 10.2 12 6.2Z"
              fill="url(#mini-star-paint)"
              opacity="0.4"
            />
          </symbol>
          <symbol id="spiral-planet-warm" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="url(#planet-warm)" />
          </symbol>
          <symbol id="spiral-planet-blue" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="url(#planet-blue)" />
          </symbol>
          <symbol id="spiral-planet-ring" viewBox="0 0 24 24">
            <ellipse
              cx="12"
              cy="12"
              rx="10.5"
              ry="4"
              fill="none"
              stroke="#8068be"
              strokeWidth="1.3"
              transform="rotate(-18 12 12)"
            />
            <circle cx="12" cy="12" r="7" fill="url(#planet-ring)" />
          </symbol>
        </defs>

        <motion.path
          id="spiral-motion-track"
          d={path}
          fill="transparent"
          stroke="url(#spiral-stroke)"
          strokeWidth="3.4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.58 }}
          animate={{ pathLength: 1, opacity: 0.58 }}
          transition={transition}
        />

        <g className="spiral-anchor" transform="translate(230 218)">
          <use
            href="#spiral-star"
            x="-39"
            y="-39"
            width="78"
            height="78"
          />
        </g>

        {satellites.map((satellite, index) => {
          const symbol =
            satellite.kind === "star"
              ? "#spiral-star"
              : satellite.kind === "warm"
                ? "#spiral-planet-warm"
                : satellite.kind === "blue"
                  ? "#spiral-planet-blue"
                  : "#spiral-planet-ring";
          const half = satellite.size / 2;

          return (
            <g
              className="spiral-satellite"
              data-satellite={satellite.kind}
              key={`${satellite.kind}-${index}`}
            >
              <use
                href={symbol}
                x={-half}
                y={-half}
                width={satellite.size}
                height={satellite.size}
              />
              <animateMotion
                dur={`${satellite.duration}s`}
                begin={`${satellite.begin}s`}
                repeatCount={shouldReduceMotion ? "0" : "indefinite"}
                rotate="0"
                keyPoints="0;1;0"
                keyTimes="0;0.5;1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
              >
                <mpath href="#spiral-motion-track" />
              </animateMotion>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
