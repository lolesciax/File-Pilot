import { useLayoutEffect, useRef, useState } from "react";

export function useElementSize<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    function measure() {
      const bounds = element!.getBoundingClientRect();
      setSize((current) =>
        current.width === bounds.width && current.height === bounds.height
          ? current
          : { width: bounds.width, height: bounds.height },
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);
  return [ref, size] as const;
}
export function useViewportHeight() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? innerHeight,
  );
  useLayoutEffect(() => {
    const resize = () =>
      setHeight(window.visualViewport?.height ?? innerHeight);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  return height;
}
