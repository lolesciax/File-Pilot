import { useLayoutEffect, useRef } from "react";

export function useHomeMotion(enabled: boolean, contentKey: string) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = root.current;
    if (
      !enabled ||
      !container ||
      typeof matchMedia !== "function" ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const running = new Map<HTMLElement, Animation>();
    const elements = [
      ...container.querySelectorAll<HTMLElement>("[data-home-reveal]"),
    ];
    let observer: IntersectionObserver | undefined;
    function finish(element: HTMLElement) {
      element.dataset.homeRevealed = "true";
      running.get(element)?.cancel();
      running.delete(element);
      observer?.unobserve(element);
    }
    function reveal(element: HTMLElement) {
      if (element.dataset.homeRevealed === "true") return;
      element.dataset.homeRevealed = "true";
      if (preference.matches || typeof element.animate !== "function") {
        finish(element);
        return;
      }
      const distance = Number(element.dataset.homeDistance ?? 16);
      const fade = element.hasAttribute("data-home-fade");
      const animation = element.animate(
        [
          { ...(fade ? { opacity: 0 } : {}), translate: `0 ${distance}px` },
          { ...(fade ? { opacity: 1 } : {}), translate: "0 0" },
        ],
        {
          duration: Number(element.dataset.homeDuration ?? 520),
          delay: Number(element.dataset.homeDelay ?? 0),
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
      running.set(element, animation);
      void animation.finished.then(
        () => finish(element),
        () => running.delete(element),
      );
    }
    function reduceMotion() {
      if (!preference.matches) return;
      observer?.disconnect();
      elements.forEach(finish);
    }
    function focus(event: FocusEvent) {
      const element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-home-reveal]")
          : null;
      if (element) finish(element);
    }
    function visibility() {
      if (document.hidden) [...running.keys()].forEach(finish);
    }
    if (!preference.matches) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) reveal(element);
            else if (running.has(element)) finish(element);
          }
        },
        { threshold: 0.08 },
      );
      elements
        .filter((element) => element.dataset.homeRevealed !== "true")
        .forEach((element) => observer!.observe(element));
    } else elements.forEach(finish);
    preference.addEventListener("change", reduceMotion);
    container.addEventListener("focusin", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer?.disconnect();
      running.forEach((animation) => animation.cancel());
      running.clear();
      preference.removeEventListener("change", reduceMotion);
      container.removeEventListener("focusin", focus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, contentKey]);
  return root;
}
