/**
 * motion.js — the fleet's animation layer.
 *
 * WHY THIS FILE: the video that inspired this fleet uses "Framer Motion" — but that is a
 * React library and our stack is **static HTML/CSS/vanilla JS, no build step**. The vanilla
 * sibling of Framer Motion is **Motion** (https://motion.dev), the SAME engine, loadable
 * straight from a CDN with zero build. This file wraps it into a drop-in, declarative,
 * accessibility-safe layer so every site gets premium, Framer-Motion-quality motion by
 * adding a couple of `data-*` attributes — no per-site JS wiring required.
 *
 * HOW TO USE (per site):
 *   1. Copy this file to the site root (e.g. /js/motion.js) or reference it.
 *   2. Load Motion + this file before </body>:
 *        <script type="module">
 *          import { animate, inView, scroll, stagger } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";
 *          window.__motion = { animate, inView, scroll, stagger };
 *          import("./js/motion.js").then(m => m.initMotion());
 *        </script>
 *   3. Mark up elements declaratively:
 *        <h1 data-reveal>…</h1>                          fade + rise on scroll-in
 *        <div data-reveal="left" data-reveal-delay="0.1">…</div>
 *        <ul data-stagger>            <li>…</li> …        children reveal in sequence
 *        <img data-parallax="0.2" src=…>                 subtle scroll parallax
 *        <a class="btn" data-hover-lift>Call now</a>      springy hover (CSS-driven)
 *
 * ACCESSIBILITY: every animation is skipped (content shown immediately, no transforms)
 * when the user has `prefers-reduced-motion: reduce`. This is non-negotiable — see
 * playbooks/DESIGN.md and ANIMATION.md.
 *
 * Performance: Motion's animate() is ~2.3kb for HTML and runs GPU-accelerated (transform +
 * opacity only). Keep it to transform/opacity so we stay at 60–120fps and protect Lighthouse.
 */

const REDUCED = typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const REVEAL_OFFSETS = {
  up:    { y: 24,  x: 0  },
  down:  { y: -24, x: 0  },
  left:  { x: 32,  y: 0  },
  right: { x: -32, y: 0  },
  none:  { x: 0,   y: 0  },
};

export function initMotion() {
  const M = (typeof window !== "undefined" && window.__motion) || null;

  // If Motion failed to load (offline/CDN blocked) OR reduced-motion is on, reveal
  // everything immediately so content is never hidden. Progressive enhancement.
  if (!M || REDUCED) {
    document.querySelectorAll("[data-reveal], [data-stagger]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.querySelectorAll(":scope > *").forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
    });
    return;
  }

  const { animate, inView, scroll } = M;

  // --- Scroll reveals: fade + directional rise -----------------------------------------
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const dir = el.getAttribute("data-reveal") || "up";
    const off = REVEAL_OFFSETS[dir] || REVEAL_OFFSETS.up;
    const delay = parseFloat(el.getAttribute("data-reveal-delay") || "0");

    el.style.opacity = "0";
    el.style.transform = `translate(${off.x}px, ${off.y}px)`;

    inView(el, () => {
      animate(el, { opacity: 1, transform: "translate(0px, 0px)" },
        { duration: 0.6, delay, easing: [0.16, 1, 0.3, 1] });
    }, { amount: 0.2 });
  });

  // --- Staggered children (lists, card grids) ------------------------------------------
  document.querySelectorAll("[data-stagger]").forEach((parent) => {
    const children = Array.from(parent.children);
    const step = parseFloat(parent.getAttribute("data-stagger") || "0.08") || 0.08;
    children.forEach((c) => {
      c.style.opacity = "0";
      c.style.transform = "translateY(20px)";
    });
    inView(parent, () => {
      children.forEach((c, i) => {
        animate(c, { opacity: 1, transform: "translateY(0px)" },
          { duration: 0.55, delay: i * step, easing: [0.16, 1, 0.3, 1] });
      });
    }, { amount: 0.15 });
  });

  // --- Subtle scroll parallax (heroes, section images) ---------------------------------
  document.querySelectorAll("[data-parallax]").forEach((el) => {
    const intensity = parseFloat(el.getAttribute("data-parallax") || "0.2") || 0.2;
    scroll(
      (progress) => { el.style.transform = `translateY(${(progress - 0.5) * intensity * 120}px)`; },
      { target: el, offset: ["start end", "end start"] }
    );
  });
}

// Auto-init if Motion is already present on the window when this module loads.
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { if (window.__motion) initMotion(); });
  } else if (window.__motion) {
    initMotion();
  }
}
