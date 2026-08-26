"use client";

/**
 * Decorative hero background — layered mountains, a dotted travel route,
 * sun/cloud drift, and a small plane, in the same flat-gradient
 * illustration style as the destination placeholders in
 * public/placeholders/*.svg (rather than a stock photo, which would sit
 * oddly next to that established illustration language and can't be
 * theme-matched or animated as cleanly). Purely decorative: aria-hidden,
 * absolutely positioned behind the hero content, never intercepts clicks.
 *
 * Layers drift at slightly different speeds/directions (pure CSS
 * animation, no JS) for a subtle parallax feel without any scroll-jank
 * risk. Respects prefers-reduced-motion via the animate-none fallback
 * class applied per-layer.
 */
export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(93% 0.035 255)" />
            <stop offset="55%" stopColor="oklch(96% 0.025 245)" />
            <stop offset="100%" stopColor="oklch(98% 0.006 255)" />
          </linearGradient>
          <linearGradient id="hero-mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(82% 0.05 255)" />
            <stop offset="100%" stopColor="oklch(87% 0.04 250)" />
          </linearGradient>
          <linearGradient id="hero-mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(70% 0.08 255)" />
            <stop offset="100%" stopColor="oklch(76% 0.06 248)" />
          </linearGradient>
          <linearGradient id="hero-mtn-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(56% 0.1 255)" />
            <stop offset="100%" stopColor="oklch(62% 0.09 250)" />
          </linearGradient>
        </defs>

        <rect width="1440" height="560" fill="url(#hero-sky)" />

        {/* Sun — slow pulse/glow, tucked in the top-right corner well clear
            of the text column */}
        <circle cx="1300" cy="70" r="40" fill="oklch(90% 0.09 70)" opacity="0.5" className="hero-anim-pulse" />
        <circle cx="1300" cy="70" r="26" fill="oklch(93% 0.1 70)" opacity="0.75" />

        {/* Clouds — horizontal drift, different speeds per layer, kept high
            and to the right so they never cross the headline column */}
        <g className="hero-anim-drift-slow" opacity="0.45">
          <ellipse cx="980" cy="70" rx="56" ry="17" fill="white" />
          <ellipse cx="1020" cy="60" rx="36" ry="13" fill="white" />
        </g>
        <g className="hero-anim-drift-slower" opacity="0.35">
          <ellipse cx="1160" cy="140" rx="48" ry="15" fill="white" />
        </g>

        {/* Small plane, banking gently along a fixed path across the sky */}
        <g className="hero-anim-plane" opacity="0.45">
          <path
            d="M0 -4.5 L11 0 L0 4.5 L2.5 0.5 L-11 2.5 L-11 -2.5 L2.5 -0.5 Z"
            fill="oklch(40% 0.14 255)"
          />
        </g>

        {/* Far mountain ridge — kept low and pale so it reads as distant
            atmosphere behind the headline, never competing with the text */}
        <path
          d="M0 480 L160 420 L320 465 L500 405 L680 460 L860 415 L1040 460 L1220 410 L1440 455 L1440 560 L0 560 Z"
          fill="url(#hero-mtn-far)"
          opacity="0.4"
        />

        {/* Mid ridge, with soft snow caps */}
        <path
          d="M0 520 L180 470 L360 515 L560 460 L760 510 L960 465 L1160 510 L1440 470 L1440 560 L0 560 Z"
          fill="url(#hero-mtn-mid)"
          opacity="0.5"
        />
        <path d="M360 515 L390 483 L410 505 L430 483 L465 518 Z" fill="white" opacity="0.6" />
        <path d="M1160 510 L1190 478 L1210 500 L1230 478 L1265 513 Z" fill="white" opacity="0.6" />

        {/* Near ridge — anchors the very bottom of the section only */}
        <path
          d="M0 545 L220 508 L440 540 L680 505 L920 542 L1160 508 L1440 540 L1440 560 L0 560 Z"
          fill="url(#hero-mtn-near)"
          opacity="0.55"
        />

        {/* A dotted "route" winding across the foreground — the product's
            own metaphor (finding people already planning a route) rather
            than a literal road. Gentle dash-offset creep suggests motion. */}
        <path
          d="M-40 540 C 220 500, 340 555, 520 500 S 820 460, 980 505 S 1260 545, 1500 495"
          fill="none"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 14"
          className="hero-anim-route"
        />
      </svg>

      {/* Soft fade to the surface color at the bottom so page content below
          the hero never fights the illustration for contrast. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-alt to-transparent" />

      <style>{`
        @keyframes hero-pulse { 0%, 100% { opacity: 0.45; r: 44px; } 50% { opacity: 0.65; r: 50px; } }
        @keyframes hero-drift-slow { 0% { transform: translateX(-14px); } 50% { transform: translateX(14px); } 100% { transform: translateX(-14px); } }
        @keyframes hero-drift-slower { 0% { transform: translateX(10px); } 50% { transform: translateX(-16px); } 100% { transform: translateX(10px); } }
        @keyframes hero-plane {
          0% { offset-distance: 0%; opacity: 0; }
          8% { opacity: 0.5; }
          92% { opacity: 0.5; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes hero-route-dash { to { stroke-dashoffset: -160; } }

        .hero-anim-pulse { animation: hero-pulse 5s ease-in-out infinite; transform-origin: 1220px 90px; }
        .hero-anim-drift-slow { animation: hero-drift-slow 14s ease-in-out infinite; }
        .hero-anim-drift-slower { animation: hero-drift-slower 19s ease-in-out infinite; }
        .hero-anim-route { animation: hero-route-dash 6s linear infinite; }
        .hero-anim-plane {
          offset-path: path('M700 40 C 860 20, 1000 90, 1120 60 S 1380 20, 1520 70');
          offset-rotate: auto;
          animation: hero-plane 22s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-anim-pulse, .hero-anim-drift-slow, .hero-anim-drift-slower, .hero-anim-route, .hero-anim-plane {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
