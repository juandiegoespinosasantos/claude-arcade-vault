"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  className?: string;
  children: ReactNode;
}

// <section> that fades/slides in when it scrolls into view (.reveal -> .reveal.in).
// The class is toggled on the DOM node (no React state): it is a pure visual effect.
// Shows immediately when IntersectionObserver is unavailable or the user prefers
// reduced motion (a CSS media query in globals.css also covers the latter).
export function Reveal({ className = "", children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={`${className} reveal`.trim()}>
      {children}
    </section>
  );
}
